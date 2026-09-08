from flask import jsonify
from ..models.base import Category
from . import main

@main.route("/api/categories/", methods=["GET"])
def get_categories():
    categories = Category.query.filter_by(is_active=True).order_by(Category.order).all()
    return jsonify([{
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "image": c.image,
        "order": c.order,
    } for c in categories])