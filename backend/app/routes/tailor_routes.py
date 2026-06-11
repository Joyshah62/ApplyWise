import json
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from io import BytesIO
from app.utils.auth import get_current_user_id
from app.extensions import db
from app.models.application import Application
from app.models.resume import ResumeVersion
from app.models.tailored_resume import TailoredResume
from app.routes.application_routes import _check_ai_limit

tailor_bp = Blueprint('tailor', __name__, url_prefix='/api')


def _get_application(app_id, user_id):
    return Application.query.filter_by(id=app_id, user_id=user_id).first()


@tailor_bp.route('/applications/<int:app_id>/tailor', methods=['GET'])
@jwt_required()
def get_tailored_resume(app_id):
    user_id = get_current_user_id()
    if not _get_application(app_id, user_id):
        return jsonify({'error': 'Application not found'}), 404

    tailored = TailoredResume.query.filter_by(application_id=app_id, user_id=user_id).first()
    if not tailored:
        return jsonify({'error': 'No tailored resume yet'}), 404
    return jsonify(tailored.to_dict()), 200


@tailor_bp.route('/applications/<int:app_id>/tailor', methods=['POST'])
@jwt_required()
def generate_tailored_resume(app_id):
    """Generate (or regenerate) a tailored LaTeX resume for this application."""
    from app.services.llm_service import generate_tailored_resume as generate

    user_id = get_current_user_id()
    application = _get_application(app_id, user_id)
    if not application:
        return jsonify({'error': 'Application not found'}), 404

    allowed, used, limit = _check_ai_limit(user_id)
    if not allowed:
        return jsonify({'error': f'Daily AI limit reached ({limit} calls/day). Resets at midnight.', 'used': used, 'limit': limit}), 429

    data = request.get_json() or {}
    resume_id = data.get('resume_id')
    if not resume_id:
        return jsonify({'error': 'resume_id is required'}), 400

    resume = ResumeVersion.query.filter_by(id=resume_id, user_id=user_id).first()
    if not resume or not resume.content:
        return jsonify({'error': 'Selected resume not found or has no parsed text content'}), 404

    job_description = application.job_description or data.get('job_description', '')
    if not job_description.strip():
        return jsonify({'error': 'This application has no job description. Add one first.'}), 400

    try:
        latex = generate(
            job_description,
            application.company_name or '',
            application.job_title or '',
            resume.content,
        )
    except Exception as e:
        print(f"Error generating tailored resume: {e}")
        return jsonify({'error': str(e)}), 500

    intro = {
        'role': 'assistant',
        'content': "I've tailored your resume to this job description — reordered and reworded your bullet points to emphasize the most relevant experience and keywords. Take a look at the preview, and tell me what you'd like to change.",
    }

    tailored = TailoredResume.query.filter_by(application_id=app_id, user_id=user_id).first()
    if tailored:
        tailored.latex_content = latex
        tailored.resume_version_id = resume.id
        tailored.chat_history = json.dumps([intro])
    else:
        tailored = TailoredResume(
            user_id=user_id,
            application_id=app_id,
            resume_version_id=resume.id,
            latex_content=latex,
            chat_history=json.dumps([intro]),
        )
        db.session.add(tailored)

    from app.models.ai_event import AiEvent
    db.session.add(AiEvent(user_id=user_id, event_type='tailor'))
    db.session.commit()
    return jsonify(tailored.to_dict()), 200


@tailor_bp.route('/applications/<int:app_id>/tailor', methods=['PUT'])
@jwt_required()
def update_tailored_resume(app_id):
    """Save manual edits to the LaTeX source."""
    user_id = get_current_user_id()
    tailored = TailoredResume.query.filter_by(application_id=app_id, user_id=user_id).first()
    if not tailored:
        return jsonify({'error': 'No tailored resume yet'}), 404

    data = request.get_json() or {}
    latex = data.get('latex_content')
    if not latex or not latex.strip():
        return jsonify({'error': 'latex_content is required'}), 400

    tailored.latex_content = latex
    db.session.commit()
    return jsonify(tailored.to_dict()), 200


@tailor_bp.route('/applications/<int:app_id>/tailor/chat', methods=['POST'])
@jwt_required()
def chat_tailored_resume(app_id):
    """Send a chat message to the LLM to edit or discuss the tailored resume."""
    from app.services.llm_service import chat_edit_resume

    user_id = get_current_user_id()
    application = _get_application(app_id, user_id)
    if not application:
        return jsonify({'error': 'Application not found'}), 404

    tailored = TailoredResume.query.filter_by(application_id=app_id, user_id=user_id).first()
    if not tailored:
        return jsonify({'error': 'Generate a tailored resume first'}), 404

    allowed, used, limit = _check_ai_limit(user_id)
    if not allowed:
        return jsonify({'error': f'Daily AI limit reached ({limit} calls/day). Resets at midnight.', 'used': used, 'limit': limit}), 429

    data = request.get_json() or {}
    message = (data.get('message') or '').strip()
    if not message:
        return jsonify({'error': 'message is required'}), 400

    history = json.loads(tailored.chat_history) if tailored.chat_history else []

    try:
        reply, updated_latex = chat_edit_resume(
            tailored.latex_content,
            message,
            history,
            application.job_description or '',
        )
    except Exception as e:
        print(f"Error in tailor chat: {e}")
        return jsonify({'error': str(e)}), 500

    history.append({'role': 'user', 'content': message})
    history.append({'role': 'assistant', 'content': reply})
    tailored.chat_history = json.dumps(history)
    if updated_latex:
        tailored.latex_content = updated_latex

    from app.models.ai_event import AiEvent
    db.session.add(AiEvent(user_id=user_id, event_type='tailor_chat'))
    db.session.commit()

    return jsonify({
        'reply': reply,
        'latex_content': tailored.latex_content,
        'latex_changed': updated_latex is not None,
        'chat_history': history,
    }), 200


@tailor_bp.route('/tailor/compile', methods=['POST'])
@jwt_required()
def compile_tailored_resume():
    """Compile LaTeX source to PDF — used for both the live preview and download."""
    from app.services.latex_service import compile_latex, LatexCompileError

    data = request.get_json() or {}
    latex = data.get('latex_content')
    if not latex or not latex.strip():
        return jsonify({'error': 'latex_content is required'}), 400

    try:
        pdf_bytes = compile_latex(latex)
    except LatexCompileError as e:
        return jsonify({'error': str(e), 'log': e.log}), 422

    filename = (data.get('filename') or 'resume').strip() or 'resume'
    filename = ''.join(c if c.isalnum() or c in '-_' else '_' for c in filename)[:80] + '.pdf'

    return send_file(
        BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=False,
        download_name=filename,
    )
