from datetime import datetime, timezone
from flask import request, jsonify
from ..models.base import Coupon, CouponUsage, User
from ..extensions import db
from . import main

@main.route("/api/coupons/validate", methods=["POST"])
def validate_coupon():
    """التحقق من صلاحية كود الخصم"""
    data = request.get_json()
    code = (data.get("code") or "").strip().upper()
    telegram_id = data.get("telegram_id")
    order_amount = float(data.get("order_amount", 0))

    if not code:
        return jsonify({"error": "أدخل كود الخصم"}), 400
    if order_amount <= 0:
        return jsonify({"error": "مبلغ الطلب غير صالح"}), 400

    coupon = Coupon.query.filter_by(code=code).first()
    if not coupon:
        return jsonify({"error": "كود الخصم غير صحيح"}), 404

    if not coupon.is_active:
        return jsonify({"error": "كود الخصم غير مفعل"}), 400

    if coupon.expires_at and coupon.expires_at < datetime.now(timezone.utc):
        return jsonify({"error": "انتهت صلاحية كود الخصم"}), 400

    if coupon.max_uses > 0 and coupon.used_count >= coupon.max_uses:
        return jsonify({"error": "تم استهلاك كود الخصم"}), 400

    if order_amount < coupon.min_amount:
        return jsonify({"error": f"الحد الأدنى لاستخدام الكود هو {coupon.min_amount}$"}), 400

    # التحقق من استخدام المستخدم للكود من قبل
    if telegram_id:
        user = User.query.filter_by(telegram_id=telegram_id).first()
        if user:
            existing = CouponUsage.query.filter_by(coupon_id=coupon.id, user_id=user.id).first()
            if existing:
                return jsonify({"error": "استخدمت هذا الكود من قبل"}), 400

    # حساب الخصم
    if coupon.discount_type == "percentage":
        discount = order_amount * (coupon.discount_value / 100)
        if coupon.max_discount > 0 and discount > coupon.max_discount:
            discount = coupon.max_discount
    else:
        discount = coupon.discount_value
        if discount > order_amount:
            discount = order_amount

    final_amount = max(0, order_amount - discount)

    return jsonify({
        "valid": True,
        "code": coupon.code,
        "discount_type": coupon.discount_type,
        "discount_value": coupon.discount_value,
        "discount_amount": round(discount, 4),
        "final_amount": round(final_amount, 4),
        "message": f"تم تطبيق الخصم بقيمة {round(discount, 2)}$"
    }), 200