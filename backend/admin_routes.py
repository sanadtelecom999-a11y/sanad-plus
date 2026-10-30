from app.notifications import (notify_order_approved, notify_order_rejected, notify_deposit_approved, notify_deposit_rejected, notify_kyc_approved, notify_kyc_rejected, notify_balance_adjusted)
from decimal import Decimal
from app.services.ledger_service import record_transaction
from app.decorators import rate_limit
import os, secrets, uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import Blueprint, jsonify, request

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin123")
_admin_sessions = {}
OTP_TTL_MINUTES = 5
MAX_OTP_ATTEMPTS = 5

def log_admin_action(action, target_type, target_id, details=""):
    try:
        from app.extensions import db
        from sqlalchemy import text
        db.session.execute(text("CREATE TABLE IF NOT EXISTS admin_audit_logs (id SERIAL PRIMARY KEY, admin_name VARCHAR(50) DEFAULT 'Admin', action VARCHAR(100), target_type VARCHAR(50), target_id INT, details TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"))
        db.session.execute(text("INSERT INTO admin_audit_logs (action, target_type, target_id, details) VALUES (:action, :target_type, :target_id, :details)"), {"action": action, "target_type": target_type, "target_id": target_id, "details": details})
    except Exception as e: print("Audit Log Error:", e, flush=True)

def _utcnow(): return datetime.now(timezone.utc)
def _generate_otp(): return "{:06d}".format(secrets.randbelow(1000000))
def _issue_jwt():
    now = _utcnow()
    return jwt.encode({"sub": "admin", "role": "admin", "iat": now, "exp": now + timedelta(hours=JWT_EXPIRY_HOURS)}, JWT_SECRET, algorithm=JWT_ALGORITHM)

def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "): return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header[len("Bearer "):].strip()
        try: jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError: return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError: return jsonify({"error": "Invalid token"}), 401
        except Exception: return jsonify({"error": "Auth error"}), 401
        return fn(*args, **kwargs)
    return wrapper

@admin_bp.route("/login", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=60)
def login():
    data = request.get_json(silent=True) or {}
    password = (data.get("password") or "").strip()
    if not password: return jsonify({"success": False, "error": "كلمة المرور مطلوبة"}), 400
    if password != ADMIN_PASSWORD: return jsonify({"success": False, "error": "كلمة المرور غير صحيحة"}), 401
    session_id = str(uuid.uuid4())
    otp_code = _generate_otp()
    _admin_sessions[session_id] = {"otp_code": otp_code, "created_at": _utcnow(), "attempts": 0}
    print("[ADMIN OTP] session={} code={}".format(session_id, otp_code), flush=True)
    return jsonify({"success": True, "require_otp": True, "session_id": session_id})

@admin_bp.route("/verify-otp", methods=["POST"])
@rate_limit(max_requests=5, window_seconds=60)
def verify_otp():
    data = request.get_json(silent=True) or {}
    session = _admin_sessions.get((data.get("session_id") or "").strip())
    if not session: return jsonify({"success": False, "error": "الجلسة غير صالحة"}), 400
    if _utcnow() - session["created_at"] > timedelta(minutes=OTP_TTL_MINUTES):
        _admin_sessions.pop(data.get("session_id"), None)
        return jsonify({"success": False, "error": "انتهت صلاحية الرمز"}), 400
    session["attempts"] += 1
    if session["attempts"] > MAX_OTP_ATTEMPTS:
        _admin_sessions.pop(data.get("session_id"), None)
        return jsonify({"success": False, "error": "عدد محاولات كبير"}), 429
    if (data.get("otp_code") or "").strip() != session["otp_code"]: return jsonify({"success": False, "error": "رمز OTP غير صحيح"}), 400
    _admin_sessions.pop(data.get("session_id"), None)
    token = _issue_jwt()
    return jsonify({"token": token, "access_token": token})

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def stats():
    try:
        from app.models import User, Order, Deposit
        from app import db
        revenue_result = db.session.query(db.func.sum(Order.total_price)).filter_by(status='completed').scalar()
        return jsonify({"total_users": db.session.query(User).count(), "total_orders": db.session.query(Order).count(), "total_deposits": db.session.query(Deposit).filter_by(status='approved').count(), "revenue": float(revenue_result) if revenue_result else 0.0, "orders_chart": [15, 10, 5], "revenue_chart": [120, 250, 180, 300, 220, 400, 350]})
    except Exception: return jsonify({"total_users": 0, "total_orders": 0, "total_deposits": 0, "revenue": 0.0, "orders_chart": [15, 10, 5], "revenue_chart": [120, 250, 180, 300, 220, 400, 350]})

