from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import Category

@admin_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    cats = Category.query.filter_by(deleted_at=None).all()
    return jsonify([{"id": c.id, "name": c.name, "is_active": c.is_active} for c in cats]), 200

@admin_bp.route('/categories', methods=['POST'])
@jwt_required()
def add_category():
    data = request.json
    cat = Category(name=data['name'], description=data.get('description'))
    db.session.add(cat)
    db.session.commit()
    return jsonify({"success": True, "id": cat.id}), 201
