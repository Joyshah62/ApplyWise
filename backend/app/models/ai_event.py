from datetime import datetime
from app.extensions import db

class AiEvent(db.Model):
    __tablename__ = 'ai_events'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)  # analyze | cover_letter | refine
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
