from flask import jsonify, request
from ..models.base import Product, ProductBundle, Category
from . import main

@main.route("/api/products/", methods=["GET"])
def get_products():
    category_id = request.args.get("category_id", type=int)
    query = Product.query.filter_by(is_active=True)
    if category_id:
        query = query.filter_by(category_id=category_id)
    products = query.all()
    result = []
    for p in products:
        bundles = ProductBundle.query.filter_by(product_id=p.id, is_active=True).all()
        result.append({
            "id": p.id,
            "category_id": p.category_id,
            "name": p.name,
            "description": p.description,
            "image": p.image,
            "product_type": p.product_type,
            "base_quantity": p.base_quantity,
            "base_price": p.base_price,
            "unit_name": p.unit_name,
            "input_type": p.input_type,
            "custom_input_label": p.custom_input_label,
            "stock": p.stock,
            "is_bundle": p.is_bundle,
            "bundles": [{"id": b.id, "name": b.name, "quantity": b.quantity, "price_usd": b.price_usd} for b in bundles],
        })
    return jsonify(result)