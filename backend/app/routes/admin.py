# ============================================================
# 🎛️ Admin Routes — v18.1 (Optimized: joinedload + cache)
# ============================================================
import os
import json
import uuid
import traceback
import random
import time
import sentry_sdk
from collections import defaultdict
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from sqlalchemy.orm import joinedload, selectinload
from ..models.base import (
    User, Category, Product, ProductBundle, Order, Deposit, PaymentMethod,
    KYCRequest, Notification, Setting, AdminActivity, ServiceRequest,
    Transaction, Coupon, CouponUsage, Referral, FinancialAuditLog, log_financial,
    AdminOTPSession, UserProductDiscount
)
from ..extensions import db
from . import main
from .admin_utils import handle_errors, is_admin_user
from ..services.telegram_service import (
    send_telegram_notification, notify_admins,
    send_deposit_approved, send_deposit_rejected,
    send_kyc_approved, send_kyc_rejected,
    send_order_refund_failed, send_order_refund_cancelled
)
from ..services.cloudinary_service import upload_base64_image, get_signed_url
from ..services.cache_service import (
    cache_get, cache_set, cache_delete,
    key_admin_list, TTL_ADMIN_LISTS,
    invalidate_admin, invalidate_categories, invalidate_products,
    invalidate_payment_methods, invalidate_settings,
)
from .. import limiter
from .. import get_real_ip
from .auth import cleanup_expired_blacklist, revoke_all_admin_sessions
from app.services.admin_service import adjust_user_balance, AdminServiceError

from app.middleware import admin_required
from app.services.admin_auth_service import (
    OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS, get_admin_ids,
    generate_otp_code, cleanup_expired_otp_sessions, check_login_rate_limit
)

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")
if not ADMIN_PASSWORD_HASH:
    raise RuntimeError("ADMIN_PASSWORD_HASH إلزامي")

# ============================================================
# Helpers
# ============================================================







def verify_admin_password(password):
    return check_password_hash(ADMIN_PASSWORD_HASH, password)

def log_admin_activity(action):
    try:
        try:
            from flask_jwt_extended import get_jwt
            admin_id = get_jwt().get("telegram_id")
        except Exception:
            admin_id = None
        activity = AdminActivity(admin_id=admin_id, action=action, created_at=datetime.now(timezone.utc))
        db.session.add(activity)
        db.session.flush()
    except Exception:
        db.session.rollback()

def get_arabic_status(status):
    status_map = {
        "pending": "قيد المعالجة", "review": "قيد المراجعة", "processing": "قيد التنفيذ",
        "completed": "مكتمل", "failed": "فشل", "cancelled": "ملغي",
        "approved": "مقبول", "rejected": "مرفوض"
    }
    return status_map.get(status, status)

def serialize_bundle(b):
    return {
        "id": b.id, "product_id": b.product_id, "name": b.name,
        "quantity": b.quantity, "price_usd": b.price_usd, "is_active": b.is_active,
    }

def _normalize_image(image_data, folder="sanad/uncategorized"):
    if not image_data or not isinstance(image_data, str):
        return image_data
    if image_data.startswith("http://") or image_data.startswith("https://"):
        return image_data
    if image_data.startswith("data:image/"):
        url = upload_base64_image(image_data, folder=folder)
        if url:
            return url
        print(f"⚠️ Cloudinary upload failed — keeping base64 for {folder}")
        return image_data
    return image_data

# ============================================================
# Authentication (OTP DB)
# ============================================================

