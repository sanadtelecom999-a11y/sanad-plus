from sqlalchemy.orm import joinedload, selectinload
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from ..models.base import (
    User, Category, Product, ProductBundle, Order, Deposit, PaymentMethod,
    KYCRequest, Notification, Setting, AdminActivity, ServiceRequest,
    Transaction, Coupon, CouponUsage, Referral, FinancialAuditLog, log_financial,
    AdminOTPSession, UserProductDiscount
)
from ..services.cache_service import (
    cache_get, cache_set, cache_delete,
    key_admin_list, TTL_ADMIN_LISTS,
    invalidate_admin, invalidate_categories, invalidate_products,
    invalidate_payment_methods, invalidate_settings,
)

"""Admin Settings, Payment, Coupons & Referrals Routes"""
from flask import request, jsonify
from ..extensions import db
from ..services.telegram_service import notify_admins
from . import main
from .admin_utils import is_admin_user, handle_errors
from app.middleware import admin_required
from .admin import log_admin_activity, get_arabic_status
from flask_jwt_extended import jwt_required, get_jwt_identity
from decimal import Decimal
from datetime import datetime, timezone


def _serialize_payment_method(m):
    return {
        "id": m.id,
        "name": m.name,
        "is_active": m.is_active,
        "min_amount": float(m.min_amount) if m.min_amount else None,
        "max_amount": float(m.max_amount) if m.max_amount else None,
        "fee": float(m.fee) if m.fee else 0.0
    }

