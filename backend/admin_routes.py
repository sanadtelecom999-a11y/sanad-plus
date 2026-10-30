from decimal import Decimal
from uuid import uuid4
import os, secrets, uuid, hashlib, json, requests
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import Blueprint, jsonify, request, g
from sqlalchemy.exc import IntegrityError
from werkzeug.security import check_password_hash

from app.extensions import db
from app.models import User, Order, Deposit, KYCRequest, AdminUser, AdminOperation, AdminAuditLog, AdminOTPSession, Product, Category, PaymentMethod, SupportTicket, SupportMessage
from app.services.ledger_service import record_transaction
from app.services.error_handler import diagnose_integrity_error
from app.decorators import rate_limit

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

JWT_SECRET = os.environ.get("JWT_SECRET", "")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    raise ValueError("CRITICAL: Weak or missing JWT_SECRET.")

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
OTP_TTL_MINUTES = 5
MAX_OTP_ATTEMPTS = 5

def _utcnow(): return datetime.now(timezone.utc)
def _generate_otp(): return "{:06d}".format(secrets.randbelow(1000000))

def log_admin_action(action, target_type, target_id, details=""):
    try:
        db.session.add(AdminAuditLog(admin_id=getattr(g, 'admin_id', 1), action=action, target_type=target_type, target_id=target_id, details=details))
    except Exception as e:
        print("Audit Log Error:", e, flush=True)

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing Auth"}), 401
        try:
            payload = jwt.decode(auth_header[7:].strip(), JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        admin_id = payload.get("admin_id")
        if not admin_id:
            return jsonify({"error": "Invalid token payload"}), 401
        admin = db.session.query(AdminUser).filter_by(id=admin_id, is_active=True).first()
        if not admin:
            return jsonify({"error": "Admin not found or disabled"}), 403
        g.admin_id = admin.id
        g.admin_role = admin.role
        return fn(*args, **kwargs)
    return wrapper

@admin_bp.route("/login", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=60)
def login():
    data = request.get_json(silent=True) or {}
    password = (data.get("password") or "").strip()
    if not password: return jsonify({"success": False, "error": "كلمة المرور مطلوبة"}), 400
    
    admin = db.session.query(AdminUser).filter_by(is_active=True).first()
    if not admin or not check_password_hash(admin.password_hash, password):
        return jsonify({"success": False, "error": "كلمة المرور غير صحيحة"}), 401
        
    session_id = str(uuid.uuid4())
    otp_code = _generate_otp()
    expires_at = _utcnow() + timedelta(minutes=OTP_TTL_MINUTES)
    
    db.session.add(AdminOTPSession(admin_id=admin.id, session_id=session_id, otp_code=otp_code, expires_at=expires_at))
    db.session.commit()
    
    bot_token = os.environ.get("BOT_TOKEN", "")
    admin_telegram_id = os.environ.get("ADMIN_TELEGRAM_ID", "")
    if not bot_token or not admin_telegram_id:
        return jsonify({"success": False, "error": "إعدادات الإشعار غير مكتملة"}), 500
        
    try:
        res = requests.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", json={"chat_id": admin_telegram_id, "text": f"رمز الدخول: {otp_code}"}, timeout=5)
        if res.status_code != 200: return jsonify({"success": False, "error": "فشل إرسال الرمز"}), 500
    except Exception:
        return jsonify({"success": False, "error": "فشل الاتصال بتيليجرام"}), 500
        
    return jsonify({"success": True, "require_otp": True, "session_id": session_id})

@admin_bp.route("/verify-otp", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=60)
def verify_otp():
    data = request.get_json(silent=True) or {}
    session_id = (data.get("session_id") or "").strip()
    otp_code = (data.get("otp_code") or "").strip()
    try:
        session = db.session.query(AdminOTPSession).filter_by(session_id=session_id).with_for_update().first()
        if not session: return jsonify({"success": False, "error": "جلسة غير صالحة"}), 400
        if session.expires_at.replace(tzinfo=timezone.utc) < _utcnow():
            db.session.delete(session)
            db.session.commit()
            return jsonify({"success": False, "error": "انتهت الصلاحية"}), 400
        if session.attempts >= MAX_OTP_ATTEMPTS:
            db.session.delete(session)
            db.session.commit()
            return jsonify({"success": False, "error": "عدد محاولات كبير"}), 429
        if session.otp_code != otp_code:
            session.attempts += 1
            db.session.commit()
            return jsonify({"success": False, "error": "رمز خاطئ"}), 400
            
        db.session.delete(session)
        db.session.commit()
        
        admin = db.session.query(AdminUser).filter_by(id=session.admin_id).first()
        now = _utcnow()
        token = jwt.encode({"sub": "admin", "admin_id": admin.id, "role": admin.role, "iat": now, "exp": now + timedelta(hours=JWT_EXPIRY_HOURS)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
        return jsonify({"token": token, "access_token": token})
    except Exception as e:
        print(f"VERIFY OTP ERROR: {str(e)}", flush=True)
        db.session.rollback()
        return jsonify({"error": "حدث خطأ داخلي"}), 500

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def stats():
    try:
        return jsonify({
            "total_users": db.session.query(User).count(),
            "total_orders": db.session.query(Order).count(),
            "total_deposits": db.session.query(Deposit).filter_by(status='approved').count(),
            "revenue": float(db.session.query(db.func.sum(Order.total_price)).filter_by(status='completed').scalar() or 0)
        })
    except Exception: return jsonify({"total_users": 0, "total_orders": 0, "total_deposits": 0, "revenue": 0.0})

@admin_bp.route("/inbox/counts", methods=["GET"])
@admin_required
def inbox_counts():
    try:
        return jsonify({
            "orders": db.session.query(Order).filter(Order.status.in_(['pending', 'معلق'])).count(),
            "deposits": db.session.query(Deposit).filter(Deposit.status.in_(['pending', 'معلق'])).count(),
            "kyc": db.session.query(KYCRequest).filter(KYCRequest.status.in_(['pending', 'معلق'])).count()
        })
    except Exception: return jsonify({"orders": 0, "deposits": 0, "kyc": 0})

@admin_bp.route("/orders", methods=["GET"])
@admin_required
def get_orders():
    try:
        orders = db.session.query(Order).filter(Order.status.in_(['pending', 'معلق'])).all()
        return jsonify([{"id": o.id, "order_number": o.order_number, "user_name": o.user.first_name if o.user else 'مستخدم', "product_name": o.product.name if o.product else 'منتج', "total_price": float(o.total_price), "status": o.status} for o in orders])
    except Exception: return jsonify([])

@admin_bp.route("/deposits", methods=["GET"])
@admin_required
def get_deposits():
    try:
        deposits = db.session.query(Deposit).filter(Deposit.status.in_(['pending', 'معلق'])).all()
        return jsonify([{"id": d.id, "amount": float(d.amount), "user_name": d.user.first_name if d.user else 'مستخدم', "transaction_id": d.transaction_id, "status": d.status} for d in deposits])
    except Exception: return jsonify([])

@admin_bp.route("/kyc", methods=["GET"])
@admin_required
def get_kyc():
    try:
        kycs = db.session.query(KYCRequest).filter(KYCRequest.status.in_(['pending', 'معلق'])).all()
        return jsonify([{"id": k.id, "full_name": k.full_name, "phone": k.phone, "user_name": k.user.first_name if k.user else 'مستخدم', "status": k.status} for k in kycs])
    except Exception: return jsonify([])

@admin_bp.route("/<string:item_type>/<int:item_id>/full", methods=["GET"])
@admin_required
def get_item_full(item_type, item_id):
    try:
        if item_type == 'orders':
            item = db.session.get(Order, item_id)
            if not item: return jsonify({"error": "غير موجود"}), 404
            return jsonify({"id": item.id, "title": f"طلب #{item.id}", "details": {"السعر": float(item.total_price), "الحالة": item.status}})
        elif item_type == 'deposits':
            item = db.session.get(Deposit, item_id)
            if not item: return jsonify({"error": "غير موجود"}), 404
            return jsonify({"id": item.id, "title": f"إيداع #{item.id}", "details": {"المبلغ": float(item.amount), "رقم العملية": item.transaction_id}, "image": item.receipt_image})
        elif item_type == 'kyc':
            item = db.session.get(KYCRequest, item_id)
            if not item: return jsonify({"error": "غير موجود"}), 404
            return jsonify({"id": item.id, "title": f"توثيق #{item.id}", "details": {"الاسم": item.full_name}, "image": item.id_image})
        return jsonify({"error": "نوع غير معروف"}), 400
    except Exception: return jsonify({"error": "حدث خطأ داخلي"}), 500

@admin_bp.route("/<string:item_type>/<int:item_id>/<string:action>", methods=["POST"])
@admin_required
def handle_item_action(item_type, item_id, action):
    if action not in ['approve', 'reject']: return jsonify({"error": "إجراء غير صالح"}), 400
    try:
        model = {'orders': Order, 'deposits': Deposit, 'kyc': KYCRequest}.get(item_type)
        if not model: return jsonify({"error": "نوع غير معروف"}), 400
        item = db.session.query(model).filter_by(id=item_id).with_for_update().first()
        if not item: return jsonify({"error": "العنصر غير موجود"}), 404
        if str(item.status or '').lower() not in ['pending', 'معلق']:
            return jsonify({"error": "تمت معالجة هذا العنصر مسبقاً"}), 409

        if item_type == 'deposits' and action == 'approve':
            user = db.session.query(User).filter_by(id=item.user_id).with_for_update().first()
            amount = Decimal(str(item.amount))
            old_balance = user.balance
            user.balance = old_balance + amount
            record_transaction(user.id, "deposit", amount, old_balance, user.balance, reference=f"DEP-{item.id}")
            log_admin_action("قبول إيداع", "deposit", item_id, f"إضافة {amount}")
            
        if item_type == 'orders' and action == 'reject':
            user = db.session.query(User).filter_by(id=item.user_id).with_for_update().first()
            amount = Decimal(str(item.total_price))
            old_balance = user.balance
            user.balance = old_balance + amount
            record_transaction(user.id, "refund", amount, old_balance, user.balance, reference=f"REF-{item.order_number}")
            log_admin_action("رفض طلب", "order", item_id, f"استرداد {amount}")

        item.status = 'approved' if action == 'approve' else 'rejected'
        if item_type == 'kyc' and action == 'approve':
            user = db.session.query(User).filter_by(id=item.user_id).first()
            if user: user.is_verified = True
            
        db.session.commit()
        return jsonify({"success": True, "new_status": item.status})
    except Exception as e:
        print(f"ACTION ERROR: {str(e)}", flush=True)
        db.session.rollback()
        return jsonify({"error": "حدث خطأ داخلي"}), 500

@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_users():
    try:
        return jsonify([{"id": u.id, "telegram_id": str(u.telegram_id), "first_name": u.first_name, "balance": float(u.balance or 0), "is_banned": bool(u.is_banned)} for u in db.session.query(User).all()])
    except Exception: return jsonify([])

@admin_bp.route("/users/<int:user_id>/balance", methods=["POST"])
@admin_required
def update_balance(user_id):
    data = request.get_json(silent=True) or {}
    idempotency_key = data.get("idempotency_key")
    if not idempotency_key or len(idempotency_key) > 100:
        return jsonify({"error": "Missing idempotency_key"}), 400
    try:
        raw = data.get("amount")
        if raw is None: return jsonify({"error": "المبلغ مطلوب"}), 400
        amount = Decimal(str(raw))
        if not amount.is_finite(): return jsonify({"error": "قيمة غير محدودة"}), 400
        sign, digits, exponent = amount.as_tuple()
        if exponent < -4: return jsonify({"error": "الحد الأقصى 4 خانات عشرية"}), 400
        amount = amount.quantize(Decimal('0.0001'))
    except (ValueError, ArithmeticError):
        return jsonify({"error": "قيمة غير صالحة"}), 400
    fingerprint = hashlib.sha256(json.dumps({"user_id": user_id, "amount": str(amount)}, sort_keys=True).encode()).hexdigest()
    try:
        existing = db.session.query(AdminOperation).filter_by(admin_id=g.admin_id, idempotency_key=idempotency_key).first()
        if existing:
            if existing.payload_fingerprint != fingerprint: return jsonify({"error": "المفتاح مستخدم لعملية مختلفة"}), 409
            return jsonify(json.loads(existing.result_json)), 200
        user = db.session.query(User).filter_by(id=user_id).with_for_update().first()
        if not user: return jsonify({"error": "المستخدم غير موجود"}), 404
        old_balance = user.balance
        new_balance = old_balance + amount
        if new_balance < 0: return jsonify({"error": "الرصيد لا يمكن أن يكون سالباً"}), 400
        user.balance = new_balance
        ref = f"ADMIN-{idempotency_key[:20]}"
        record_transaction(user.id, "admin_edit", amount, old_balance, new_balance, reference=ref)
        db.session.flush()
        result = {"success": True, "new_balance": float(new_balance), "reference": ref}
        db.session.add(AdminOperation(admin_id=g.admin_id, idempotency_key=idempotency_key, operation_type="balance_edit", target_id=user_id, payload_fingerprint=fingerprint, result_json=json.dumps(result)))
        log_admin_action("تعديل رصيد", "user", user_id, f"من {old_balance} إلى {new_balance}")
        db.session.commit()
        return jsonify(result), 200
    except IntegrityError as exc:
        db.session.rollback()
        if diagnose_integrity_error(exc) == 'unique_admin_idem':
            existing = db.session.query(AdminOperation).filter_by(admin_id=g.admin_id, idempotency_key=idempotency_key).first()
            if existing and existing.payload_fingerprint == fingerprint: return jsonify(json.loads(existing.result_json)), 200
        return jsonify({"error": "حدث خطأ داخلي"}), 500
    except Exception:
        db.session.rollback()
        return jsonify({"error": "حدث خطأ داخلي"}), 500

@admin_bp.route("/users/<int:user_id>/ban", methods=["POST"])
@admin_required
def ban_user(user_id):
    is_banned = (request.get_json(silent=True) or {}).get("is_banned")
    try:
        user = db.session.query(User).filter_by(id=user_id).with_for_update().first()
        if not user: return jsonify({"error": "المستخدم غير موجود"}), 404
        user.is_banned = bool(is_banned)
        db.session.commit()
        log_admin_action("حظر" if is_banned else "فك حظر", "user", user_id, f"حالة {is_banned}")
        return jsonify({"success": True, "is_banned": user.is_banned})
    except Exception:
        db.session.rollback()
        return jsonify({"error": "حدث خطأ داخلي"}), 500

@admin_bp.route("/products", methods=["GET"])
@admin_required
def get_products():
    try:
        page = request.args.get('page', 1, type=int)
        pagination = db.session.query(Product).paginate(page=page, per_page=10, error_out=False)
        return jsonify({"items": [{"id": p.id, "name": p.name, "image": p.image, "base_price": float(p.base_price or 0), "base_quantity": p.base_quantity} for p in pagination.items], "total": pagination.total})
    except Exception: return jsonify({"items": [], "total": 0})

@admin_bp.route("/categories", methods=["GET"])
@admin_required
def get_categories():
    try: return jsonify([{"id": c.id, "name": c.name} for c in db.session.query(Category).all()])
    except Exception: return jsonify([])

@admin_bp.route("/payment-methods", methods=["GET"])
@admin_required
def get_payment_methods():
    try:
        return jsonify([{"id": p.id, "name": p.name, "account": p.account, "min_amount": float(p.min_amount or 0), "max_amount": float(p.max_amount or 0)} for p in db.session.query(PaymentMethod).filter(PaymentMethod.deleted_at.is_(None)).all()])
    except Exception: return jsonify([])

@admin_bp.route("/support/tickets", methods=["GET"])
@admin_required
def get_tickets():
    try: return jsonify([{"id": t.id, "user_name": t.user.first_name if t.user else 'مستخدم', "status": t.status} for t in db.session.query(SupportTicket).all()])
    except Exception: return jsonify([])

@admin_bp.route("/support/tickets/<int:ticket_id>/messages", methods=["GET"])
@admin_required
def get_ticket_messages(ticket_id):
    try: return jsonify([{"id": m.id, "sender_type": m.sender_type, "text": m.message, "created_at": m.created_at.isoformat() if m.created_at else None} for m in db.session.query(SupportMessage).filter_by(ticket_id=ticket_id).order_by(SupportMessage.created_at.asc()).all()])
    except Exception: return jsonify([])

@admin_bp.route("/support/tickets/<int:ticket_id>/reply", methods=["POST"])
@admin_required
def reply_ticket(ticket_id):
    text = (request.get_json(silent=True) or {}).get('text', '').strip()
    if not text: return jsonify({"error": "الرسالة فارغة"}), 400
    try:
        ticket = db.session.query(SupportTicket).filter_by(id=ticket_id).with_for_update().first()
        if not ticket: return jsonify({"error": "غير موجودة"}), 404
        db.session.add(SupportMessage(ticket_id=ticket_id, sender_type='admin', message=text))
        db.session.commit()
        return jsonify({"success": True})
    except Exception:
        db.session.rollback()
        return jsonify({"error": "حدث خطأ داخلي"}), 500

@admin_bp.route("/support/tickets/<int:ticket_id>/close", methods=["POST"])
@admin_required
def close_ticket(ticket_id):
    try:
        ticket = db.session.get(SupportTicket, ticket_id)
        if not ticket: return jsonify({"error": "غير موجودة"}), 404
        ticket.status = 'closed'
        db.session.commit()
        return jsonify({"success": True})
    except Exception: 
        db.session.rollback()
        return jsonify({"error": "حدث خطأ داخلي"}), 500

@admin_bp.route("/settings", methods=["GET"])
@admin_required
def get_settings():
    try:
        from sqlalchemy import text
        db.session.execute(text("CREATE TABLE IF NOT EXISTS app_settings (key VARCHAR(50) PRIMARY KEY, value TEXT)"))
        db.session.commit()
        d = {row[0]: row[1] for row in db.session.execute(text("SELECT key, value FROM app_settings")).fetchall()}
        return jsonify({"store_name": d.get('store_name', 'SANAD+ Store'), "exchange_rate": float(d.get('exchange_rate', 15000)), "maintenance_mode": str(d.get('maintenance_mode', 'false')).lower() == 'true'})
    except Exception: return jsonify({"store_name": "SANAD+", "exchange_rate": 15000, "maintenance_mode": False})

@admin_bp.route("/health", methods=["GET"])
def health_check(): return jsonify({"status": "ok", "message": "Server is running"})