@main.route("/admin/login", methods=["POST"])
@limiter.limit("5 per 5 minutes")
@handle_errors
def admin_login():
    ip = get_real_ip()

    if not check_login_rate_limit(ip):
        return jsonify({"error": "محاولات كثيرة، حاول بعد 5 دقائق"}), 429

    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if username != ADMIN_USERNAME or not verify_admin_password(password):
        return jsonify({"error": "بيانات غير صحيحة"}), 401

    cleanup_expired_otp_sessions()
    cleanup_expired_blacklist()

    otp_code = generate_otp_code()
    otp_hash = generate_password_hash(otp_code)
    session_id = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS)

    try:
        session = AdminOTPSession(
            session_id=session_id,
            code_hash=otp_hash,
            expires_at=expires_at,
            ip_address=ip,
        )
        db.session.add(session)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"فشل إنشاء الجلسة: {e}"}), 500

    sent_count = 0
    for admin_id in get_admin_ids():
        success = send_telegram_notification(
            admin_id,
            f"رمز التحقق للدخول إلى لوحة التحكم\n\n"
            f"الرمز: {otp_code}\n\n"
            f"صالح لمدة 5 دقائق فقط."
        )
        if success:
            sent_count += 1

    if sent_count == 0:
        try:
            AdminOTPSession.query.filter_by(session_id=session_id).delete()
            db.session.commit()
        except Exception:
            db.session.rollback()
        return jsonify({"error": "تعذر إرسال رمز التحقق"}), 500

    return jsonify({
        "require_otp": True,
        "session_id": session_id,
        "message": "تم إرسال رمز التحقق إلى تيليجرام"
    }), 200

@main.route("/admin/verify-otp", methods=["POST"])
@limiter.limit("10 per 5 minutes")
@handle_errors
def admin_verify_otp():
    data = request.get_json() or {}
    session_id = data.get("session_id")
    otp_code = (data.get("otp_code") or "").strip()

    if not session_id or not otp_code:
        return jsonify({"error": "بيانات ناقصة"}), 400

    cleanup_expired_otp_sessions()

    session = AdminOTPSession.query.filter_by(session_id=session_id).first()
    if not session:
        return jsonify({"error": "انتهت الجلسة"}), 400

    if session.expires_at < datetime.now(timezone.utc):
        db.session.delete(session)
        db.session.commit()
        return jsonify({"error": "انتهت صلاحية الرمز"}), 400

    if session.attempts >= OTP_MAX_ATTEMPTS:
        db.session.delete(session)
        db.session.commit()
        return jsonify({"error": "تجاوزت عدد المحاولات"}), 400

    if not check_password_hash(session.code_hash, otp_code):
        session.attempts += 1
        db.session.commit()
        remaining = OTP_MAX_ATTEMPTS - session.attempts
        return jsonify({"error": f"رمز خاطئ. محاولات متبقية: {remaining}"}), 401

    db.session.delete(session)
    db.session.commit()

    admin_ids = get_admin_ids()
    admin_telegram_id = admin_ids[0] if admin_ids else None
    token = create_access_token(
        identity="admin",
        additional_claims={"telegram_id": admin_telegram_id},
    )
    log_admin_activity("تسجيل دخول الأدمن (مع OTP)")
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({"token": token}), 200

# ============================================================
# 🆕 v17.1: Logout-All
# ============================================================

@main.route("/admin/api/logout-all", methods=["POST"])
@jwt_required()
@handle_errors
def admin_logout_all():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    success = revoke_all_admin_sessions()
    if success:
        log_admin_activity("إبطال جميع جلسات الأدمن")
        try:
            db.session.commit()
        except Exception:
            db.session.rollback()
        return jsonify({"success": True, "message": "تم إبطال كل الجلسات"})
    return jsonify({"error": "فشل إبطال الجلسات"}), 500

# ============================================================
# Users — 🆕 v18.1: cached list
# ============================================================

