from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.resume import ResumeVersion

resumes_bp = Blueprint('resumes', __name__, url_prefix='/api/resumes')

import io
import PyPDF2

@resumes_bp.route('', methods=['POST'])
@jwt_required()
def create_resume():
    user_id = get_jwt_identity()
    
    # Support both JSON and multipart/form-data
    if request.is_json:
        data = request.get_json()
        name = data.get('name')
        file_url = data.get('file_url')
        target_role = data.get('target_role')
        content = data.get('content')
    else:
        name = request.form.get('name')
        file_url = request.form.get('file_url')
        target_role = request.form.get('target_role')
        content = request.form.get('content')
        
        # Handle file upload if present
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename.endswith('.pdf'):
                try:
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
                    extracted_text = ""
                    for page in pdf_reader.pages:
                        extracted_text += page.extract_text() + "\n"
                    content = extracted_text.strip()
                except Exception as e:
                    print(f"Error parsing PDF: {e}")
    
    if not name:
        return jsonify({'error': 'Name is required'}), 400

    new_resume = ResumeVersion(
        user_id=user_id,
        name=name,
        file_url=file_url,
        target_role=target_role,
        content=content
    )
    
    db.session.add(new_resume)
    db.session.commit()
    
    return jsonify(new_resume.to_dict()), 201

@resumes_bp.route('', methods=['GET'])
@jwt_required()
def get_resumes():
    user_id = get_jwt_identity()
    resumes = ResumeVersion.query.filter_by(user_id=user_id).order_by(ResumeVersion.created_at.desc()).all()
    return jsonify([resume.to_dict() for resume in resumes]), 200

@resumes_bp.route('/<int:resume_id>', methods=['PUT'])
@jwt_required()
def update_resume(resume_id):
    user_id = get_jwt_identity()
    resume = ResumeVersion.query.filter_by(id=resume_id, user_id=user_id).first()
    if not resume:
        return jsonify({'error': 'Not found'}), 404
        
    if request.is_json:
        data = request.get_json()
        if 'name' in data:
            resume.name = data['name']
        if 'file_url' in data:
            resume.file_url = data['file_url']
        if 'target_role' in data:
            resume.target_role = data['target_role']
        if 'content' in data:
            resume.content = data['content']
    else:
        if 'name' in request.form:
            resume.name = request.form['name']
        if 'file_url' in request.form:
            resume.file_url = request.form['file_url']
        if 'target_role' in request.form:
            resume.target_role = request.form['target_role']
        if 'content' in request.form:
            resume.content = request.form['content']
            
        if 'file' in request.files:
            file = request.files['file']
            if file and file.filename.endswith('.pdf'):
                try:
                    pdf_reader = PyPDF2.PdfReader(io.BytesIO(file.read()))
                    extracted_text = ""
                    for page in pdf_reader.pages:
                        extracted_text += page.extract_text() + "\n"
                    resume.content = extracted_text.strip()
                except Exception as e:
                    print(f"Error parsing PDF: {e}")
        
    db.session.commit()
    return jsonify(resume.to_dict()), 200

@resumes_bp.route('/<int:resume_id>', methods=['DELETE'])
@jwt_required()
def delete_resume(resume_id):
    user_id = get_jwt_identity()
    resume = ResumeVersion.query.filter_by(id=resume_id, user_id=user_id).first()
    if not resume:
        return jsonify({'error': 'Not found'}), 404
        
    db.session.delete(resume)
    db.session.commit()
    return jsonify({'message': 'Deleted successfully'}), 200
