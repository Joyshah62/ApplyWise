from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date
from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile
from xml.sax.saxutils import escape
from app.extensions import db
from app.models.application import Application
from app.models.status_history import StatusHistory


def _ai_calls_today(user_id):
    from app.models.ai_event import AiEvent
    today = date.today()
    return AiEvent.query.filter(
        AiEvent.user_id == user_id,
        db.func.date(AiEvent.created_at) == today
    ).count()


def _check_ai_limit(user_id):
    """Returns (allowed, used, limit). Call before any AI endpoint."""
    limit = current_app.config['DAILY_AI_LIMIT']
    used = _ai_calls_today(user_id)
    return used < limit, used, limit

applications_bp = Blueprint('applications', __name__, url_prefix='/api/applications')

@applications_bp.route('', methods=['POST'])
@jwt_required()
def create_application():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data.get('company_name') or not data.get('job_title') or not data.get('job_url'):
        return jsonify({'error': 'Missing required fields'}), 400

    new_app = Application(
        user_id=user_id,
        company_name=data.get('company_name'),
        job_title=data.get('job_title'),
        job_url=data.get('job_url'),
        portal=data.get('portal'),
        location=data.get('location'),
        status=data.get('status', 'Saved'),
        resume_version_id=data.get('resume_version_id'),
        job_description=data.get('job_description'),
        notes=data.get('notes')
    )
    
    if data.get('date_applied'):
        try:
            new_app.date_applied = datetime.strptime(data['date_applied'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'error': 'Invalid date format, use YYYY-MM-DD'}), 400

    if data.get('follow_up_date'):
        try:
            new_app.follow_up_date = datetime.strptime(data['follow_up_date'], '%Y-%m-%d').date()
        except ValueError:
            pass

    db.session.add(new_app)
    db.session.commit()
    
    # Add status history
    history = StatusHistory(application_id=new_app.id, new_status=new_app.status, note='Created')
    db.session.add(history)
    db.session.commit()

    return jsonify(new_app.to_dict()), 201

@applications_bp.route('', methods=['GET'])
@jwt_required()
def get_applications():
    user_id = get_jwt_identity()
    applications = Application.query.filter_by(user_id=user_id).order_by(Application.created_at.desc()).all()
    return jsonify([app.to_dict() for app in applications]), 200

@applications_bp.route('/<int:app_id>', methods=['GET'])
@jwt_required()
def get_application(app_id):
    user_id = get_jwt_identity()
    application = Application.query.filter_by(id=app_id, user_id=user_id).first()
    if not application:
        return jsonify({'error': 'Not found'}), 404
    return jsonify(application.to_dict()), 200

@applications_bp.route('/<int:app_id>', methods=['PUT'])
@jwt_required()
def update_application(app_id):
    user_id = get_jwt_identity()
    application = Application.query.filter_by(id=app_id, user_id=user_id).first()
    if not application:
        return jsonify({'error': 'Not found'}), 404
        
    data = request.get_json()
    
    # Check if status changed to add to history
    old_status = application.status
    if 'status' in data and data['status'] != old_status:
        history = StatusHistory(
            application_id=application.id, 
            old_status=old_status, 
            new_status=data['status']
        )
        db.session.add(history)
        application.status = data['status']

    updateable_fields = ['company_name', 'job_title', 'job_url', 'portal', 'location', 
                         'resume_version_id', 'job_description', 'notes']
    
    for field in updateable_fields:
        if field in data:
            setattr(application, field, data[field])

    if 'date_applied' in data and data['date_applied']:
        try:
            application.date_applied = datetime.strptime(data['date_applied'], '%Y-%m-%d').date()
        except ValueError:
            pass

    if 'follow_up_date' in data and data['follow_up_date']:
        try:
            application.follow_up_date = datetime.strptime(data['follow_up_date'], '%Y-%m-%d').date()
        except ValueError:
            pass
            
    db.session.commit()
    return jsonify(application.to_dict()), 200

@applications_bp.route('/<int:app_id>', methods=['DELETE'])
@jwt_required()
def delete_application(app_id):
    user_id = get_jwt_identity()
    application = Application.query.filter_by(id=app_id, user_id=user_id).first()
    if not application:
        return jsonify({'error': 'Not found'}), 404
        
    db.session.delete(application)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'}), 200

@applications_bp.route('/ai-usage', methods=['GET'])
@jwt_required()
def get_ai_usage():
    user_id = get_jwt_identity()
    limit = current_app.config['DAILY_AI_LIMIT']
    used = _ai_calls_today(user_id)
    return jsonify({'used': used, 'limit': limit, 'remaining': max(0, limit - used)}), 200