@main.route("/admin/api/orders", methods=["GET"])
@jwt_required()
@handle_errors
def admin_orders():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    # 🚀 Cache
    cached = cache_get(key_admin_list("orders"))
    if cached is not None:
        return jsonify(cached)

    # 🚀 Eager load user + product (avoids N+1)
    orders = (
        Order.query
        .filter(Order.status.in_(['pending', 'review', 'processing']))
        .options(joinedload(Order.user), joinedload(Order.product))
        .order_by(Order.created_at.desc())
        .all()
    )

    result = []
    for o in orders:
        product = o.product
        user = o.user
        result.append({
            "id": o.id, "order_number": o.order_number, "user_id": o.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": (user.first_name or user.username) if user else None,
            "product_id": o.product_id,
            "product_name": product.name if product else "منتج محذوف",
            "product_image": product.image if product else None,
            "product_type": product.product_type if product else None,
            "product_unit_name": product.unit_name if product else "قطعة",
            "quantity": o.quantity, "unit_price": o.unit_price,
            "total_price": o.total_price, "discount_amount": o.discount_amount or 0,
            "coupon_code": o.coupon_code, "status": o.status,
            "delivery_data": o.delivery_data,
            "created_at": o.created_at.isoformat() if o.created_at else None,
        })

    cache_set(key_admin_list("orders"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)

@main.route("/admin/api/orders/<int:order_id>", methods=["GET"])
@jwt_required()
@handle_errors
def admin_order_detail(order_id):
    if not is_admin_user(get_jwt_identity()):
        db.session.commit()
    invalidate_admin("orders")
    return jsonify({"error": "غير مصرح"}), 403
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404
    product = Product.query.get(order.product_id)
    return jsonify({
        "id": order.id, "order_number": order.order_number,
        "user_id": order.user_id, "product_id": order.product_id,
        "product_name": product.name if product else "منتج محذوف",
        "product_unit_name": product.unit_name if product else "قطعة",
        "quantity": order.quantity, "unit_price": order.unit_price,
        "total_price": order.total_price, "discount_amount": order.discount_amount or 0,
        "coupon_code": order.coupon_code,
        "status": order.status, "status_arabic": get_arabic_status(order.status),
        "delivery_data": order.delivery_data,
        "created_at": order.created_at.isoformat() if order.created_at else None,
    })

@jwt_required(optional=True)
@handle_errors
@main.route("/admin/api/orders/<int:order_id>/full", methods=["GET"])
@handle_errors
def admin_order_full_detail(order_id):
    from flask_jwt_extended import verify_jwt_in_request
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        pass
    if not is_admin_user(get_jwt_identity()):
        db.session.commit()
    invalidate_admin("orders")
    return jsonify({"error": "غير مصرح"}), 403

    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404

    product = Product.query.get(order.product_id)
    user = User.query.get(order.user_id)

    delivery = {}
    if order.delivery_data:
        try:
            delivery = json.loads(order.delivery_data)
        except Exception:
            delivery = {"raw": order.delivery_data}

    return jsonify({
        "id": order.id,
        "order_number": order.order_number,
        "user": {
            "id": user.id if user else None,
            "telegram_id": user.telegram_id if user else None,
            "first_name": user.first_name if user else None,
            "last_name": user.last_name if user else None,
            "username": user.username if user else None,
            "balance": float(user.balance) if user and user.balance is not None else 0.0,
            "kyc_status": user.kyc_status if user else None,
        } if user else None,
        "product": {
            "id": product.id if product else None,
            "name": product.name if product else "منتج محذوف",
            "image": product.image if product else None,
            "product_type": product.product_type if product else None,
            "unit_name": product.unit_name if product else "قطعة",
            "input_type": product.input_type if product else None,
        } if product else None,
        "quantity": order.quantity,
        "unit_price": order.unit_price,
        "total_price": order.total_price,
        "discount_amount": order.discount_amount or 0,
        "coupon_code": order.coupon_code,
        "status": order.status,
        "status_arabic": get_arabic_status(order.status),
        "delivery_data": delivery,
        "can_cancel_until": order.can_cancel_until.isoformat() if order.can_cancel_until else None,
        "cancelled_at": order.cancelled_at.isoformat() if order.cancelled_at else None,
        "completed_at": order.completed_at.isoformat() if order.completed_at else None,
        "failed_at": order.failed_at.isoformat() if order.failed_at else None,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "updated_at": order.updated_at.isoformat() if order.updated_at else None,
    })

@main.route("/admin/api/orders/<int:order_id>/status", methods=["POST", "OPTIONS"])
@jwt_required(optional=True)
@handle_errors
def admin_update_order_status(order_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "الطلب غير موجود"}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "completed")

    # تحديث الحالة صراحة
    order.status = new_status
    
    try:
        db.session.commit()
        invalidate_admin("orders")
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"فشل الحفظ: {str(e)}"}), 500

    return jsonify({"status": new_status, "order_id": order.id}), 200