@admin_bp.route("/inbox/counts", methods=["GET"])
@admin_required
def inbox_counts():
    try:
        from app.models import Order, Deposit, KYCRequest
        from app import db
        return jsonify({"orders": db.session.query(Order).filter(Order.status.in_(['pending', 'معلق'])).count(), "deposits": db.session.query(Deposit).filter(Deposit.status.in_(['pending', 'معلق'])).count(), "kyc": db.session.query(KYCRequest).filter(KYCRequest.status.in_(['pending', 'معلق'])).count()})
    except Exception: return jsonify({"orders": 0, "deposits": 0, "kyc": 0})

@admin_bp.route("/orders", methods=["GET"])
@admin_required
def get_orders():
    try:
        from app.models import Order
        from app import db
        orders = db.session.query(Order).filter(Order.status.in_(['pending', 'معلق'])).all()
        return jsonify([{"id": o.id, "order_number": getattr(o, 'order_number', f'ORD-{o.id}'), "user_name": getattr(o.user, 'first_name', 'مستخدم') if hasattr(o, 'user') else 'مستخدم', "product_name": getattr(o.product, 'name', 'منتج') if hasattr(o, 'product') else 'منتج', "total_price": float(getattr(o, 'total_price', 0)), "status": "pending"} for o in orders])
    except Exception: return jsonify([])

@admin_bp.route("/deposits", methods=["GET"])
@admin_required
def get_deposits():
    try:
        from app.models import Deposit
        from app import db
        deposits = db.session.query(Deposit).filter(Deposit.status.in_(['pending', 'معلق'])).all()
        return jsonify([{"id": d.id, "amount": float(getattr(d, 'amount', 0)), "user_name": getattr(d.user, 'first_name', 'مستخدم') if hasattr(d, 'user') else 'مستخدم', "transaction_id": getattr(d, 'transaction_id', f'DEP-{d.id}'), "status": "pending"} for d in deposits])
    except Exception: return jsonify([])

@admin_bp.route("/kyc", methods=["GET"])
@admin_required
def get_kyc():
    try:
        from app.models import KYCRequest
        from app import db
        kycs = db.session.query(KYCRequest).filter(KYCRequest.status.in_(['pending', 'معلق'])).all()
        return jsonify([{"id": k.id, "full_name": getattr(k, 'full_name', 'غير محدد'), "phone": getattr(k, 'phone', 'غير محدد'), "user_name": getattr(k.user, 'first_name', 'مستخدم') if hasattr(k, 'user') else 'مستخدم', "status": "pending"} for k in kycs])
    except Exception: return jsonify([])

@admin_bp.route("/<string:item_type>/<int:item_id>/full", methods=["GET"])
@admin_required
def get_item_full(item_type, item_id):
    try:
        from app.models import Order, Deposit, KYCRequest
        from app import db
        if item_type == 'orders':
            item = db.session.get(Order, item_id)
            if not item: return jsonify({"error": "غير موجود"}), 404
            return jsonify({"id": item.id, "title": f"طلب #{item.id}", "details": {"السعر": getattr(item, 'total_price', 0), "الحالة": "معلق"}})
        elif item_type == 'deposits':
            item = db.session.get(Deposit, item_id)
            if not item: return jsonify({"error": "غير موجود"}), 404
            return jsonify({"id": item.id, "title": f"إيداع #{item.id}", "details": {"المبلغ": getattr(item, 'amount', 0), "رقم العملية": getattr(item, 'transaction_id', '')}, "image": getattr(item, 'receipt_image', '')})
        elif item_type == 'kyc':
            item = db.session.get(KYCRequest, item_id)
            if not item: return jsonify({"error": "غير موجود"}), 404
            return jsonify({"id": item.id, "title": f"توثيق #{item.id}", "details": {"الاسم": getattr(item, 'full_name', '')}, "image": getattr(item, 'id_image', '')})
        return jsonify({"error": "نوع غير معروف"}), 400
    except Exception as e: return jsonify({"error": str(e)}), 500

