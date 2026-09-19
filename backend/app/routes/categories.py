# ============================================================
# 📁 Categories Routes — v2.2 (with Redis Cache)
# ============================================================
from flask import jsonify
from ..models.base import Category
from . import main
from ..services.cache_service import (
    cache_get, cache_set,
    key_categories, TTL_CATEGORIES,
)


@main.route("/api/categories/", methods=["GET"])
def get_categories():
    # 🚀 حاول من Cache أولاً
    cached = cache_get(key_categories())
    if cached is not None:
        return jsonify(cached)

    # 💾 قراءة من DB
    categories = Category.query.filter_by(is_active=True).order_by(Category.display_order).all()
    result = [{
        "id": c.id,
        "name": c.name,
        "description": c.description,
        "image": c.image,
        "display_order": c.display_order,
    } for c in categories]

    # 💾 احفظ في Cache
    cache_set(key_categories(), result, ttl=TTL_CATEGORIES)
    return jsonify(result)