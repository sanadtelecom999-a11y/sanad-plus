# ============================================================
# 💳 Payment Methods Routes — v2.2 (with Redis Cache)
# ============================================================
from flask import jsonify
from ..models.base import PaymentMethod
from . import main
from ..services.cache_service import (
    cache_get, cache_set,
    key_payment_methods, TTL_PAYMENT_METHODS,
)


@main.route("/api/payment-methods/", methods=["GET"])
def get_payment_methods():
    # 🚀 حاول من Cache أولاً
    cached = cache_get(key_payment_methods())
    if cached is not None:
        return jsonify(cached)

    # 💾 قراءة من DB
    methods = PaymentMethod.query.filter_by(is_active=True).all()
    result = [{
        "id": m.id,
        "name": m.name,
        "description": m.description,
        "account": m.account,
        "account_name": m.account_name,
        "icon": m.icon,
        "qr_image": m.qr_image,
        "min_amount": m.min_amount,
        "fee": m.fee,
        "requires_kyc": m.requires_kyc,
    } for m in methods]

    # 💾 احفظ في Cache
    cache_set(key_payment_methods(), result, ttl=TTL_PAYMENT_METHODS)
    return jsonify(result)