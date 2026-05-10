from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.quick_link import QuickLink
from app.extensions import db

quick_links_bp = Blueprint('quick_links', __name__, url_prefix='/api/quick-links')

@quick_links_bp.route('', methods=['GET'])
@jwt_required()
def get_quick_links():
    user_id = get_jwt_identity()
    links = QuickLink.query.filter_by(user_id=user_id).order_by(QuickLink.id).all()
    return jsonify([link.to_dict() for link in links]), 200

@quick_links_bp.route('', methods=['POST'])
@jwt_required()
def create_quick_link():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or not data.get('title') or not data.get('url'):
        return jsonify({'error': 'Title and URL are required'}), 400
        
    link = QuickLink(
        user_id=user_id,
        title=data['title'],
        url=data['url']
    )
    
    db.session.add(link)
    db.session.commit()
    
    return jsonify(link.to_dict()), 201

@quick_links_bp.route('/<int:link_id>', methods=['DELETE'])
@jwt_required()
def delete_quick_link(link_id):
    user_id = get_jwt_identity()
    link = QuickLink.query.filter_by(id=link_id, user_id=user_id).first()
    
    if not link:
        return jsonify({'error': 'Link not found'}), 404
        
    db.session.delete(link)
    db.session.commit()
    
    return jsonify({'message': 'Link deleted successfully'}), 200
