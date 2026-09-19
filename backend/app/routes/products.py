# ============================================================
# 📦 Products Routes — v2.2 (with Redis Cache)
# ============================================================
from flask import jsonify, request
from ..models.base import Product, ProductBundle
from . import main
from ..services.cache_service import (
    cache_get, cache_set,
    key_products, TTL_PRODUCTS,
)


@main.route("/api/products/", methods=["GET"])
def get_products():
    category_id = request.args.get("category_id", type=int)

    # 🚀 حاول من Cache أولاً
    cache_key = key_products(category_id)
    cached = cache_get(cache_key)
    if cached is not None:
        return jsonify(cached)

    # 💾 قراءة من DB
    query = Product.query.filter_by(is_active=True)
    if category_id:
        query = query.filter_by(category_id=category_id)
    products = query.all()

    result = []
    for p in products:
        bundles = ProductBundle.query.filter_by(
            product_id=p.id, is_active=True
        ).order_by(ProductBundle.price_usd).all()
        result.append({
            "id": p.id,
            "category_id": p.category_id,
            "name": p.name,
            "description": p.description,
            "image": p.image,
            "product_type": p.product_type,
            "base_quantity": p.base_quantity,
            "base_price": p.base_price,
            "unit_name": p.unit_name or "قطعة",
            "input_type": p.input_type,
            "custom_input_label": p.custom_input_label,
            "stock": p.stock,
            "max_quantity": p.max_quantity,
            "is_bundle": p.is_bundle,
            "bundles": [{
                "id": b.id,
                "name": b.name,
                "quantity": b.quantity,
                "price_usd": b.price_usd,
            } for b in bundles],
        })

    # 💾 احفظ في Cache
    cache_set(cache_key, result, ttl=TTL_PRODUCTS)
    return jsonify(result)