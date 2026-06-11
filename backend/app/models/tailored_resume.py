from datetime import datetime
from app.extensions import db

class TailoredResume(db.Model):
    __tablename__ = 'tailored_resumes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    application_id = db.Column(db.Integer, db.ForeignKey('applications.id'), nullable=False, unique=True)
    resume_version_id = db.Column(db.Integer, db.ForeignKey('resume_versions.id'), nullable=True)
    latex_content = db.Column(db.Text, nullable=False)
    chat_history = db.Column(db.Text, nullable=True)  # JSON list of {role, content}
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        import json
        return {
            'id': self.id,
            'application_id': self.application_id,
            'resume_version_id': self.resume_version_id,
            'latex_content': self.latex_content,
            'chat_history': json.loads(self.chat_history) if self.chat_history else [],
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
