import os
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
    Transaction, Coupon, CouponUsage, Referral, FinancialAuditLog, log_financial
)
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification, notify_admins
from .. import limiter

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD_HASH = os.getenv("ADMIN_PASSWORD_HASH")
if not ADMIN_PASSWORD_HASH:
    raise RuntimeError("❌ ADMIN_PASSWORD_HASH إلزامي")


# ============================================================
# ============ OTP Sessions ============
# ============================================================
_otp_sessions = {}
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


def cleanup_expired_sessions():
    now = time.time()
    expired = [sid for sid, s in _otp_sessions.items() if now > s["expires"]]
    for sid in expired:
        _otp_sessions.pop(sid, None)


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
            print(f"❌ Error in {f.__name__}: {e}")
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
    except Exception as e:
        db.session.rollback()


def get_arabic_status(status):
    status_map = {
        "pending": "قيد المعالجة", "review": "قيد المراجعة", "processing": "قيد التنفيذ",
        "completed": "مكتمل", "failed": "فشل", "cancelled": "ملغي",
        "approved": "مقبول", "rejected": "مرفوض"
    }
    return status_map.get(status, status)


# ============================================================
# ============ Authentication ============
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

    cleanup_expired_sessions()
    otp_code = generate_otp_code()
    session_id = uuid.uuid4().hex

    _otp_sessions[session_id] = {
        "code": otp_code,
        "expires": time.time() + OTP_TTL_SECONDS,
        "attempts": 0,
    }

    sent_count = 0
    for admin_id in get_admin_ids():
        success = send_telegram_notification(
            admin_id,
            f"🔐 رمز التحقق للدخول إلى لوحة التحكم\n\n"
            f"الرمز: {otp_code}\n\n"
            f"⏱️ صالح لمدة 5 دقائق فقط."
        )
        if success:
            sent_count += 1

    if sent_count == 0:
        _otp_sessions.pop(session_id, None)
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

    cleanup_expired_sessions()
    session = _otp_sessions.get(session_id)
    if not session:
        return jsonify({"error": "انتهت الجلسة"}), 400

    if time.time() > session["expires"]:
        _otp_sessions.pop(session_id, None)
        return jsonify({"error": "انتهت صلاحية الرمز"}), 400

    if session["attempts"] >= OTP_MAX_ATTEMPTS:
        _otp_sessions.pop(session_id, None)
        return jsonify({"error": "تجاوزت عدد المحاولات"}), 400

    if session["code"] != otp_code:
        session["attempts"] += 1
        remaining = OTP_MAX_ATTEMPTS - session["attempts"]
        return jsonify({"error": f"رمز خاطئ. محاولات متبقية: {remaining}"}), 401

    _otp_sessions.pop(session_id, None)
    token = create_access_token(identity="admin")
    log_admin_activity("تسجيل دخول الأدمن (مع OTP)")
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()

    return jsonify({"token": token}), 200


# ============================================================
# ============ Activities & Audit ============
# ============================================================
@main.route("/admin/api/activities", methods=["GET"])
@jwt_required()
@handle_errors
def admin_activities():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    activities = AdminActivity.query.order_by(AdminActivity.created_at.desc()).limit(200).all()
    return jsonify([{
        "id": a.id, "admin_id": a.admin_id, "action": a.action,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in activities])


@main.route("/admin/api/audit-log", methods=["GET"])
@jwt_required()
@handle_errors
def admin_audit_log():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    user_id = request.args.get("user_id", type=int)
    action = request.args.get("action")
    limit = min(int(request.args.get("limit", 100)), 500)

    query = FinancialAuditLog.query
    if user_id:
        query = query.filter_by(user_id=user_id)
    if action:
        query = query.filter_by(action=action)

    logs = query.order_by(FinancialAuditLog.created_at.desc()).limit(limit).all()

    return jsonify([{
        "id": l.id, "user_id": l.user_id, "action": l.action,
        "amount": l.amount, "balance_before": l.balance_before, "balance_after": l.balance_after,
        "reference_type": l.reference_type, "reference_id": l.reference_id,
        "admin_id": l.admin_id, "ip_address": l.ip_address, "note": l.note,
        "created_at": l.created_at.isoformat() if l.created_at else None,
    } for l in logs])


# ============================================================
# ============ Users ============
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
        "balance": u.balance, "kyc_status": u.kyc_status,
        "is_verified": u.is_verified, "role": u.role,
        "is_banned": u.is_banned, "vip_level": u.vip_level,
        "referral_code": u.referral_code,
        "referral_count": u.referral_count or 0,
        "referral_earnings": u.referral_earnings or 0,
        # 🆕 الرصيد السالب
        "allow_negative_balance": u.allow_negative_balance if u.allow_negative_balance is not None else True,
        "max_negative_balance": u.max_negative_balance or 0,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users])