@admin_bp.route("/<string:item_type>/<int:item_id>/<string:action>", methods=["POST"])
@admin_required
def handle_item_action(item_type, item_id, action):
    if action not in ['approve', 'reject']: return jsonify({"error": "إجراء غير صالح"}), 400
    try:
        from app.models import Order, Deposit, KYCRequest, User
        from app import db
        model = {'orders': Order, 'deposits': Deposit, 'kyc': KYCRequest}.get(item_type)
        if not model: return jsonify({"error": "نوع غير معروف"}), 400
        item = db.session.query(model).filter_by(id=item_id).with_for_update().first()
        if not item: return jsonify({"error": "العنصر غير موجود"}), 404
        
        if getattr(item, 'status', '') in ['approved', 'rejected']: return jsonify({"error": "تمت معالجة هذا العنصر مسبقاً"}), 400
        if str(getattr(item, 'status', '') or '').lower() != 'pending': return jsonify({"error": "حالة غير قابلة للمراجعة"}), 409

        if item_type == 'deposits' and action == 'approve':
            user = db.session.query(User).filter_by(id=item.user_id).with_for_update().first()
            if not user:
                db.session.rollback()
                return jsonify({"error": "المستخدم المرتبط غير موجود"}), 409
            amount = Decimal(str(item.amount))
            if not amount.is_finite() or amount <= 0:
                db.session.rollback()
                return jsonify({"error": "قيمة الإيداع غير صالحة"}), 409
            old_balance = Decimal(str(user.balance or "0"))
            user.balance = old_balance + amount
            record_transaction(user_id=user.id, action_type="deposit", amount=amount, balance_before=old_balance, balance_after=user.balance, reference=f"DEP-{item.id}", description="قبول إيداع")
            log_admin_action("قبول إيداع", "deposit", item_id, f"إضافة {amount} للمستخدم {user.id}.")
            
        if action == 'reject' and item_type == 'orders':
            user = db.session.query(User).filter_by(id=item.user_id).with_for_update().first()
            if user:
                old_balance = Decimal(str(user.balance or "0"))
                amount = Decimal(str(item.total_price))
                user.balance = old_balance + amount
                record_transaction(user_id=user.id, action_type="refund", amount=amount, balance_before=old_balance, balance_after=user.balance, reference=f"REF-{item.order_number}", description=f"استرداد {item.order_number}")
            log_admin_action("رفض طلب", "order", item_id, "تم الرفض والاسترداد")

        item.status = 'approved' if action == 'approve' else 'rejected'
        
        if item_type == 'kyc' and action == 'approve':
            user = db.session.query(User).filter_by(id=item.user_id).first()
            if user: user.is_verified = True

        db.session.commit()
        
        try:
            if item_type == 'deposits':
                if action == 'approve': notify_deposit_approved(item.user, item)
                else: notify_deposit_rejected(item.user, item)
            elif item_type == 'orders':
                if action == 'approve': notify_order_approved(item.user, item)
                else: notify_order_rejected(item.user, item)
            elif item_type == 'kyc':
                if action == 'approve': notify_kyc_approved(item.user)
                else: notify_kyc_rejected(item.user)
        except: pass
        
        return jsonify({"success": True, "new_status": item.status})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_users():
    try:
        from app.models import User
        from app import db
        return jsonify([{"id": u.id, "telegram_id": str(getattr(u, 'telegram_id', '')), "first_name": getattr(u, 'first_name', 'مستخدم'), "balance": float(getattr(u, 'balance', 0.0)), "is_banned": bool(getattr(u, 'is_banned', False))} for u in db.session.query(User).all()])
    except Exception: return jsonify([])

@admin_bp.route("/users/<int:user_id>/balance", methods=["POST"])
@admin_required
def update_balance(user_id):
    amount = (request.get_json(silent=True) or {}).get("amount")
    if amount is None: return jsonify({"error": "المبلغ مطلوب"}), 400
    try:
        from app.models import User
        from app import db
        user = db.session.query(User).filter_by(id=user_id).with_for_update().first()
        if not user: return jsonify({"error": "المستخدم غير موجود"}), 404
        old_balance = float(user.balance)
        user.balance = old_balance + float(amount)
        db.session.commit()
        log_admin_action("تعديل رصيد", "user", user_id, f"من {old_balance} إلى {user.balance}")
        return jsonify({"success": True, "new_balance": user.balance})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/users/<int:user_id>/ban", methods=["POST"])
