from datetime import datetime
from app.extensions import db

class ResumeVersion(db.Model):
    __tablename__ = 'resume_versions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    file_url = db.Column(db.String(255), nullable=True)
    target_role = db.Column(db.String(100), nullable=True)
    content = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    applications = db.relationship('Application', backref='resume', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'file_url': self.file_url,
            'target_role': self.target_role,
            'content': self.content,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
