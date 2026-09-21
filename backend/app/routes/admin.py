import os
import json
import uuid
import traceback
import random
import time
from collections import defaultdict
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from ..models.base import (
    User, Category, Product, ProductBundle, Order, Deposit, PaymentMethod,
    KYCRequest, Notification, Setting, AdminActivity, ServiceRequest,
    Transaction, Coupon, CouponUsage, Referral, FinancialAuditLog, log_financial,
    AdminOTPSession
)
from ..extensions import db
from . import main
from ..services.telegram_service import (
    send_telegram_notification, notify_admins,
    send_deposit_approved, send_deposit_rejected,
    send_kyc_approved, send_kyc_rejected,
    send_order_refund_failed, send_order_refund_cancelled
)
from ..services.cloudinary_service import upload_base64_image, get_signed_url
from .. import limiter

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")
if not ADMIN_PASSWORD_HASH:
    raise RuntimeError("ADMIN_PASSWORD_HASH إلزامي")


# ============================================================
# Helpers
# ============================================================
OTP_TTL_SECONDS = 300
OTP_MAX_ATTEMPTS = 3


def get_admin_ids():
    admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
    try:
        return [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
    except ValueError:
        return []


def generate_otp_code():
    return str(random.randint(100000, 999999))


def cleanup_expired_otp_sessions():
    try:
        AdminOTPSession.query.filter(
            AdminOTPSession.expires_at < datetime.now(timezone.utc)
        ).delete()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"cleanup expired sessions: {e}")


_login_attempts = defaultdict(list)
LOGIN_RATE_WINDOW = 300
LOGIN_RATE_MAX = 5


def check_login_rate_limit(ip: str) -> bool:
    now = time.time()
    _login_attempts[ip] = [t for t in _login_attempts[ip] if now - t < LOGIN_RATE_WINDOW]
    if len(_login_attempts[ip]) >= LOGIN_RATE_MAX:
        return False
    _login_attempts[ip].append(now)
    return True


