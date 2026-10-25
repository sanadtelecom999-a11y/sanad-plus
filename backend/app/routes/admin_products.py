from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import Category, Product

@admin_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    return jsonify([{"id": c.id, "name": c.name} for c in Category.query.all()]), 200

@admin_bp.route('/categories', methods=['POST'])
@jwt_required()
def add_category():
    c = Category(name=request.json['name'])
    db.session.add(c)
    db.session.commit()
    return jsonify({"id": c.id}), 201

@admin_bp.route('/products', methods=['GET'])
@jwt_required()
def get_products():
    return jsonify([{"id": p.id, "name": p.name, "base_price": float(p.base_price)} for p in Product.query.all()]), 200

@admin_bp.route('/products', methods=['POST'])
@jwt_required()
def add_product():
    p = Product(category_id=request.json['category_id'], name=request.json['name'], base_price=request.json['base_price'])
    db.session.add(p)
    db.session.commit()
    return jsonify({"id": p.id}), 201