@main.route("/admin/api/orders/bulk-status", methods=["POST"])
@jwt_required()
@handle_errors
def admin_bulk_order_status():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    data = request.get_json() or {}
    order_ids = data.get("order_ids", [])
    new_status = data.get("status")

    if not order_ids or not new_status:
        return jsonify({"error": "بيانات ناقصة"}), 400
    if len(order_ids) > 100:
        return jsonify({"error": "الحد الأقصى 100 طلب"}), 400

    order_ids = sorted(set(int(x) for x in order_ids))

    valid_transitions = {
        "pending":    ["review", "processing", "completed", "failed", "cancelled"],
        "review":     ["processing", "completed", "failed"],
        "processing": ["completed", "failed"],
    }

    success = []
    failed = []

    for oid in order_ids:
        order = Order.query.filter_by(id=oid).with_for_update().first()
        if not order:
            failed.append({"id": oid, "reason": "غير موجود"})
            continue
        if order.status in ["completed", "failed", "cancelled"]:
            failed.append({"id": oid, "reason": f"الحالة النهائية: {order.status}"})
            continue
        if order.status not in valid_transitions:
            failed.append({"id": oid, "reason": f"حالة غير معروفة: {order.status}"})
            continue
        if new_status not in valid_transitions[order.status]:
            failed.append({"id": oid, "reason": f"لا يمكن {order.status} -> {new_status}"})
            continue

        user = User.query.filter_by(id=order.user_id).with_for_update().first()
        product = Product.query.filter_by(id=order.product_id).with_for_update().first()

        old_status = order.status
        order.status = new_status
        order.updated_at = datetime.now(timezone.utc)

        if new_status == "cancelled":
            order.cancelled_at = datetime.now(timezone.utc)
        elif new_status == "completed":
            order.completed_at = datetime.now(timezone.utc)
        elif new_status == "failed":
            order.failed_at = datetime.now(timezone.utc)

        if new_status in ("failed", "cancelled") and user and old_status not in ("failed", "cancelled"):
            balance_before = user.balance
            user.balance = round(user.balance + order.total_price, 2)
            db.session.add(Transaction(
                user_id=user.id, type="refund", amount=order.total_price,
                balance_after=user.balance, reference_type=f"order_{new_status}",
                reference_id=order.id,
            ))
            log_financial(
                user=user, action=f"order_{new_status}", amount=order.total_price,
                balance_before=balance_before, balance_after=user.balance,
                ref_type="order", ref_id=order.id, note=f"Bulk: {new_status}",
            )
            if product and product.stock is not None:
                product.stock += order.quantity

        if new_status == "completed" and user:
            db.session.add(Notification(
                user_id=user.id, title="تم تنفيذ طلبك",
                message=f"تم إكمال طلبك {order.order_number} بنجاح",
                type="success",
            ))

        success.append(oid)

    log_admin_activity(f"تحديث جماعي: {len(success)} طلب -> {get_arabic_status(new_status)}")
    db.session.commit()

    invalidate_admin("orders")

    return jsonify({
        "success_count": len(success),
        "failed_count": len(failed),
        "success_ids": success,
        "failed": failed,
    })

@main.route("/admin/api/orders/<int:order_id>/reject", methods=["POST", "OPTIONS"])
@jwt_required(optional=True)
@handle_errors
def admin_reject_order(order_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
        
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "الطلب غير موجود"}), 404
    if order.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    order.status = "rejected"
    # إضافة ملاحظة الرفض إذا وجدت
    try:
        data = request.get_json(silent=True) or {}
        reason = data.get("reason", "مرفوض من الإدارة")
        if hasattr(order, 'admin_note'):
            order.admin_note = reason
    except:
        pass
        
    db.session.commit()
    invalidate_admin("orders")
    return jsonify({"status": "rejected", "order_id": order.id}), 200