@main.route("/admin/api/payment-methods", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_payment_methods():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    if request.method == "GET":
        methods = PaymentMethod.query.filter_by(is_active=True).all()
        return jsonify([_serialize_payment_method(m) for m in methods])

    data = request.get_json() or {}
    validated, err = _validate_payment_method_data(data)
    if err:
        return jsonify({"error": err}), 400

    icon_url = _normalize_image(data.get("icon", ""), folder="sanad/payment-methods")
    qr_url = _normalize_image(data.get("qr_image", ""), folder="sanad/qr-codes")

    method = PaymentMethod(
        name=data.get("name"),
        description=data.get("description", ""),
        account_name=data.get("account_name", ""),
        account=data.get("account", ""),
        icon=icon_url,
        qr_image=qr_url,
        min_amount=validated["min_amount"],
        max_amount=validated["max_amount"],
        fee=validated["fee"],
        requires_kyc=data.get("requires_kyc", False),
        is_active=data.get("is_active", True),
    )
    if hasattr(method, "fee_type"):
        method.fee_type = validated["fee_type"]

    db.session.add(method)
    log_admin_activity(f"إضافة طريقة دفع: {method.name}")
    db.session.commit()
    return jsonify({"id": method.id}), 201

@main.route("/admin/api/payment-methods/<int:method_id>", methods=["PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_payment_method_actions(method_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    method = PaymentMethod.query.get(method_id)
    if not method:
        return jsonify({"error": "غير موجودة"}), 404

    if request.method == "DELETE":
        method.is_active = False
        method.deleted_at = datetime.now(timezone.utc)
        log_admin_activity(f"أرشفة طريقة دفع: {method.name}")
        db.session.commit()
        return jsonify({"success": True})

    data = request.get_json() or {}
    validated, err = _validate_payment_method_data(data, current=method)
    if err:
        return jsonify({"error": err}), 400

    if "name" in data and data["name"]: method.name = data["name"]
    if "description" in data: method.description = data["description"]
    if "account_name" in data: method.account_name = data["account_name"]
    if "account" in data: method.account = data["account"]
    if "icon" in data and data["icon"]:
        method.icon = _normalize_image(data["icon"], folder="sanad/payment-methods")
    if "qr_image" in data and data["qr_image"]:
        method.qr_image = _normalize_image(data["qr_image"], folder="sanad/qr-codes")
    if "requires_kyc" in data: method.requires_kyc = bool(data["requires_kyc"])
    if "is_active" in data: method.is_active = bool(data["is_active"])

    method.min_amount = validated["min_amount"]
    method.max_amount = validated["max_amount"]
    method.fee = validated["fee"]
    if hasattr(method, "fee_type"):
        method.fee_type = validated["fee_type"]

    log_admin_activity(f"تعديل طريقة دفع: {method.name}")
    db.session.commit()
    return jsonify({"success": True, "id": method.id})

# Orders — 🆕 v18.1: joinedload + cached
# ============================================================

@main.route("/admin/api/settings", methods=["GET", "PUT"])
@jwt_required()
@handle_errors
def admin_settings():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        return jsonify({s.key: s.value for s in Setting.query.all()})

    data = request.get_json() or {}
    for key, value in data.items():
        s = Setting.query.filter_by(key=key).first()
        if s: s.value = str(value)
        else: db.session.add(Setting(key=key, value=str(value)))
    db.session.commit()

    # 🆕 v18.1: also invalidate public settings cache
    invalidate_settings()

    return jsonify({"success": True})

# ============================================================
# Coupons — 🆕 v18.1: cached
# ============================================================

@main.route("/admin/api/coupons", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_coupons():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    if request.method == "GET":
        cached = cache_get(key_admin_list("coupons"))
        if cached is not None:
            return jsonify(cached)

        coupons = Coupon.query.order_by(Coupon.created_at.desc()).all()
        result = [{
            "id": c.id, "code": c.code, "description": c.description,
            "discount_type": c.discount_type, "discount_value": c.discount_value,
            "min_amount": c.min_amount, "max_discount": c.max_discount,
            "max_uses": c.max_uses, "used_count": c.used_count,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "is_active": c.is_active,
        } for c in coupons]

        cache_set(key_admin_list("coupons"), result, ttl=TTL_ADMIN_LISTS)
        return jsonify(result)

    data = request.get_json() or {}
    code = (data.get("code") or "").strip().upper()
    if not code:
        return jsonify({"error": "أدخل الكود"}), 400
    if Coupon.query.filter_by(code=code).first():
        return jsonify({"error": "الكود موجود"}), 400

    expires_at = None
    if data.get("expires_at"):
        try:
            expires_at = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
        except Exception:
            expires_at = None

    coupon = Coupon(
        code=code, description=data.get("description", ""),
        discount_type=data.get("discount_type", "percentage"),
        discount_value=float(data.get("discount_value", 0)),
        min_amount=float(data.get("min_amount", 0)),
        max_discount=float(data.get("max_discount", 0)),
        max_uses=int(data.get("max_uses", 0)),
        expires_at=expires_at, is_active=data.get("is_active", True),
    )
    db.session.add(coupon)
    db.session.commit()

    invalidate_admin("coupons")

    return jsonify({"id": coupon.id}), 201

@main.route("/admin/api/coupons/<int:coupon_id>", methods=["PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_coupon_actions(coupon_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    coupon = Coupon.query.get(coupon_id)
    if not coupon:
        return jsonify({"error": "غير موجود"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        for k in ["is_active", "description", "discount_value", "max_uses"]:
            if k in data:
                if k == "is_active": coupon.is_active = bool(data[k])
                elif k == "discount_value": coupon.discount_value = float(data[k])
                elif k == "max_uses": coupon.max_uses = int(data[k])
                else: setattr(coupon, k, data[k])
        db.session.commit()

        invalidate_admin("coupons")

        return jsonify({"success": True})

    CouponUsage.query.filter_by(coupon_id=coupon.id).delete()
    db.session.delete(coupon)
    db.session.commit()

    invalidate_admin("coupons")

    return jsonify({"success": True})

# ============================================================
# Referrals, Activities, Audit — 🆕 v18.1: joinedload
# ============================================================

@main.route("/admin/api/referrals", methods=["GET"])
@jwt_required()
@handle_errors
def admin_referrals():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    cached = cache_get(key_admin_list("referrals"))
    if cached is not None:
        return jsonify(cached)

    referrals = (
        Referral.query
        .options(joinedload(Referral.referrer), joinedload(Referral.referred_user))
        .order_by(Referral.created_at.desc())
        .limit(200)
        .all()
    )

    result = []
    for r in referrals:
        referrer = r.referrer
        referred = r.referred_user
        result.append({
            "id": r.id,
            "referrer_id": r.referrer_id,
            "referrer_telegram": referrer.telegram_id if referrer else None,
            "referred_user_id": r.referred_user_id,
            "referred_telegram": referred.telegram_id if referred else None,
            "reward_amount": r.reward_amount,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        })

    cache_set(key_admin_list("referrals"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)