@applications_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze_application():
    from app.models.resume import ResumeVersion
    from app.services.llm_service import analyze_resume_fit

    user_id = get_jwt_identity()
    allowed, used, limit = _check_ai_limit(user_id)
    if not allowed:
        return jsonify({'error': f'Daily AI limit reached ({limit} calls/day). Resets at midnight.', 'used': used, 'limit': limit}), 429

    data = request.get_json()

    job_description = data.get('job_description')
    resume_id = data.get('resume_id')

    if not job_description or not resume_id:
        return jsonify({'error': 'job_description and resume_id are required'}), 400
        
    resume = ResumeVersion.query.filter_by(id=resume_id, user_id=user_id).first()
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
        
    if not resume.content:
        return jsonify({'error': 'Selected resume has no parsed text content. Please upload a PDF or paste text.'}), 400
        
    try:
        analysis_result = analyze_resume_fit(job_description, resume.content)
        from app.models.ai_event import AiEvent
        db.session.add(AiEvent(user_id=user_id, event_type='analyze'))
        db.session.commit()
        return jsonify(analysis_result), 200
    except Exception as e:
        print(f"Error during LLM analysis: {e}")
        return jsonify({'error': str(e)}), 500


@applications_bp.route('/cover-letter', methods=['POST'])
@jwt_required()
def generate_cover_letter():
    from app.models.resume import ResumeVersion
    from app.services.llm_service import generate_cover_letter as gen_cover_letter

    user_id = get_jwt_identity()
    allowed, used, limit = _check_ai_limit(user_id)
    if not allowed:
        return jsonify({'error': f'Daily AI limit reached ({limit} calls/day). Resets at midnight.', 'used': used, 'limit': limit}), 429

    data = request.get_json()

    job_description = data.get('job_description')
    resume_id = data.get('resume_id')
    company_name = data.get('company_name', '')
    job_title = data.get('job_title', '')

    if not job_description:
        return jsonify({'error': 'job_description is required'}), 400

    if not resume_id:
        return jsonify({'error': 'resume_id is required for cover letter generation'}), 400

    resume = ResumeVersion.query.filter_by(id=resume_id, user_id=user_id).first()
    if not resume or not resume.content:
        return jsonify({'error': 'Selected resume not found or has no content'}), 404

    try:
        cover_letter = gen_cover_letter(job_description, company_name, job_title, resume.content)
        from app.models.ai_event import AiEvent
        db.session.add(AiEvent(user_id=user_id, event_type='cover_letter'))
        db.session.commit()
        return jsonify({'cover_letter': cover_letter}), 200
    except Exception as e:
        print(f"Error generating cover letter: {e}")
        return jsonify({'error': str(e)}), 500


def _docx_paragraph(text):
    escaped_text = escape(text)
    return (
        '<w:p>'
        '<w:pPr><w:spacing w:after="240"/></w:pPr>'
        f'<w:r><w:t xml:space="preserve">{escaped_text}</w:t></w:r>'
        '</w:p>'
    )


def _build_cover_letter_docx(cover_letter):
    paragraphs = [
        paragraph.strip()
        for paragraph in cover_letter.replace('\r\n', '\n').split('\n\n')
        if paragraph.strip()
    ]
    body = ''.join(_docx_paragraph(paragraph) for paragraph in paragraphs)
    document_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    {body}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>'''

    buffer = BytesIO()
    with ZipFile(buffer, 'w', ZIP_DEFLATED) as docx:
        docx.writestr('[Content_Types].xml', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>''')
        docx.writestr('_rels/.rels', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>''')
        docx.writestr('word/document.xml', document_xml)

    buffer.seek(0)
    return buffer


@applications_bp.route('/cover-letter/docx', methods=['POST'])
@jwt_required()
def download_cover_letter_docx():
    data = request.get_json()
    cover_letter = data.get('cover_letter', '').strip()
    company_name = data.get('company_name', '').strip() or 'company'
    job_title = data.get('job_title', '').strip() or 'role'

    if not cover_letter:
        return jsonify({'error': 'cover_letter is required'}), 400

    filename_base = f"{company_name}_{job_title}_cover_letter".lower()
    filename = ''.join(char if char.isalnum() else '_' for char in filename_base)
    filename = '_'.join(part for part in filename.split('_') if part)[:80] + '.docx'

    return send_file(
        _build_cover_letter_docx(cover_letter),
        mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        as_attachment=True,
        download_name=filename
    )


@applications_bp.route('/refine-cover-letter', methods=['POST'])
@jwt_required()
def refine_cover_letter():
    from app.services.llm_service import refine_cover_letter as refine

    user_id = get_jwt_identity()
    allowed, used, limit = _check_ai_limit(user_id)
    if not allowed:
        return jsonify({'error': f'Daily AI limit reached ({limit} calls/day). Resets at midnight.', 'used': used, 'limit': limit}), 429

    data = request.get_json()
    current_letter = data.get('cover_letter', '')
    instruction = data.get('instruction', '')
    job_description = data.get('job_description', '')
    company_name = data.get('company_name', '')
    job_title = data.get('job_title', '')

    if not current_letter or not instruction:
        return jsonify({'error': 'cover_letter and instruction are required'}), 400

    try:
        refined = refine(current_letter, instruction, job_description, company_name, job_title)
        from app.models.ai_event import AiEvent
        db.session.add(AiEvent(user_id=user_id, event_type='refine'))
        db.session.commit()
        return jsonify({'cover_letter': refined}), 200
    except Exception as e:
        print(f"Error refining cover letter: {e}")
        return jsonify({'error': str(e)}), 500