def handle_errors(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            db.session.rollback()
            tb = traceback.format_exc()
            print(f"Error in {f.__name__}: {e}")
            print(tb)
            return jsonify({"error": f"خطأ داخلي: {str(e)}", "function": f.__name__}), 500
    return wrapper


def is_admin_user(identity):
    return identity == "admin"


def verify_admin_password(password):
    return check_password_hash(ADMIN_PASSWORD_HASH, password)


def log_admin_activity(action):
    try:
        activity = AdminActivity(admin_id=None, action=action, created_at=datetime.now(timezone.utc))
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
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
    ip = ip.split(",")[0].strip()
    if not check_login_rate_limit(ip):
        return jsonify({"error": "محاولات كثيرة، حاول بعد 5 دقائق"}), 429

    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")

    if username != ADMIN_USERNAME or not verify_admin_password(password):
        return jsonify({"error": "بيانات غير صحيحة"}), 401

    cleanup_expired_otp_sessions()

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

    token = create_access_token(identity="admin")
    log_admin_activity("تسجيل دخول الأدمن (مع OTP)")
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({"token": token}), 200


# ============================================================
# Users
# ============================================================
@main.route("/admin/api/users", methods=["GET"])
@jwt_required()
@handle_errors
def admin_get_users():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    users = User.query.all()
    return jsonify([{
        "id": u.id, "telegram_id": u.telegram_id, "username": u.username,
        "first_name": u.first_name, "last_name": u.last_name,
        "balance": round(u.balance, 2), "kyc_status": u.kyc_status,
        "is_verified": u.is_verified, "role": u.role,
        "is_banned": u.is_banned, "vip_level": u.vip_level,
        "referral_code": u.referral_code,
        "referral_count": u.referral_count or 0,
        "referral_earnings": round(u.referral_earnings or 0, 2),
        "allow_negative_balance": u.allow_negative_balance if u.allow_negative_balance is not None else True,
        "max_negative_balance": u.max_negative_balance or 0,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users])


@main.route("/admin/api/users/<int:user_id>/negative-balance", methods=["POST"])
@jwt_required()
@handle_errors
def admin_set_negative_balance(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
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


@main.route("/admin/api/users/<int:user_id>/kyc", methods=["POST"])
@jwt_required()
@handle_errors
def admin_toggle_kyc(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    new_status = data.get("status")
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    if new_status == "verified":
        user.kyc_status = "verified"
        user.is_verified = True
    elif new_status == "unverified":
        user.kyc_status = "unverified"
        user.is_verified = False

    log_admin_activity(f"تغيير توثيق المستخدم {user.telegram_id}")
    db.session.commit()
    return jsonify({"kyc_status": user.kyc_status, "is_verified": user.is_verified})


@main.route("/admin/api/users/<int:user_id>/balance", methods=["POST"])
@jwt_required()
@handle_errors
def admin_adjust_balance(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    amount = float(data.get("amount", 0))
    note = data.get("note", "")

    # ✅ إزالة حد 10000 — الأدمن له صلاحية مطلقة
    if abs(amount) > 1_000_000:
        return jsonify({"error": "المبلغ كبير جداً (الحد الأقصى 1,000,000$)"}), 400
    if amount == 0:
        return jsonify({"error": "المبلغ لا يمكن أن يكون صفراً"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    balance_before = user.balance
    user.balance = round(user.balance + amount, 2)

    txn = Transaction(
        user_id=user.id, type="adjustment", amount=amount,
        balance_after=user.balance, reference_type="admin_adjustment", reference_id=user.id,
    )
    db.session.add(txn)

    log_financial(
        user=user, action="admin_adjustment", amount=amount,
        balance_before=balance_before, balance_after=user.balance,
        ref_type="admin_adjustment", ref_id=user.id, note=note,
    )

    notif = Notification(
        user_id=user.id, title="تعديل الرصيد",
        message=f"تم تعديل رصيدك بمقدار {amount:.2f}$" + (f" ({note})" if note else ""),
        type="info",
    )
    db.session.add(notif)
    log_admin_activity(f"تعديل رصيد المستخدم {user.telegram_id}: {amount:.2f}$")
    db.session.commit()

    from ..services.telegram_service import send_admin_balance_adjustment
    send_admin_balance_adjustment(user, amount, note)
    notify_admins(f"تعديل رصيد {user.telegram_id}: {amount:.2f}$")

    return jsonify({"balance": user.balance})


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
    """تفاصيل مستخدم كامل — للمودال"""
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
        "orders_count": orders_count,
        "deposits_count": deposits_count,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    })


# ============================================================
# Categories
# ============================================================
@main.route("/admin/api/categories", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_categories():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        categories = Category.query.filter_by(is_active=True).order_by(Category.display_order).all()
        return jsonify([{
            "id": c.id, "name": c.name, "description": c.description,
            "image": c.image, "is_active": c.is_active, "display_order": c.display_order,
        } for c in categories])

    data = request.get_json() or {}
    image_url = _normalize_image(data.get("image", ""), folder="sanad/categories")

    cat = Category(
        name=data.get("name"), description=data.get("description", ""),
        image=image_url, is_active=data.get("is_active", True),
        display_order=data.get("display_order", 0),
    )
    db.session.add(cat)
    log_admin_activity(f"إضافة قسم: {cat.name}")
    db.session.commit()
    return jsonify({"id": cat.id}), 201


@main.route("/admin/api/categories/<int:cat_id>", methods=["DELETE"])
@jwt_required()
@handle_errors
def admin_delete_category(cat_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    cat = Category.query.get(cat_id)
    if not cat:
        return jsonify({"error": "قسم غير موجود"}), 404

    cat_name = cat.name
    cat.is_active = False
    cat.deleted_at = datetime.now(timezone.utc)
    products = Product.query.filter_by(category_id=cat_id).all()
    for product in products:
        product.is_active = False
        product.deleted_at = datetime.now(timezone.utc)

    log_admin_activity(f"أرشفة قسم: {cat_name}")
    db.session.commit()
    return jsonify({"success": True, "message": f"تم أرشفة القسم و{len(products)} منتج"})


@main.route("/admin/api/categories/<int:cat_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_category(cat_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    cat = Category.query.get(cat_id)
    if not cat:
        return jsonify({"error": "قسم غير موجود"}), 404
    cat.is_active = True
    cat.deleted_at = None
    products = Product.query.filter_by(category_id=cat_id).all()
    for product in products:
        product.is_active = True
        product.deleted_at = None
    db.session.commit()
    return jsonify({"success": True, "message": f"تم استرجاع القسم و{len(products)} منتج"})


# ============================================================
# Products
# ============================================================
@main.route("/admin/api/products", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_products():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    if request.method == "GET":
        products = Product.query.filter_by(is_active=True).all()
        result = []
        for p in products:
            bundles = ProductBundle.query.filter_by(product_id=p.id, is_active=True).order_by(ProductBundle.price_usd).all()
            result.append({
                "id": p.id, "category_id": p.category_id, "name": p.name,
                "description": p.description, "image": p.image,
                "product_type": p.product_type, "base_quantity": p.base_quantity,
                "base_price": p.base_price, "unit_name": p.unit_name or "قطعة",
                "input_type": p.input_type, "custom_input_label": p.custom_input_label,
                "stock": p.stock, "max_quantity": p.max_quantity,
                "is_bundle": p.is_bundle, "is_active": p.is_active,
                "bundles": [serialize_bundle(b) for b in bundles],
            })
        return jsonify(result)

    data = request.get_json() or {}
    stock = data.get("stock")
    if stock is not None:
        try:
            stock = int(stock) if int(stock) > 0 else None
        except (ValueError, TypeError):
            stock = None

    image_url = _normalize_image(data.get("image", ""), folder="sanad/products")

    product = Product(
        category_id=data.get("category_id"), name=data.get("name"),
        description=data.get("description", ""), image=image_url,
        product_type=data.get("product_type", "quantity"),
        base_quantity=data.get("base_quantity", 0),
        base_price=data.get("base_price", 0.0),
        unit_name=(data.get("unit_name") or "قطعة").strip() or "قطعة",
        input_type=data.get("input_type", "id"),
        custom_input_label=data.get("custom_input_label", ""),
        stock=stock,
        max_quantity=data.get("max_quantity", 0),
        is_bundle=(data.get("product_type") == "bundle"),
        is_active=data.get("is_active", True),
    )
    db.session.add(product)
    db.session.flush()

    if product.product_type == "bundle":
        for b in data.get("bundles", []):
            name = (b.get("name") or "").strip()
            try:
                price = float(b.get("price_usd", 0))
                qty = int(b.get("quantity", 0))
            except (ValueError, TypeError):
                continue
            if not name or price <= 0:
                continue
            db.session.add(ProductBundle(
                product_id=product.id, name=name, quantity=qty, price_usd=price, is_active=True,
            ))

    log_admin_activity(f"إضافة منتج: {product.name}")
    db.session.commit()
    return jsonify({"id": product.id}), 201


@main.route("/admin/api/products/<int:product_id>", methods=["GET", "PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_product_actions(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404

    if request.method == "GET":
        bundles = ProductBundle.query.filter_by(product_id=product.id).order_by(ProductBundle.price_usd).all()
        return jsonify({
            "id": product.id, "category_id": product.category_id, "name": product.name,
            "description": product.description, "image": product.image,
            "product_type": product.product_type, "base_quantity": product.base_quantity,
            "base_price": product.base_price, "unit_name": product.unit_name or "قطعة",
            "input_type": product.input_type, "custom_input_label": product.custom_input_label,
            "stock": product.stock, "max_quantity": product.max_quantity,
            "is_bundle": product.is_bundle, "is_active": product.is_active,
            "bundles": [serialize_bundle(b) for b in bundles],
        })

    if request.method == "PUT":
        data = request.get_json() or {}
        ALLOWED = {"name", "description", "image", "category_id", "product_type",
                   "base_quantity", "base_price", "unit_name", "input_type",
                   "custom_input_label", "stock", "max_quantity", "is_bundle", "is_active"}
        for key, value in data.items():
            if key in ALLOWED and hasattr(product, key):
                if key == "stock":
                    try:
                        value = int(value) if value is not None and int(value) > 0 else None
                    except (ValueError, TypeError):
                        value = None
                if key == "unit_name":
                    value = (value or "قطعة").strip() or "قطعة"
                if key == "image":
                    value = _normalize_image(value, folder="sanad/products")
                setattr(product, key, value)

        if "bundles" in data:
            ProductBundle.query.filter_by(product_id=product.id).delete()
            for b in data.get("bundles", []):
                name = (b.get("name") or "").strip()
                try:
                    price = float(b.get("price_usd", 0))
                    qty = int(b.get("quantity", 0))
                except (ValueError, TypeError):
                    continue
                if not name or price <= 0:
                    continue
                db.session.add(ProductBundle(
                    product_id=product.id, name=name, quantity=qty, price_usd=price, is_active=True,
                ))
            product.is_bundle = (product.product_type == "bundle")

        log_admin_activity(f"تعديل المنتج: {product.name}")
        db.session.commit()
        return jsonify({"success": True, "message": "تم تعديل المنتج"})

    product_name = product.name
    product.is_active = False
    product.deleted_at = datetime.now(timezone.utc)
    log_admin_activity(f"أرشفة المنتج: {product_name}")
    db.session.commit()
    return jsonify({"success": True, "message": "تم أرشفة المنتج"})


@main.route("/admin/api/products/<int:product_id>/restore", methods=["POST"])
@jwt_required()
@handle_errors
def admin_restore_product(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404
    product.is_active = True
    product.deleted_at = None
    if product.category and not product.category.is_active:
        product.category.is_active = True
        product.category.deleted_at = None
    db.session.commit()
    return jsonify({"success": True, "message": "تم استرجاع المنتج"})


# ============================================================
# Bundles
# ============================================================
@main.route("/admin/api/products/<int:product_id>/bundles", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_bundles(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404

    if request.method == "GET":
        bundles = ProductBundle.query.filter_by(product_id=product_id).order_by(ProductBundle.price_usd).all()
        return jsonify([serialize_bundle(b) for b in bundles])

    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    try:
        price = float(data.get("price_usd", 0))
        qty = int(data.get("quantity", 0))
    except (ValueError, TypeError):
        return jsonify({"error": "بيانات غير صالحة"}), 400

    if not name or price <= 0:
        return jsonify({"error": "بيانات ناقصة"}), 400

    bundle = ProductBundle(product_id=product_id, name=name, quantity=qty, price_usd=price, is_active=True)
    db.session.add(bundle)
    db.session.commit()
    return jsonify(serialize_bundle(bundle)), 201


@main.route("/admin/api/products/<int:product_id>/bundles/<int:bundle_id>", methods=["PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_bundle_actions(product_id, bundle_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    bundle = ProductBundle.query.filter_by(id=bundle_id, product_id=product_id).first()
    if not bundle:
        return jsonify({"error": "باقة غير موجودة"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        if "name" in data and (data.get("name") or "").strip():
            bundle.name = data["name"].strip()
        if "quantity" in data:
            try: bundle.quantity = int(data["quantity"])
            except (ValueError, TypeError): pass
        if "price_usd" in data:
            try:
                p = float(data["price_usd"])
                if p > 0: bundle.price_usd = p
            except (ValueError, TypeError): pass
        if "is_active" in data:
            bundle.is_active = bool(data["is_active"])
        db.session.commit()
        return jsonify(serialize_bundle(bundle))

    db.session.delete(bundle)
    db.session.commit()
    return jsonify({"success": True})


# ============================================================
# Archive
# ============================================================
@main.route("/admin/api/archive", methods=["GET"])
@jwt_required()
@handle_errors
def admin_archive():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    archived_cats = Category.query.filter_by(is_active=False).order_by(Category.name).all()
    archived_prods = Product.query.filter_by(is_active=False).order_by(Product.name).all()

    return jsonify({
        "categories": [{
            "id": c.id, "name": c.name, "description": c.description,
            "image": c.image, "display_order": c.display_order,
        } for c in archived_cats],
        "products": [{
            "id": p.id, "name": p.name, "description": p.description,
            "image": p.image, "category_id": p.category_id,
            "category_name": (Category.query.get(p.category_id).name if Category.query.get(p.category_id) else "قسم محذوف"),
            "base_price": p.base_price, "base_quantity": p.base_quantity,
            "product_type": p.product_type, "unit_name": p.unit_name or "قطعة",
        } for p in archived_prods],
    })


# ============================================================
# Payment Methods
# ============================================================
@main.route("/admin/api/payment-methods", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_payment_methods():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        methods = PaymentMethod.query.filter_by(is_active=True).all()
        return jsonify([{
            "id": m.id, "name": m.name, "description": m.description,
            "account_name": m.account_name, "account": m.account,
            "icon": m.icon, "qr_image": m.qr_image,
            "min_amount": m.min_amount, "fee": m.fee,
            "requires_kyc": m.requires_kyc, "is_active": m.is_active,
        } for m in methods])

    data = request.get_json() or {}
    icon_url = _normalize_image(data.get("icon", ""), folder="sanad/payment-methods")
    qr_url = _normalize_image(data.get("qr_image", ""), folder="sanad/qr-codes")

    method = PaymentMethod(
        name=data.get("name"), description=data.get("description", ""),
        account_name=data.get("account_name", ""), account=data.get("account", ""),
        icon=icon_url, qr_image=qr_url,
        min_amount=data.get("min_amount", 0), fee=data.get("fee", 0),
        requires_kyc=data.get("requires_kyc", False), is_active=data.get("is_active", True),
    )
    db.session.add(method)
    log_admin_activity(f"إضافة طريقة دفع: {method.name}")
    db.session.commit()
    return jsonify({"id": method.id}), 201


@main.route("/admin/api/payment-methods/<int:method_id>", methods=["DELETE"])
@jwt_required()
@handle_errors
def admin_delete_payment_method(method_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    method = PaymentMethod.query.get(method_id)
    if not method:
        return jsonify({"error": "غير موجودة"}), 404
    method.is_active = False
    method.deleted_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"success": True})


# ============================================================
# Orders
# ============================================================
@main.route("/admin/api/orders", methods=["GET"])
@jwt_required()
@handle_errors
def admin_orders():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    orders = Order.query.order_by(Order.created_at.desc()).all()
    result = []
    for o in orders:
        product = Product.query.get(o.product_id)
        user = User.query.get(o.user_id)
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
    return jsonify(result)


@main.route("/admin/api/orders/<int:order_id>", methods=["GET"])
@jwt_required()
@handle_errors
def admin_order_detail(order_id):
    if not is_admin_user(get_jwt_identity()):
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


@main.route("/admin/api/orders/<int:order_id>/full", methods=["GET"])
@jwt_required()
@handle_errors
def admin_order_full_detail(order_id):
    """تفاصيل طلب كامل — للمودال الجديد"""
    if not is_admin_user(get_jwt_identity()):
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
            "balance": user.balance if user else None,
            "kyc_status": user.kyc_status if user else None,
        } if user else None,
        "product": {
            "id": product.id if product else None,
            "name": product.name if product else "منتج محذوف",
            "image": product.image if product else None,
            "product_type": product.product_type if product else None,
            "unit_name": product.unit_name if product else "قطعة",
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


@main.route("/admin/api/orders/<int:order_id>/status", methods=["POST"])
@jwt_required()
@handle_errors
def admin_update_order_status(order_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    new_status = data.get("status")
    order = Order.query.get(order_id)
    if not order:
        return jsonify({"error": "طلب غير موجود"}), 404

    valid = {
        "pending": ["review", "failed", "cancelled"],
        "review": ["processing", "failed"],
        "processing": ["completed", "failed"],
    }
    if order.status in valid and new_status not in valid[order.status]:
        return jsonify({"error": f"لا يمكن الانتقال من {order.status} إلى {new_status}"}), 400
    if order.status in ["completed", "failed", "cancelled"]:
        return jsonify({"error": "لا يمكن تغيير هذا الطلب"}), 400

    old_status = order.status
    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)

    if new_status == "cancelled":
        order.cancelled_at = datetime.now(timezone.utc)
    elif new_status == "completed":
        order.completed_at = datetime.now(timezone.utc)
    elif new_status == "failed":
        order.failed_at = datetime.now(timezone.utc)

    user = User.query.get(order.user_id)

    if new_status == "failed" and old_status != "failed" and user:
        balance_before = user.balance
        user.balance = round(user.balance + order.total_price, 2)
        db.session.add(Transaction(
            user_id=user.id, type="refund", amount=order.total_price,
            balance_after=user.balance, reference_type="order_refund", reference_id=order.id,
        ))
        log_financial(
            user=user, action="order_refund", amount=order.total_price,
            balance_before=balance_before, balance_after=user.balance,
            ref_type="order", ref_id=order.id, note="استرداد بسبب فشل الطلب",
        )
        product = Product.query.get(order.product_id)
        if product and product.stock is not None:
            product.stock += order.quantity
        db.session.add(Notification(
            user_id=user.id, title="استرداد مبلغ",
            message=f"تم استرداد {order.total_price:.2f}$ لطلبك {order.order_number}",
            type="success",
        ))
        send_order_refund_failed(user, order.total_price, order.order_number)

    if new_status == "cancelled" and old_status != "cancelled" and user:
        balance_before = user.balance
        user.balance = round(user.balance + order.total_price, 2)
        db.session.add(Transaction(
            user_id=user.id, type="refund", amount=order.total_price,
            balance_after=user.balance, reference_type="order_cancel", reference_id=order.id,
        ))
        log_financial(
            user=user, action="order_cancelled", amount=order.total_price,
            balance_before=balance_before, balance_after=user.balance,
            ref_type="order", ref_id=order.id,
        )
        product = Product.query.get(order.product_id)
        if product and product.stock is not None:
            product.stock += order.quantity
        send_order_refund_cancelled(user, order.total_price, order.order_number)

    log_admin_activity(f"تغيير حالة الطلب {order.order_number} إلى {get_arabic_status(new_status)}")
    db.session.commit()

    notify_admins(f"طلب {order.order_number} → {get_arabic_status(new_status)}")
    return jsonify({"status": order.status})


@main.route("/admin/api/orders/bulk-status", methods=["POST"])
@jwt_required()
@handle_errors
def admin_bulk_order_status():
    """تحديث حالة عدة طلبات دفعة واحدة"""
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    data = request.get_json() or {}
    order_ids = data.get("order_ids", [])
    new_status = data.get("status")

    if not order_ids or not new_status:
        return jsonify({"error": "بيانات ناقصة"}), 400

    if len(order_ids) > 100:
        return jsonify({"error": "الحد الأقصى 100 طلب"}), 400

    valid_transitions = {
        "pending": ["review", "failed", "cancelled"],
        "review": ["processing", "failed"],
        "processing": ["completed", "failed"],
    }

    success = []
    failed = []

    for oid in order_ids:
        order = Order.query.get(oid)
        if not order:
            failed.append({"id": oid, "reason": "غير موجود"})
            continue

        if order.status in ["completed", "failed", "cancelled"]:
            failed.append({"id": oid, "reason": f"الحالة {order.status}"})
            continue

        allowed = valid_transitions.get(order.status, [])
        if new_status not in allowed:
            failed.append({"id": oid, "reason": f"لا يمكن {order.status} → {new_status}"})
            continue

        old_status = order.status
        order.status = new_status
        order.updated_at = datetime.now(timezone.utc)

        if new_status == "cancelled":
            order.cancelled_at = datetime.now(timezone.utc)
        elif new_status == "completed":
            order.completed_at = datetime.now(timezone.utc)
        elif new_status == "failed":
            order.failed_at = datetime.now(timezone.utc)

        user = User.query.get(order.user_id)
        if new_status in ["failed", "cancelled"] and user and old_status not in ["failed", "cancelled"]:
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
            product = Product.query.get(order.product_id)
            if product and product.stock is not None:
                product.stock += order.quantity

        success.append(oid)

    log_admin_activity(f"تحديث جماعي: {len(success)} طلب → {get_arabic_status(new_status)}")
    db.session.commit()

    return jsonify({
        "success_count": len(success),
        "failed_count": len(failed),
        "success_ids": success,
        "failed": failed,
    })


# ============================================================
# Deposits
# ============================================================
@main.route("/admin/api/deposits", methods=["GET"])
@jwt_required()
@handle_errors
def admin_deposits():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposits = Deposit.query.order_by(Deposit.created_at.desc()).all()
    result = []
    for d in deposits:
        user = User.query.get(d.user_id)
        result.append({
            "id": d.id, "user_id": d.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": (user.first_name or user.username) if user else None,
            "amount": d.amount, "method": d.method, "method_id": d.method_id,
            "proof_image": get_signed_url(d.proof_image, expires_in=1800) if d.proof_image else None,
            "status": d.status, "transaction_id": d.transaction_id,
            "admin_note": d.admin_note,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return jsonify(result)


@main.route("/admin/api/deposits/<int:deposit_id>", methods=["GET"])
@jwt_required()
@handle_errors
def admin_deposit_detail(deposit_id):
    """تفاصيل إيداع كامل — للمودال الجديد"""
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404

    user = User.query.get(deposit.user_id)
    method_obj = PaymentMethod.query.get(deposit.method_id) if deposit.method_id else None

    return jsonify({
        "id": deposit.id,
        "transaction_id": deposit.transaction_id,
        "user": {
            "id": user.id if user else None,
            "telegram_id": user.telegram_id if user else None,
            "first_name": user.first_name if user else None,
            "last_name": user.last_name if user else None,
            "username": user.username if user else None,
            "balance": user.balance if user else None,
            "kyc_status": user.kyc_status if user else None,
        } if user else None,
        "amount": deposit.amount,
        "currency": deposit.currency,
        "method": deposit.method,
        "method_name": method_obj.name if method_obj else deposit.method,
        "method_account": method_obj.account if method_obj else None,
        "method_account_name": method_obj.account_name if method_obj else None,
        "sender_name": deposit.sender_name,
        "account_number": deposit.account_number,
        "txid": deposit.txid,
        "proof_image": get_signed_url(deposit.proof_image, expires_in=1800) if deposit.proof_image else None,
        "status": deposit.status,
        "admin_note": deposit.admin_note,
        "reviewed_by": deposit.reviewed_by,
        "reviewed_at": deposit.reviewed_at.isoformat() if deposit.reviewed_at else None,
        "created_at": deposit.created_at.isoformat() if deposit.created_at else None,
    })


@main.route("/admin/api/deposits/<int:deposit_id>/approve", methods=["POST"])
@jwt_required()
@handle_errors
def admin_approve_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    deposit.status = "approved"
    deposit.reviewed_at = datetime.now(timezone.utc)
    user = User.query.get(deposit.user_id)

    paid_debt = 0.0
    added_amount = round(deposit.amount, 2)

    if user:
        balance_before = round(user.balance, 2)
        current = round(user.balance, 2)
        dep_amount = round(deposit.amount, 2)

        if current < 0:
            debt = abs(current)
            if dep_amount >= debt:
                paid_debt = round(debt, 2)
                added_amount = round(dep_amount - debt, 2)
                user.balance = added_amount
            else:
                paid_debt = dep_amount
                added_amount = 0.0
                user.balance = round(current + dep_amount, 2)
        else:
            user.balance = round(current + dep_amount, 2)
            added_amount = dep_amount

        user.balance = round(user.balance, 2)

        db.session.add(Transaction(
            user_id=user.id, type="deposit", amount=dep_amount,
            balance_after=user.balance, reference_type="deposit", reference_id=deposit.id,
        ))
        log_financial(
            user=user, action="deposit_approved", amount=dep_amount,
            balance_before=balance_before, balance_after=user.balance,
            ref_type="deposit", ref_id=deposit.id,
        )
        db.session.add(Notification(
            user_id=user.id, title="إيداع مقبول",
            message=f"تم قبول إيداعك بقيمة {dep_amount:.2f}$", type="success",
        ))
        send_deposit_approved(user, dep_amount, paid_debt, added_amount)

    log_admin_activity(f"قبول إيداع {deposit.id}")
    db.session.commit()
    notify_admins(f"إيداع {deposit.id}: {deposit.amount:.2f}$")
    return jsonify({"status": deposit.status, "paid_debt": paid_debt, "added": added_amount})


@main.route("/admin/api/deposits/<int:deposit_id>/reject", methods=["POST"])
@jwt_required()
@handle_errors
def admin_reject_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    data = request.get_json() or {}
    reason = data.get("reason", "")

    deposit.status = "rejected"
    deposit.reviewed_at = datetime.now(timezone.utc)
    if reason:
        deposit.admin_note = reason

    user = User.query.get(deposit.user_id)
    if user:
        db.session.add(Notification(
            user_id=user.id, title="إيداع مرفوض",
            message=f"تم رفض إيداعك بقيمة {deposit.amount:.2f}$" + (f" - {reason}" if reason else ""),
            type="warning",
        ))

    log_admin_activity(f"رفض إيداع {deposit.id}")
    db.session.commit()

    if user:
        send_deposit_rejected(user, deposit.amount, reason)

    notify_admins(f"رفض إيداع {deposit.id}: {deposit.amount:.2f}$")
    return jsonify({"status": deposit.status})


# ============================================================
# KYC
# ============================================================
@main.route("/admin/api/kyc", methods=["GET"])
@jwt_required()
@handle_errors
def admin_kyc():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kycs = KYCRequest.query.order_by(KYCRequest.submitted_at.desc()).all()
    return jsonify([{
        "id": k.id, "user_id": k.user_id, "full_name": k.full_name,
        "phone": k.phone, "address": k.address,
        "selfie_image": get_signed_url(k.selfie_image, expires_in=1800) if k.selfie_image else None,
        "status": k.status,
        "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
    } for k in kycs])


@main.route("/admin/api/kyc/<int:kyc_id>/approve", methods=["POST"])
@jwt_required()
@handle_errors
def admin_approve_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.get(kyc_id)
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404

    kyc.status = "approved"
    kyc.reviewed_at = datetime.now(timezone.utc)
    user = User.query.get(kyc.user_id)
    if user:
        user.kyc_status = "verified"
        user.is_verified = True
        db.session.add(Notification(
            user_id=user.id, title="تم توثيق حسابك",
            message="تم قبول طلب التوثيق", type="success",
        ))

    log_admin_activity(f"قبول KYC للمستخدم {kyc.user_id}")
    db.session.commit()

    if user:
        send_kyc_approved(user)

    notify_admins(f"KYC {kyc.user_id}")
    return jsonify({"status": "approved"})


@main.route("/admin/api/kyc/<int:kyc_id>/reject", methods=["POST"])
@jwt_required()
@handle_errors
def admin_reject_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.get(kyc_id)
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404

    data = request.get_json() or {}
    reason = data.get("reason", "")

    kyc.status = "rejected"
    kyc.reviewed_at = datetime.now(timezone.utc)
    if reason:
        kyc.admin_note = reason

    user = User.query.get(kyc.user_id)
    if user:
        user.kyc_status = "unverified"
        user.is_verified = False
        db.session.add(Notification(
            user_id=user.id, title="رفض التوثيق",
            message="تم رفض طلب التوثيق" + (f" - {reason}" if reason else ""),
            type="warning",
        ))

    log_admin_activity(f"رفض KYC للمستخدم {kyc.user_id}")
    db.session.commit()

    if user:
        send_kyc_rejected(user, reason)

    notify_admins(f"رفض KYC {kyc.user_id}")
    return jsonify({"status": "rejected"})


# ============================================================
# Notifications
# ============================================================
@main.route("/admin/api/notifications", methods=["POST"])
@jwt_required()
@handle_errors
def admin_send_notification():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    target = data.get("target", "all")
    title = data.get("title", "إشعار")
    message = data.get("message", "")
    ntype = data.get("type", "info")

    if target == "all":
        for u in User.query.all():
            db.session.add(Notification(user_id=u.id, title=title, message=message, type=ntype))
    else:
        uid = data.get("user_id")
        if uid:
            db.session.add(Notification(user_id=uid, title=title, message=message, type=ntype))

    db.session.commit()
    return jsonify({"success": True})


# ============================================================
# Service Requests
# ============================================================
@main.route("/admin/api/service-requests", methods=["GET"])
@jwt_required()
@handle_errors
def admin_service_requests():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    reqs = ServiceRequest.query.order_by(ServiceRequest.created_at.desc()).all()
    return jsonify([{
        "id": r.id, "user_id": r.user_id, "service_name": r.service_name,
        "description": r.description, "estimated_price": r.estimated_price,
        "status": r.status, "admin_response": r.admin_response,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in reqs])


@main.route("/admin/api/service-requests/<int:req_id>", methods=["PUT"])
@jwt_required()
@handle_errors
def admin_update_service_request(req_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    req = ServiceRequest.query.get(req_id)
    if not req:
        return jsonify({"error": "غير موجود"}), 404
    if "status" in data: req.status = data["status"]
    if "admin_response" in data: req.admin_response = data["admin_response"]
    db.session.commit()
    return jsonify({"success": True})


# ============================================================
# Settings
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
    return jsonify({"success": True})


# ============================================================
# Coupons
# ============================================================
@main.route("/admin/api/coupons", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_coupons():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        coupons = Coupon.query.order_by(Coupon.created_at.desc()).all()
        return jsonify([{
            "id": c.id, "code": c.code, "description": c.description,
            "discount_type": c.discount_type, "discount_value": c.discount_value,
            "min_amount": c.min_amount, "max_discount": c.max_discount,
            "max_uses": c.max_uses, "used_count": c.used_count,
            "expires_at": c.expires_at.isoformat() if c.expires_at else None,
            "is_active": c.is_active,
        } for c in coupons])

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
        return jsonify({"success": True})

    CouponUsage.query.filter_by(coupon_id=coupon.id).delete()
    db.session.delete(coupon)
    db.session.commit()
    return jsonify({"success": True})


# ============================================================
# Referrals, Activities, Audit
# ============================================================
@main.route("/admin/api/referrals", methods=["GET"])
@jwt_required()
@handle_errors
def admin_referrals():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    referrals = Referral.query.order_by(Referral.created_at.desc()).limit(200).all()
    result = []
    for r in referrals:
        referrer = User.query.get(r.referrer_id)
        referred = User.query.get(r.referred_user_id)
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
    return jsonify(result)


@main.route("/admin/api/activities", methods=["GET"])
@jwt_required()
@handle_errors
def admin_activities():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    acts = AdminActivity.query.order_by(AdminActivity.created_at.desc()).limit(200).all()
    return jsonify([{
        "id": a.id, "admin_id": a.admin_id, "action": a.action,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in acts])


@main.route("/admin/api/audit-log", methods=["GET"])
@jwt_required()
@handle_errors
def admin_audit_log():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    user_id = request.args.get("user_id", type=int)
    action = request.args.get("action")
    limit = min(int(request.args.get("limit", 100)), 500)

    q = FinancialAuditLog.query
    if user_id: q = q.filter_by(user_id=user_id)
    if action: q = q.filter_by(action=action)
    logs = q.order_by(FinancialAuditLog.created_at.desc()).limit(limit).all()

    return jsonify([{
        "id": l.id, "user_id": l.user_id, "action": l.action,
        "amount": l.amount, "balance_before": l.balance_before, "balance_after": l.balance_after,
        "reference_type": l.reference_type, "reference_id": l.reference_id,
        "admin_id": l.admin_id, "ip_address": l.ip_address, "note": l.note,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in logs])