@admin_required
def ban_user(user_id):
    is_banned = (request.get_json(silent=True) or {}).get("is_banned")
    try:
        from app.models import User
        from app import db
        user = db.session.query(User).filter_by(id=user_id).with_for_update().first()
        if not user: return jsonify({"error": "المستخدم غير موجود"}), 404
        user.is_banned = bool(is_banned)
        db.session.commit()
        log_admin_action("حظر" if is_banned else "فك حظر", "user", user_id, f"حالة {is_banned}")
        return jsonify({"success": True, "is_banned": user.is_banned})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/products", methods=["GET"])
@admin_required
def get_products():
    try:
        from app.models import Product
        from app import db
        page = request.args.get('page', 1, type=int)
        pagination = db.session.query(Product).paginate(page=page, per_page=request.args.get('limit', 10, type=int), error_out=False)
        return jsonify({"items": [{"id": p.id, "name": getattr(p, 'name', 'منتج'), "image": getattr(p, 'image', ''), "category_name": getattr(p.category, 'name', 'عام') if hasattr(p, 'category') and p.category else 'عام', "base_price": float(getattr(p, 'base_price', 0.0)), "base_quantity": int(getattr(p, 'base_quantity', 1)), "unit_name": getattr(p, 'unit_name', 'قطعة')} for p in pagination.items], "total": pagination.total, "pages": pagination.pages, "current_page": pagination.page})
    except Exception: return jsonify({"items": [], "total": 0, "pages": 0, "current_page": 1})

@admin_bp.route("/categories", methods=["GET"])
@admin_required
def get_categories():
    try:
        from app.models import Category
        from app import db
        return jsonify([{"id": c.id, "name": getattr(c, 'name', 'قسم')} for c in db.session.query(Category).all()])
    except Exception: return jsonify([])