# ============================================================
# ============ 🆕 Negative Balance ============
# ============================================================
@main.route("/admin/api/users/<int:user_id>/negative-balance", methods=["POST"])
@jwt_required()
@handle_errors
def admin_set_negative_balance(user_id):
    """تفعيل/تعديل الرصيد السالب لمستخدم"""
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    data = request.get_json() or {}
    allow = bool(data.get("allow", False))
    max_neg = float(data.get("max_negative", 0))

    if max_neg < 0:
        return jsonify({"error": "الحد الأقصى لا يمكن أن يكون سالباً"}), 400
    if max_neg > 10000:
        return jsonify({"error": "الحد الأقصى هو $10,000"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    user.allow_negative_balance = allow
    user.max_negative_balance = max_neg

    log_admin_activity(
        f"{'تفعيل' if allow else 'إلغاء'} الرصيد السالب للمستخدم {user.telegram_id} "
        f"(حد: ${max_neg})"
    )
    db.session.commit()

    notify_admins(
        f"💰 تم {'تفعيل' if allow else 'إلغاء'} الرصيد السالب\n"
        f"المستخدم: {user.telegram_id}\n"
        f"الحد الأقصى: ${max_neg}"
    )

    return jsonify({
        "allow_negative_balance": user.allow_negative_balance,
        "max_negative_balance": user.max_negative_balance,
    })


# ============================================================
# ============ User Actions ============
# ============================================================
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

    log_admin_activity(f"تغيير توثيق المستخدم {user.telegram_id} إلى {new_status}")
    db.session.commit()
    notify_admins(f"🔄 تم تغيير حالة توثيق المستخدم {user.telegram_id} إلى {new_status}")
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

    if abs(amount) > 10000:
        return jsonify({"error": "الحد الأقصى للتعديل 10000$ لكل عملية"}), 400
    if amount == 0:
        return jsonify({"error": "المبلغ لا يمكن أن يكون صفراً"}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    balance_before = user.balance
    user.balance += amount

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
        message=f"تم تعديل رصيدك بمقدار {amount}$" + (f" ({note})" if note else ""),
        type="info",
    )
    db.session.add(notif)

    log_admin_activity(f"تعديل رصيد المستخدم {user.telegram_id} بمقدار {amount}$")
    db.session.commit()

    send_telegram_notification(user.telegram_id, f"تم تعديل رصيدك بمقدار {amount}$")
    notify_admins(f"💵 تم تعديل رصيد المستخدم {user.telegram_id} بمقدار {amount}$")

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
    log_admin_activity(f"تغيير حظر المستخدم {user.telegram_id} إلى {user.is_banned}")
    db.session.commit()
    notify_admins(f"🚫 تم تغيير حالة الحظر للمستخدم {user.telegram_id} إلى {user.is_banned}")
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
        return jsonify({"error": "مستوى VIP يجب أن يكون بين 0 و 7"}), 400
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404
    user.vip_level = vip_level
    log_admin_activity(f"تعيين VIP{vip_level} للمستخدم {user.telegram_id}")
    db.session.commit()
    notify_admins(f"⭐ تم تغيير VIP المستخدم {user.telegram_id} إلى {vip_level}")
    return jsonify({"vip_level": user.vip_level})


# ============================================================
# ============ Categories ============
# ============================================================
@main.route("/admin/api/categories", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_categories():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        categories = Category.query.filter_by(is_active=True).order_by(Category.order).all()
        return jsonify([{
            "id": c.id, "name": c.name, "description": c.description,
            "image": c.image, "is_active": c.is_active, "order": c.order,
        } for c in categories])

    data = request.get_json() or {}
    cat = Category(
        name=data.get("name"), description=data.get("description", ""),
        image=data.get("image", ""), is_active=data.get("is_active", True),
        order=data.get("order", 0),
    )
    db.session.add(cat)
    log_admin_activity(f"إضافة قسم: {cat.name}")
    db.session.commit()
    notify_admins(f"🗂️ تم إضافة قسم جديد: {cat.name}")
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
    products = Product.query.filter_by(category_id=cat_id).all()
    for product in products:
        product.is_active = False

    log_admin_activity(f"أرشفة قسم: {cat_name} ({len(products)} منتج)")
    db.session.commit()
    notify_admins(f"📦 تم أرشفة القسم: {cat_name}")
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
    products = Product.query.filter_by(category_id=cat_id).all()
    for product in products:
        product.is_active = True
    log_admin_activity(f"استرجاع قسم: {cat.name}")
    db.session.commit()
    notify_admins(f"♻️ تم استرجاع القسم: {cat.name}")
    return jsonify({"success": True, "message": f"تم استرجاع القسم و{len(products)} منتج"})


# ============================================================
# ============ Products ============
# ============================================================
@main.route("/admin/api/products", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_products():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        products = Product.query.filter_by(is_active=True).all()
        return jsonify([{
            "id": p.id, "category_id": p.category_id, "name": p.name,
            "description": p.description, "image": p.image,
            "product_type": p.product_type, "base_quantity": p.base_quantity,
            "base_price": p.base_price, "unit_name": p.unit_name,
            "input_type": p.input_type, "custom_input_label": p.custom_input_label,
            "stock": p.stock, "max_quantity": p.max_quantity,
            "is_bundle": p.is_bundle, "is_active": p.is_active,
        } for p in products])

    data = request.get_json() or {}
    product = Product(
        category_id=data.get("category_id"), name=data.get("name"),
        description=data.get("description", ""), image=data.get("image", ""),
        product_type=data.get("product_type", "quantity"),
        base_quantity=data.get("base_quantity", 0),
        base_price=data.get("base_price", 0.0),
        unit_name=data.get("unit_name", "قطعة"),
        input_type=data.get("input_type", "id"),
        custom_input_label=data.get("custom_input_label", ""),
        stock=data.get("stock", 0), max_quantity=data.get("max_quantity", 0),
        is_bundle=data.get("is_bundle", False), is_active=data.get("is_active", True),
    )
    db.session.add(product)
    log_admin_activity(f"إضافة منتج: {product.name}")
    db.session.commit()
    notify_admins(f"📦 تم إضافة منتج جديد: {product.name}")
    return jsonify({"id": product.id}), 201


@main.route("/admin/api/products/<int:product_id>", methods=["PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_product_actions(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    product = Product.query.get(product_id)
    if not product:
        return jsonify({"error": "منتج غير موجود"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        ALLOWED_FIELDS = {
            "name", "description", "image", "category_id",
            "product_type", "base_quantity", "base_price", "unit_name",
            "input_type", "custom_input_label", "stock", "max_quantity",
            "is_bundle", "is_active",
        }
        for key, value in data.items():
            if key in ALLOWED_FIELDS and hasattr(product, key):
                setattr(product, key, value)
        log_admin_activity(f"تعديل المنتج: {product.name}")
        db.session.commit()
        notify_admins(f"✏️ تم تعديل المنتج: {product.name}")
        return jsonify({"success": True, "message": "تم تعديل المنتج"})

    product_name = product.name
    product.is_active = False
    log_admin_activity(f"أرشفة المنتج: {product_name}")
    db.session.commit()
    notify_admins(f"📦 تم أرشفة المنتج: {product_name}")
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
    category = Category.query.get(product.category_id)
    if category and not category.is_active:
        category.is_active = True
    log_admin_activity(f"استرجاع منتج: {product.name}")
    db.session.commit()
    notify_admins(f"♻️ تم استرجاع المنتج: {product.name}")
    return jsonify({"success": True, "message": "تم استرجاع المنتج"})


@main.route("/admin/api/products/<int:product_id>/bundles", methods=["GET", "POST"])
@jwt_required()
@handle_errors
def admin_bundles(product_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        bundles = ProductBundle.query.filter_by(product_id=product_id).all()
        return jsonify([{
            "id": b.id, "name": b.name, "quantity": b.quantity,
            "price_usd": b.price_usd, "is_active": b.is_active,
        } for b in bundles])

    data = request.get_json() or {}
    bundle = ProductBundle(
        product_id=product_id, name=data.get("name"),
        quantity=data.get("quantity"), price_usd=data.get("price_usd"),
        is_active=data.get("is_active", True),
    )
    db.session.add(bundle)
    log_admin_activity(f"إضافة باقة: {bundle.name}")
    db.session.commit()
    notify_admins(f"📦 تم إضافة باقة: {bundle.name}")
    return jsonify({"id": bundle.id}), 201


# ============================================================
# ============ Archive ============
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
            "image": c.image, "order": c.order,
        } for c in archived_cats],
        "products": [{
            "id": p.id, "name": p.name, "description": p.description,
            "image": p.image, "category_id": p.category_id,
            "category_name": (Category.query.get(p.category_id).name if Category.query.get(p.category_id) else "قسم محذوف"),
            "base_price": p.base_price, "base_quantity": p.base_quantity,
            "product_type": p.product_type,
        } for p in archived_prods],
    })


# ============================================================
# ============ Payment Methods ============
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
    method = PaymentMethod(
        name=data.get("name"), description=data.get("description", ""),
        account_name=data.get("account_name", ""), account=data.get("account", ""),
        icon=data.get("icon", ""), qr_image=data.get("qr_image", ""),
        min_amount=data.get("min_amount", 0), fee=data.get("fee", 0),
        requires_kyc=data.get("requires_kyc", False), is_active=data.get("is_active", True),
    )
    db.session.add(method)
    log_admin_activity(f"إضافة طريقة دفع: {method.name}")
    db.session.commit()
    notify_admins(f"💳 تم إضافة طريقة دفع: {method.name}")
    return jsonify({"id": method.id}), 201


@main.route("/admin/api/payment-methods/<int:method_id>", methods=["DELETE"])
@jwt_required()
@handle_errors
def admin_delete_payment_method(method_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    method = PaymentMethod.query.get(method_id)
    if not method:
        return jsonify({"error": "طريقة دفع غير موجودة"}), 404
    method_name = method.name
    method.is_active = False
    log_admin_activity(f"إخفاء طريقة دفع: {method_name}")
    db.session.commit()
    notify_admins(f"🗑️ تم إخفاء طريقة دفع: {method_name}")
    return jsonify({"success": True})


# ============================================================
# ============ Orders ============
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
        product_name = product.name if product else "منتج محذوف"
        result.append({
            "id": o.id, "order_number": o.order_number, "user_id": o.user_id,
            "product_id": o.product_id, "product_name": product_name,
            "product_type": product.product_type if product else None,
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
        "quantity": order.quantity, "unit_price": order.unit_price,
        "total_price": order.total_price, "discount_amount": order.discount_amount or 0,
        "coupon_code": order.coupon_code,
        "status": order.status, "status_arabic": get_arabic_status(order.status),
        "delivery_data": order.delivery_data,
        "created_at": order.created_at.isoformat() if order.created_at else None,
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

    creation_time = order.created_at
    if creation_time.tzinfo is None:
        creation_time = creation_time.replace(tzinfo=timezone.utc)
    elapsed = datetime.now(timezone.utc) - creation_time
    if elapsed < timedelta(seconds=120):
        return jsonify({"error": "لا يمكن تغيير حالة الطلب قبل مرور دقيقتين"}), 400

    if order.status == "pending" and new_status not in ["review", "failed", "cancelled"]:
        return jsonify({"error": "يمكن فقط الانتقال إلى قيد المراجعة أو فشل"}), 400
    elif order.status == "review" and new_status not in ["processing", "failed"]:
        return jsonify({"error": "يمكن فقط الانتقال إلى قيد التنفيذ أو فشل"}), 400
    elif order.status == "processing" and new_status not in ["completed", "failed"]:
        return jsonify({"error": "يمكن فقط الانتقال إلى مكتمل أو فشل"}), 400
    elif order.status in ["completed", "failed", "cancelled"]:
        return jsonify({"error": "لا يمكن تغيير حالة هذا الطلب"}), 400

    old_status = order.status
    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)

    user = User.query.get(order.user_id)

    if new_status == "failed" and old_status != "failed" and user:
        balance_before = user.balance
        user.balance += order.total_price
        txn = Transaction(
            user_id=user.id, type="refund", amount=order.total_price,
            balance_after=user.balance, reference_type="order_refund", reference_id=order.id,
        )
        db.session.add(txn)

        log_financial(
            user=user, action="order_refund", amount=order.total_price,
            balance_before=balance_before, balance_after=user.balance,
            ref_type="order", ref_id=order.id, note="استرداد بسبب فشل الطلب",
        )

        notif = Notification(
            user_id=user.id, title="استرداد مبلغ",
            message=f"تم استرداد مبلغ {order.total_price}$ لطلبك {order.order_number}",
            type="success",
        )
        db.session.add(notif)

    log_admin_activity(f"تغيير حالة الطلب {order.order_number} إلى {get_arabic_status(new_status)}")

    if user:
        status_arabic = get_arabic_status(new_status)
        notif = Notification(
            user_id=user.id, title="تحديث حالة الطلب",
            message=f"طلبك {order.order_number} أصبح {status_arabic}",
            type="info",
        )
        db.session.add(notif)

    db.session.commit()

    if user:
        status_arabic = get_arabic_status(new_status)
        if new_status == "failed" and old_status != "failed":
            send_telegram_notification(user.telegram_id, f"تم استرداد مبلغ {order.total_price}$ لطلبك {order.order_number}")
        send_telegram_notification(user.telegram_id, f"طلبك {order.order_number} أصبح {status_arabic}")

    notify_admins(f"🔄 طلب {order.order_number} أصبح {get_arabic_status(new_status)}")
    return jsonify({"status": order.status, "message": f"تم تحديث الحالة إلى {get_arabic_status(new_status)}"})


# ============================================================
# ============ Deposits ============
# ============================================================
@main.route("/admin/api/deposits", methods=["GET"])
@jwt_required()
@handle_errors
def admin_deposits():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposits = Deposit.query.order_by(Deposit.created_at.desc()).all()
    return jsonify([{
        "id": d.id, "user_id": d.user_id, "amount": d.amount,
        "method": d.method, "proof_image": d.proof_image,
        "status": d.status, "transaction_id": d.transaction_id,
        "admin_note": d.admin_note,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    } for d in deposits])


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
        return jsonify({"error": "تمت معالجة هذا الإيداع مسبقاً"}), 400

    deposit.status = "approved"
    user = User.query.get(deposit.user_id)

    paid_debt = 0
    added_amount = deposit.amount

    if user:
        balance_before = user.balance
        # 🆕 خصم الدين أولاً
        if user.balance < 0:
            debt = abs(user.balance)
            if deposit.amount >= debt:
                # يسدد الدين كاملاً
                paid_debt = debt
                added_amount = deposit.amount - debt
                user.balance = added_amount
            else:
                # يسدد جزءاً من الدين
                paid_debt = deposit.amount
                added_amount = 0
                user.balance = user.balance + deposit.amount
        else:
            user.balance += deposit.amount
            added_amount = deposit.amount

        txn = Transaction(
            user_id=user.id, type="deposit", amount=deposit.amount,
            balance_after=user.balance, reference_type="deposit", reference_id=deposit.id,
        )
        db.session.add(txn)

        log_financial(
            user=user, action="deposit_approved", amount=deposit.amount,
            balance_before=balance_before, balance_after=user.balance,
            ref_type="deposit", ref_id=deposit.id,
            note=f"دفع دين: ${paid_debt}, إضافة: ${added_amount}" if paid_debt > 0 else None,
        )

        # رسالة مخصصة
        if paid_debt > 0 and added_amount > 0:
            msg = f"تم خصم {paid_debt:.2f}$ لسداد دينك، وإضافة {added_amount:.2f}$ لرصيدك"
        elif paid_debt > 0 and added_amount == 0:
            msg = f"تم خصم {paid_debt:.2f}$ لسداد دينك. الرصيد المتبقي: {user.balance:.2f}$"
        else:
            msg = f"تم قبول إيداعك بقيمة {deposit.amount}$"

        notif = Notification(
            user_id=user.id, title="إيداع مقبول",
            message=msg, type="success"
        )
        db.session.add(notif)

    log_admin_activity(f"قبول إيداع {deposit.id} بقيمة {deposit.amount}$")
    db.session.commit()

    if user:
        send_telegram_notification(user.telegram_id, f"✅ {msg if user and 'msg' in locals() else 'تم قبول إيداعك'}")

    notify_admins(
        f"✅ تم قبول إيداع بقيمة {deposit.amount}$\n"
        f"المستخدم: {deposit.user_id}\n"
        + (f"سداد دين: ${paid_debt}\nإضافة: ${added_amount}" if paid_debt > 0 else "")
    )
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
        return jsonify({"error": "تمت معالجة هذا الإيداع مسبقاً"}), 400

    data = request.get_json() or {}
    reason = data.get("reason", "")

    deposit.status = "rejected"
    if reason:
        deposit.admin_note = reason

    user = User.query.get(deposit.user_id)
    if user:
        notif = Notification(
            user_id=user.id, title="إيداع مرفوض",
            message=f"تم رفض إيداعك بقيمة {deposit.amount}$" + (f" - {reason}" if reason else ""),
            type="warning"
        )
        db.session.add(notif)

    log_admin_activity(f"رفض إيداع {deposit.id} بقيمة {deposit.amount}$")
    db.session.commit()

    if user:
        send_telegram_notification(user.telegram_id, f"تم رفض إيداعك بقيمة {deposit.amount}$")

    notify_admins(f"❌ تم رفض إيداع بقيمة {deposit.amount}$ للمستخدم {deposit.user_id}")
    return jsonify({"status": deposit.status})


# ============================================================
# ============ KYC ============
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
        "selfie_image": k.selfie_image, "status": k.status,
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
        notif = Notification(
            user_id=user.id, title="تم توثيق حسابك",
            message="تم قبول طلب التوثيق، حسابك موثق الآن", type="success"
        )
        db.session.add(notif)

    log_admin_activity(f"قبول توثيق المستخدم {kyc.user_id}")
    db.session.commit()

    if user:
        send_telegram_notification(user.telegram_id, "تم توثيق حسابك بنجاح")

    notify_admins(f"✅ تم قبول توثيق المستخدم {kyc.user_id}")
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
        notif = Notification(
            user_id=user.id, title="رفض التوثيق",
            message="تم رفض طلب التوثيق" + (f" - {reason}" if reason else ""),
            type="warning"
        )
        db.session.add(notif)

    log_admin_activity(f"رفض توثيق المستخدم {kyc.user_id}")
    db.session.commit()

    if user:
        send_telegram_notification(user.telegram_id, "تم رفض طلب التوثيق")

    notify_admins(f"❌ تم رفض توثيق المستخدم {kyc.user_id}")
    return jsonify({"status": "rejected"})


# ============================================================
# ============ Notifications ============
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
    notif_type = data.get("type", "info")

    if target == "all":
        users = User.query.all()
        for user in users:
            notif = Notification(user_id=user.id, title=title, message=message, type=notif_type)
            db.session.add(notif)
        log_admin_activity(f"إرسال إشعار جماعي: {title}")
    else:
        user_id = data.get("user_id")
        if user_id:
            notif = Notification(user_id=user_id, title=title, message=message, type=notif_type)
            db.session.add(notif)
            log_admin_activity(f"إرسال إشعار لمستخدم {user_id}: {title}")

    db.session.commit()
    return jsonify({"success": True})


# ============================================================
# ============ Service Requests ============
# ============================================================
@main.route("/admin/api/service-requests", methods=["GET"])
@jwt_required()
@handle_errors
def admin_service_requests():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    requests_q = ServiceRequest.query.order_by(ServiceRequest.created_at.desc()).all()
    return jsonify([{
        "id": r.id, "user_id": r.user_id, "service_name": r.service_name,
        "description": r.description, "estimated_price": r.estimated_price,
        "status": r.status, "admin_response": r.admin_response,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    } for r in requests_q])


@main.route("/admin/api/service-requests/<int:req_id>", methods=["PUT"])
@jwt_required()
@handle_errors
def admin_update_service_request(req_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    req = ServiceRequest.query.get(req_id)
    if not req:
        return jsonify({"error": "طلب غير موجود"}), 404
    req.status = data.get("status", req.status)
    req.admin_response = data.get("admin_response", req.admin_response)
    log_admin_activity(f"تحديث طلب الخدمة {req.id}")
    db.session.commit()
    notify_admins(f"🛠️ تم تحديث طلب الخدمة {req.id} إلى {req.status}")
    return jsonify({"success": True})


# ============================================================
# ============ Settings ============
# ============================================================
@main.route("/admin/api/settings", methods=["GET", "PUT"])
@jwt_required()
@handle_errors
def admin_settings():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    if request.method == "GET":
        settings = Setting.query.all()
        return jsonify({s.key: s.value for s in settings})

    data = request.get_json() or {}
    for key, value in data.items():
        setting = Setting.query.filter_by(key=key).first()
        if setting:
            setting.value = str(value)
        else:
            new_setting = Setting(key=key, value=str(value))
            db.session.add(new_setting)
    log_admin_activity("تحديث الإعدادات")
    db.session.commit()
    return jsonify({"success": True})


# ============================================================
# ============ Coupons ============
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
            "created_at": c.created_at.isoformat() if c.created_at else None,
        } for c in coupons])

    data = request.get_json() or {}
    code = (data.get("code") or "").strip().upper()
    if not code:
        return jsonify({"error": "أدخل كود الخصم"}), 400
    existing = Coupon.query.filter_by(code=code).first()
    if existing:
        return jsonify({"error": "الكود موجود بالفعل"}), 400

    expires_at = None
    if data.get("expires_at"):
        try:
            expires_at = datetime.fromisoformat(data.get("expires_at").replace("Z", "+00:00"))
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
    log_admin_activity(f"إضافة كود خصم: {coupon.code}")
    db.session.commit()
    notify_admins(f"🎟️ تم إضافة كود خصم جديد: {coupon.code}")
    return jsonify({"id": coupon.id}), 201


@main.route("/admin/api/coupons/<int:coupon_id>", methods=["PUT", "DELETE"])
@jwt_required()
@handle_errors
def admin_coupon_actions(coupon_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    coupon = Coupon.query.get(coupon_id)
    if not coupon:
        return jsonify({"error": "الكود غير موجود"}), 404

    if request.method == "PUT":
        data = request.get_json() or {}
        if "is_active" in data:
            coupon.is_active = bool(data["is_active"])
        if "description" in data:
            coupon.description = data["description"]
        if "discount_value" in data:
            coupon.discount_value = float(data["discount_value"])
        if "max_uses" in data:
            coupon.max_uses = int(data["max_uses"])
        log_admin_activity(f"تعديل كود خصم: {coupon.code}")
        db.session.commit()
        return jsonify({"success": True})

    code = coupon.code
    CouponUsage.query.filter_by(coupon_id=coupon.id).delete()
    db.session.delete(coupon)
    log_admin_activity(f"حذف كود خصم: {code}")
    db.session.commit()
    notify_admins(f"🗑️ تم حذف كود خصم: {code}")
    return jsonify({"success": True})


# ============================================================
# ============ Referrals ============
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