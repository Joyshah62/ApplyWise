from datetime import datetime
from app.extensions import db

class Application(db.Model):
    __tablename__ = 'applications'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    company_name = db.Column(db.String(150), nullable=False)
    job_title = db.Column(db.String(150), nullable=False)
    job_url = db.Column(db.Text, nullable=False)
    portal = db.Column(db.String(100), nullable=True)
    location = db.Column(db.String(150), nullable=True)
    date_applied = db.Column(db.Date, default=datetime.utcnow().date)
    status = db.Column(db.String(50), default='Saved')
    resume_version_id = db.Column(db.Integer, db.ForeignKey('resume_versions.id'), nullable=True)
    job_description = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    follow_up_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    status_history = db.relationship('StatusHistory', backref='application', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'company_name': self.company_name,
            'job_title': self.job_title,
            'job_url': self.job_url,
            'portal': self.portal,
            'location': self.location,
            'date_applied': self.date_applied.isoformat() if self.date_applied else None,
            'status': self.status,
            'resume_version_id': self.resume_version_id,
            'job_description': self.job_description,
            'notes': self.notes,
            'follow_up_date': self.follow_up_date.isoformat() if self.follow_up_date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
