from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import Category, Product

@admin_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    cats = Category.query.filter_by(deleted_at=None).all()
    return jsonify([{"id": c.id, "name": c.name, "image": c.image, "is_active": c.is_active} for c in cats]), 200

@admin_bp.route('/products', methods=['GET'])
@jwt_required()
def get_products():
    prods = Product.query.filter_by(deleted_at=None).all()
    return jsonify([{
        "id": p.id, "name": p.name, "base_price": float(p.base_price or 0),
        "base_quantity": p.base_quantity, "unit_name": p.unit_name, "image": p.image,
        "category_id": p.category_id, "category_name": p.category.name if p.category else "غير محدد",
        "is_active": p.is_active
    } for p in prods]), 200
