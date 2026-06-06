from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func
from app.extensions import db
from app.models.user import User
from app.models.application import Application
from app.models.ai_event import AiEvent

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def require_admin():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_admin:
        return None, jsonify({'error': 'Admin access required'}), 403
    return user, None, None


@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    user, err, code = require_admin()
    if err:
        return err, code

    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)

    total_users = User.query.filter_by(is_admin=False).count()
    new_this_week = User.query.filter(User.created_at >= week_ago, User.is_admin == False).count()
    new_this_month = User.query.filter(User.created_at >= month_ago, User.is_admin == False).count()
    active_this_week = User.query.filter(User.last_active_at >= week_ago, User.is_admin == False).count()

    total_apps = Application.query.count()
    apps_this_week = Application.query.filter(Application.created_at >= week_ago).count()

    ai_totals = db.session.query(
        AiEvent.event_type, func.count(AiEvent.id)
    ).group_by(AiEvent.event_type).all()
    ai_usage = {k: v for k, v in ai_totals}

    # Daily signups — last 30 days
    daily_signups = db.session.query(
        func.date(User.created_at).label('day'),
        func.count(User.id).label('count')
    ).filter(
        User.created_at >= month_ago,
        User.is_admin == False
    ).group_by(func.date(User.created_at)).order_by('day').all()

    # Daily AI events — last 30 days
    daily_ai = db.session.query(
        func.date(AiEvent.created_at).label('day'),
        func.count(AiEvent.id).label('count')
    ).filter(
        AiEvent.created_at >= month_ago
    ).group_by(func.date(AiEvent.created_at)).order_by('day').all()

    # Top portals
    top_portals = db.session.query(
        Application.portal, func.count(Application.id).label('count')
    ).filter(Application.portal != None).group_by(Application.portal).order_by(func.count(Application.id).desc()).limit(6).all()

    return jsonify({
        'users': {
            'total': total_users,
            'new_this_week': new_this_week,
            'new_this_month': new_this_month,
            'active_this_week': active_this_week,
        },
        'applications': {
            'total': total_apps,
            'this_week': apps_this_week,
        },
        'ai_usage': ai_usage,
        'daily_signups': [{'day': str(r.day), 'count': r.count} for r in daily_signups],
        'daily_ai': [{'day': str(r.day), 'count': r.count} for r in daily_ai],
        'top_portals': [{'portal': r.portal or 'Direct', 'count': r.count} for r in top_portals],
    }), 200


@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    user, err, code = require_admin()
    if err:
        return err, code

    users = User.query.filter_by(is_admin=False).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        app_count = Application.query.filter_by(user_id=u.id).count()
        ai_count = AiEvent.query.filter_by(user_id=u.id).count()
        result.append({
            **u.to_dict(),
            'app_count': app_count,
            'ai_count': ai_count,
        })
    return jsonify(result), 200
