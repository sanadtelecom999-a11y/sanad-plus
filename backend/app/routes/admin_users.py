"""Admin Users Routes - Extracted from admin.py"""
from flask import request, jsonify
from ..extensions import db
from ..models.base import User, UserProductDiscount, Transaction, AdminActivity, FinancialAuditLog, Coupon, CouponUsage, Referral, log_financial
from ..services.admin_service import adjust_user_balance, AdminServiceError
from ..services.telegram_service import notify_admins
from ..services.cache_service import invalidate_admin
from . import main
from app.middleware import admin_required
from .admin_utils import is_admin_user, handle_errors
from .admin import log_admin_activity, get_arabic_status
from flask_jwt_extended import jwt_required, get_jwt_identity
from decimal import Decimal
from datetime import datetime, timezone

@main.route("/admin/api/users", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_users():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    # 🚀 Cache (30s)
    cached = cache_get(key_admin_list("users"))
    if cached is not None:
        return jsonify(cached)

    users = User.query.all()
    result = [{
        "id": u.id, "telegram_id": u.telegram_id, "username": u.username,
        "first_name": u.first_name, "last_name": u.last_name,
        "balance": round(u.balance, 2), "kyc_status": u.kyc_status,
        "is_verified": u.is_verified, "role": u.role,
        "is_banned": u.is_banned, "vip_level": u.vip_level,
        "referral_code": u.referral_code,
        "referral_count": u.referral_count or 0,
        "referral_earnings": round(u.referral_earnings or 0, 2),
        "allow_negative_balance": u.allow_negative_balance if u.allow_negative_balance is not None else False,
        "max_negative_balance": u.max_negative_balance or 0,
        "general_discount": u.general_discount or 0.0,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]

    cache_set(key_admin_list("users"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)

@main.route("/admin/api/users/<int:user_id>/negative-balance", methods=["POST"])
@admin_required
@handle_errors
def admin_set_negative_balance(user_id):
    data = request.get_json() or {}
    allow = bool(data.get("allow", False))
    max_neg = float(data.get("max_negative", 0))

    if max_neg < 0:
        return jsonify({"error": "الحد الأقصى لا يمكن أن يكون سالباً"}), 400
    if max_neg > 1_000_000:
        return jsonify({"error": "الحد الأقصى هو $1,000,000"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    user.allow_negative_balance = allow
    user.max_negative_balance = max_neg

    log_admin_activity(f"{'تفعيل' if allow else 'إلغاء'} الرصيد السالب للمستخدم {user.telegram_id}")
    db.session.commit()

    return jsonify({
        "allow_negative_balance": user.allow_negative_balance,
        "max_negative_balance": user.max_negative_balance,
    })

@main.route("/admin/api/users/<int:user_id>/balance", methods=["POST"])
@jwt_required()
@handle_errors
def admin_adjust_balance(user_id):
    data = request.get_json()
    amount = Decimal(str(data.get("amount") or 0))
    note = data.get("note", "")

    try:
        user = adjust_user_balance(user_id, amount, note)
        return jsonify({
            "balance": float(user.balance),
            "message": "تم تعديل الرصيد بنجاح"
        }), 200
    except AdminServiceError as e:
        return jsonify({"error": e.message, "code": e.code}), 400

@main.route("/admin/api/users/<int:user_id>/ban", methods=["POST"])
@jwt_required()
@handle_errors
def admin_ban_user(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404
    user.is_banned = not user.is_banned
    log_admin_activity(f"تغيير حظر المستخدم {user.telegram_id}")
    db.session.commit()
    notify_admins(f"حظر {user.telegram_id}: {user.is_banned}")
    return jsonify({"is_banned": user.is_banned})

@main.route("/admin/api/users/<int:user_id>/vip", methods=["POST"])
@jwt_required()
@handle_errors
def admin_set_vip(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    vip_level = int(data.get("vip_level", 0))
    if vip_level < 0 or vip_level > 7:
        return jsonify({"error": "المستوى بين 0 و 7"}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404
    user.vip_level = vip_level
    log_admin_activity(f"VIP{vip_level} للمستخدم {user.telegram_id}")
    db.session.commit()
    return jsonify({"vip_level": user.vip_level})

@main.route("/admin/api/users/<int:user_id>", methods=["GET"])
@jwt_required()
@handle_errors
def admin_user_detail(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    orders_count = Order.query.filter_by(user_id=user.id).count()
    deposits_count = Deposit.query.filter_by(user_id=user.id).count()

    return jsonify({
        "id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "balance": user.balance,
        "kyc_status": user.kyc_status,
        "is_verified": user.is_verified,
        "role": user.role,
        "is_banned": user.is_banned,
        "vip_level": user.vip_level,
        "referral_code": user.referral_code,
        "referral_count": user.referral_count or 0,
        "referral_earnings": user.referral_earnings or 0,
        "allow_negative_balance": user.allow_negative_balance,
        "max_negative_balance": user.max_negative_balance or 0,
        "general_discount": user.general_discount or 0.0,
        "orders_count": orders_count,
        "deposits_count": deposits_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    })

# ============================================================
# 🆕 v17: DISCOUNTS
# ============================================================

@main.route("/admin/api/users/<int:user_id>/discounts", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_user_discounts(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    product_discounts = UserProductDiscount.query.filter_by(user_id=user_id).all()
    result = []
    for d in product_discounts:
        product = Product.query.get(d.product_id)
        result.append({
            "id": d.id,
            "product_id": d.product_id,
            "product_name": product.name if product else "منتج محذوف",
            "product_image": product.image if product else None,
            "discount_percent": d.discount_percent,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    return jsonify({
        "general_discount": user.general_discount or 0.0,
        "product_discounts": result,
    })

@main.route("/admin/api/users/<int:user_id>/discounts/general", methods=["POST"])
@jwt_required()
@handle_errors
def admin_set_general_discount(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    try:
        percent = float(data.get("percent", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "نسبة غير صالحة"}), 400

    if percent < 0 or percent > 100:
        return jsonify({"error": "النسبة بين 0 و 100"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    user.general_discount = round(percent, 2)
    log_admin_activity(f"تعيين خصم عام {percent}% للمستخدم {user.telegram_id}")
    db.session.commit()

    return jsonify({"general_discount": user.general_discount})

@main.route("/admin/api/users/<int:user_id>/discounts/product", methods=["POST"])
@jwt_required()
@handle_errors
def admin_set_product_discount(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    try:
        product_id = int(data.get("product_id", 0))
        percent = float(data.get("percent", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "بيانات غير صالحة"}), 400

    if percent <= 0 or percent > 100:
        return jsonify({"error": "النسبة بين 0.01 و 100"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404

    existing = UserProductDiscount.query.filter_by(
        user_id=user_id, product_id=product_id
    ).first()

    if existing:
        existing.discount_percent = round(percent, 2)
    else:
        db.session.add(UserProductDiscount(
            user_id=user_id,
            product_id=product_id,
            discount_percent=round(percent, 2),
        ))

    log_admin_activity(f"خصم {percent}% على '{product.name}' للمستخدم {user.telegram_id}")
    db.session.commit()

    return jsonify({"success": True})

@main.route("/admin/api/users/<int:user_id>/discounts/<int:discount_id>", methods=["DELETE"])
@jwt_required()
@handle_errors
def admin_delete_product_discount(user_id, discount_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    discount = UserProductDiscount.query.filter_by(
        id=discount_id, user_id=user_id
    ).first()
    if not discount:
        return jsonify({"error": "غير موجود"}), 404

    db.session.delete(discount)
    log_admin_activity(f"حذف خصم من المستخدم {user_id}")
    db.session.commit()

    return jsonify({"success": True})

# ============================================================
# Categories — 🆕 v18.1: cached + eager
# ============================================================