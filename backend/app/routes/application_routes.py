from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app.extensions import db
from app.models.application import Application
from app.models.status_history import StatusHistory

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

@applications_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze_application():
    from app.models.resume import ResumeVersion
    from app.services.llm_service import analyze_resume_fit
    
    user_id = get_jwt_identity()
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
        return jsonify({'cover_letter': cover_letter}), 200
    except Exception as e:
        print(f"Error generating cover letter: {e}")
        return jsonify({'error': str(e)}), 500
