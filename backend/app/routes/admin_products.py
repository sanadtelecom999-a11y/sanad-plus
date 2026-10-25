from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import Product

@admin_bp.route('/products', methods=['GET'])
@jwt_required()
def get_products():
    prods = Product.query.filter_by(deleted_at=None).all()
    return jsonify([{"id": p.id, "name": p.name, "base_price": float(p.base_price)} for p in prods]), 200

@admin_bp.route('/products', methods=['POST'])
@jwt_required()
def add_product():
    data = request.json
    prod = Product(
        category_id=data['category_id'],
        name=data['name'],
        base_price=data['base_price']
    )
    db.session.add(prod)
    db.session.commit()
    return jsonify({"success": True, "id": prod.id}), 201
