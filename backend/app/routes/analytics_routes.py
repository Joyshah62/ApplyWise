from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.application import Application
from app.extensions import db
from sqlalchemy import func

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

@analytics_bp.route('/summary', methods=['GET'])
@jwt_required()
def get_summary():
    user_id = get_jwt_identity()
    
    total = Application.query.filter_by(user_id=user_id).count()
    
    interviews = Application.query.filter_by(user_id=user_id, status='Interview').count()
    offers = Application.query.filter_by(user_id=user_id, status='Offer').count()
    rejections = Application.query.filter_by(user_id=user_id, status='Rejected').count()
    
    # Response rate = (interviews + offers + rejections) / total
    responses = interviews + offers + rejections
    response_rate = (responses / total * 100) if total > 0 else 0
    interview_rate = (interviews / total * 100) if total > 0 else 0
    
    return jsonify({
        'total': total,
        'responses': responses,
        'interviews': interviews,
        'offers': offers,
        'rejections': rejections,
        'response_rate': round(response_rate, 1),
        'interview_rate': round(interview_rate, 1)
    }), 200

@analytics_bp.route('/by-status', methods=['GET'])
@jwt_required()
def get_by_status():
    user_id = get_jwt_identity()
    status_counts = db.session.query(
        Application.status, func.count(Application.id)
    ).filter_by(user_id=user_id).group_by(Application.status).all()
    
    return jsonify({status: count for status, count in status_counts}), 200

@analytics_bp.route('/by-portal', methods=['GET'])
@jwt_required()
def get_by_portal():
    user_id = get_jwt_identity()
    portal_counts = db.session.query(
        Application.portal, func.count(Application.id)
    ).filter_by(user_id=user_id).group_by(Application.portal).all()
    
    # Handle empty portals by giving them a generic name like 'Direct'
    result = {}
    for portal, count in portal_counts:
        key = portal if portal else 'Unknown/Direct'
        result[key] = result.get(key, 0) + count
        
    return jsonify(result), 200