@admin_bp.route("/products", methods=["POST"])
@admin_required
def create_product():
    data = request.get_json(silent=True) or {}
    try:
        from app.models import Product
        from app import db
        p = Product(name=data.get('name', 'منتج'), category_id=data.get('category_id'), base_price=float(data.get('base_price', 0)), base_quantity=int(data.get('base_quantity', 1)), image=data.get('image', ''), unit_name=data.get('unit_name', 'قطعة'))
        db.session.add(p)
        db.session.commit()
        return jsonify({"success": True, "id": p.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/products/<int:product_id>", methods=["PUT", "DELETE"])
@admin_required
def manage_product(product_id):
    try:
        from app.models import Product
        from app import db
        p = db.session.get(Product, product_id)
        if not p: return jsonify({"error": "المنتج غير موجود"}), 404
        if request.method == 'DELETE':
            db.session.delete(p)
            db.session.commit()
            return jsonify({"success": True})
        data = request.get_json(silent=True) or {}
        for field in ['name', 'category_id', 'image', 'unit_name']:
            if field in data: setattr(p, field, data[field])
        if 'base_price' in data: p.base_price = float(data['base_price'])
        if 'base_quantity' in data: p.base_quantity = int(data['base_quantity'])
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/categories", methods=["POST"])
@admin_required
def create_category():
    data = request.get_json(silent=True) or {}
    try:
        from app.models import Category
        from app import db
        c = Category(name=data.get('name', 'قسم'), image=data.get('image', ''))
        db.session.add(c)
        db.session.commit()
        return jsonify({"success": True, "id": c.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/categories/<int:cat_id>", methods=["PUT", "DELETE"])
@admin_required
def manage_category(cat_id):
    try:
        from app.models import Category
        from app import db
        c = db.session.get(Category, cat_id)
        if not c: return jsonify({"error": "القسم غير موجود"}), 404
        if request.method == 'DELETE':
            db.session.delete(c)
            db.session.commit()
            return jsonify({"success": True})
        data = request.get_json(silent=True) or {}
        if 'name' in data: c.name = data['name']
        if 'image' in data: c.image = data['image']
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/payment-methods", methods=["GET"])
@admin_required
def get_payment_methods():
    try:
        from app.models import PaymentMethod
        from app import db
        res = []
        for p in db.session.query(PaymentMethod).filter(PaymentMethod.deleted_at.is_(None)).all():
            def parse_money(v): return float(str(v).replace('$', '').replace(',', '').strip() or 0) if v is not None else 0.0
            res.append({"id": p.id, "name": str(getattr(p, 'name', '') or ''), "account": str(getattr(p, 'account', '') or ''), "min_amount": parse_money(getattr(p, 'min_amount', 0)), "max_amount": parse_money(getattr(p, 'max_amount', 0))})
        return jsonify(res)
    except Exception: return jsonify([])

@admin_bp.route("/payment-methods", methods=["POST"])
@admin_required
def create_payment_method():
    data = request.get_json(silent=True) or {}
    try:
        from app.models import PaymentMethod
        from app import db
        pm = PaymentMethod(name=data.get('name', ''), account=data.get('account', ''), min_amount=float(data.get('min_amount', 0)), max_amount=float(data.get('max_amount', 0)))
        db.session.add(pm)
        db.session.commit()
        return jsonify({"success": True, "id": pm.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/payment-methods/<int:pm_id>", methods=["PUT", "DELETE"])
@admin_required
def manage_payment_method(pm_id):
    try:
        from app.models import PaymentMethod
        from app import db
        pm = db.session.get(PaymentMethod, pm_id)
        if not pm: return jsonify({"error": "طريقة الدفع غير موجودة"}), 404
        if request.method == 'DELETE':
            db.session.delete(pm)
            db.session.commit()
            return jsonify({"success": True})
        data = request.get_json(silent=True) or {}
        for field in ['name', 'account']:
            if field in data: setattr(pm, field, data[field])
        if 'min_amount' in data: pm.min_amount = float(data['min_amount'])
        if 'max_amount' in data: pm.max_amount = float(data['max_amount'])
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/support/tickets", methods=["GET"])
@admin_required
def get_tickets():
    try:
        from app.models import SupportTicket
        from app import db
        return jsonify([{"id": t.id, "user_name": getattr(t.user, 'first_name', 'مستخدم') if hasattr(t, 'user') and t.user else 'مستخدم', "status": getattr(t, 'status', 'open'), "updated_at": t.updated_at.isoformat() if hasattr(t, 'updated_at') and t.updated_at else None} for t in db.session.query(SupportTicket).order_by(SupportTicket.updated_at.desc()).all()])
    except Exception: return jsonify([])

@admin_bp.route("/support/tickets/<int:ticket_id>/messages", methods=["GET"])
@admin_required
def get_ticket_messages(ticket_id):
    try:
        from app.models import SupportMessage
        from app import db
        return jsonify([{"id": m.id, "sender_type": getattr(m, 'sender_type', 'user'), "text": getattr(m, 'message', ''), "message": getattr(m, 'message', ''), "created_at": m.created_at.isoformat() if hasattr(m, 'created_at') and m.created_at else None} for m in db.session.query(SupportMessage).filter_by(ticket_id=ticket_id).order_by(SupportMessage.created_at.asc()).all()])
    except Exception: return jsonify([])

@admin_bp.route("/support/tickets/<int:ticket_id>/reply", methods=["POST"])
@admin_required
def reply_ticket(ticket_id):
    text = (request.get_json(silent=True) or {}).get('text', '').strip()
    if not text: return jsonify({"error": "الرسالة فارغة"}), 400
    try:
        from app.models import SupportMessage, SupportTicket
        from app import db
        ticket = db.session.query(SupportTicket).filter_by(id=ticket_id).with_for_update().first()
        if not ticket: return jsonify({"error": "التذكرة غير موجودة"}), 404
        db.session.add(SupportMessage(ticket_id=ticket_id, sender_type='admin', message=text))
        ticket.updated_at = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/support/tickets/<int:ticket_id>/close", methods=["POST"])
@admin_required
def close_ticket(ticket_id):
    try:
        from app.models import SupportTicket
        from app import db
        ticket = db.session.get(SupportTicket, ticket_id)
        if not ticket: return jsonify({"error": "التذكرة غير موجودة"}), 404
        ticket.status = 'closed'
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/archive/<string:item_type>", methods=["GET"])
@admin_required
def get_archive(item_type):
    try:
        import app.models as models
        from app import db
        model = getattr(models, 'Order', None) if item_type == 'orders' else (getattr(models, 'Deposit', None) if item_type == 'deposits' else None)
        if not model: return jsonify([])
        items = db.session.query(model).limit(100).all()
        res = []
        for i in items:
            status = str(getattr(i, 'status', '')).lower()
            if getattr(i, 'deleted_at', None) is not None or status in ['archived', 'cancelled', 'rejected', 'مرفوض', 'ملغي', 'مؤرشف']:
                res.append({"id": i.id, "title": f"{item_type} #{i.id}", "user_name": getattr(i.user, 'first_name', 'مستخدم') if hasattr(i, 'user') and i.user else 'مستخدم', "details": f"الحالة: {getattr(i, 'status', 'غير محدد')}"})
        return jsonify(res)
    except Exception: return jsonify([])

@admin_bp.route("/archive/<string:item_type>/<int:item_id>/restore", methods=["POST"])
@admin_required
def restore_archive(item_type, item_id):
    try:
        from app.models import Order, Deposit, KYCRequest
        from app import db
        model = {'orders': Order, 'deposits': Deposit, 'kyc': KYCRequest}.get(item_type)
        if not model: return jsonify({"error": "نوع غير معروف"}), 400
        item = db.session.get(model, item_id)
        if not item: return jsonify({"error": "العنصر غير موجود"}), 404
        if hasattr(item, 'deleted_at'): item.deleted_at = None
        if hasattr(item, 'status'): item.status = 'pending'
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/settings", methods=["GET"])
@admin_required
def get_settings():
    try:
        from app.extensions import db
        from sqlalchemy import text
        db.session.execute(text("CREATE TABLE IF NOT EXISTS app_settings (key VARCHAR(50) PRIMARY KEY, value TEXT)"))
        db.session.commit()
        d = {row[0]: row[1] for row in db.session.execute(text("SELECT key, value FROM app_settings")).fetchall()}
        return jsonify({"store_name": d.get('store_name', 'SANAD+ Store'), "exchange_rate": float(d.get('exchange_rate', 15000)), "maintenance_mode": str(d.get('maintenance_mode', 'false')).lower() == 'true'})
    except Exception: return jsonify({"store_name": "SANAD+", "exchange_rate": 15000, "maintenance_mode": False})

@admin_bp.route("/settings", methods=["PUT"])
@admin_required
def update_settings():
    data = request.get_json(silent=True) or {}
    try:
        from app.extensions import db
        from sqlalchemy import text
        def set_kv(k, v): db.session.execute(text("INSERT INTO app_settings (key, value) VALUES (:k, :v) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"), {"k": k, "v": str(v)})
        for k in ['store_name', 'exchange_rate', 'maintenance_mode']:
            if k in data: set_kv(k, data[k])
        db.session.commit()
        log_admin_action("تحديث الإعدادات", "settings", 0, str(data))
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/health", methods=["GET"])
def health_check(): return jsonify({"status": "ok", "message": "Server is running"})

@admin_bp.route("/kyc/<int:kyc_id>/action", methods=["POST"])
@admin_required
def handle_kyc_action(kyc_id):
    action = (request.get_json(silent=True) or {}).get('action')
    if action not in ['approve', 'reject']: return jsonify({"error": "إجراء غير صالح"}), 400
    try:
        from app.models import KYCRequest, User
        from app import db
        kyc = db.session.query(KYCRequest).filter_by(id=kyc_id).with_for_update().first()
        if not kyc: return jsonify({"error": "الطلب غير موجود"}), 404
        kyc.status = 'approved' if action == 'approve' else 'rejected'
        if action == 'approve':
            user = db.session.query(User).filter_by(id=kyc.user_id).first()
            if user: user.is_verified = True
        db.session.commit()
        log_admin_action(f"KYC {kyc.status}", "kyc", kyc_id, f"حالة {kyc.status}")
        try:
            if action == 'approve': notify_kyc_approved(kyc.user)
            else: notify_kyc_rejected(kyc.user)
        except: pass
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

from app.services.cloudinary_service import get_signed_url

@admin_bp.route("/kyc/<int:kyc_id>/images", methods=["GET"])
@admin_required
def get_kyc_images(kyc_id):
    try:
        from app.models import KYCRequest
        from app import db
        kyc = db.session.get(KYCRequest, kyc_id)
        if not kyc: return jsonify({"error": "الطلب غير موجود"}), 404
        return jsonify({"selfie": get_signed_url(getattr(kyc, 'selfie_image', '')), "expires_in": 3600})
    except Exception as e: return jsonify({"error": str(e)}), 500
