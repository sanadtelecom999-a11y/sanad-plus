"""
مسارات الأدمن — SANAD+ Admin Panel
المرحلة 0: المصادقة (login + verify-otp)
"""

import os
import secrets
import uuid
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


def _utcnow():
    return datetime.now(timezone.utc)


def _generate_otp():
    return "{:06d}".format(secrets.randbelow(1000000))


def _issue_jwt():
    now = _utcnow()
    payload = {
        "sub": "admin",
        "role": "admin",
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth_header[len("Bearer "):].strip()
        try:
            jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    password = (data.get("password") or "").strip()

    if not password:
        return jsonify({"success": False, "error": "كلمة المرور مطلوبة"}), 400

    if password != ADMIN_PASSWORD:
        return jsonify({"success": False, "error": "كلمة المرور غير صحيحة"}), 401

    session_id = str(uuid.uuid4())
    otp_code = _generate_otp()

    _admin_sessions[session_id] = {
        "otp_code": otp_code,
        "created_at": _utcnow(),
        "attempts": 0,
    }

    print("[ADMIN OTP] session={} code={}".format(session_id, otp_code), flush=True)

    return jsonify({
        "success": True,
        "require_otp": True,
        "session_id": session_id,
    })


@admin_bp.route("/verify-otp", methods=["POST"])
def verify_otp():
    data = request.get_json(silent=True) or {}
    session_id = (data.get("session_id") or "").strip()
    otp_code = (data.get("otp_code") or "").strip()

    session = _admin_sessions.get(session_id)
    if not session:
        return jsonify({"success": False, "error": "الجلسة غير صالحة أو منتهية"}), 401

    if _utcnow() - session["created_at"] > timedelta(minutes=OTP_TTL_MINUTES):
        _admin_sessions.pop(session_id, None)
        return jsonify({"success": False, "error": "انتهت صلاحية الرمز، أعد تسجيل الدخول"}), 401

    session["attempts"] += 1
    if session["attempts"] > MAX_OTP_ATTEMPTS:
        _admin_sessions.pop(session_id, None)
        return jsonify({"success": False, "error": "عدد محاولات كبير، أعد تسجيل الدخول"}), 429

    if otp_code != session["otp_code"]:
        return jsonify({"success": False, "error": "رمز OTP غير صحيح"}), 401

    _admin_sessions.pop(session_id, None)
    token = _issue_jwt()
    return jsonify({"token": token, "access_token": token})


@admin_bp.route("/stats", methods=["GET"])
@admin_required
def stats():
    try:
        from app.models import User, Order, Deposit
        from app import db
        
        total_users = db.session.query(User).count()
        total_orders = db.session.query(Order).count()
        total_deposits = db.session.query(Deposit).filter_by(status='approved').count()
        revenue_result = db.session.query(db.func.sum(Order.total_price)).filter_by(status='completed').scalar()
        revenue = float(revenue_result) if revenue_result else 0.0
        
        # بيانات تجريبية مؤقتة للرسوم البيانية (حتى يتم ربط التواريخ الفعلية)
        orders_chart = [15, 10, 5]
        revenue_chart = [120, 250, 180, 300, 220, 400, 350]
        
        print("--> STATS API CALLED SUCCESSFULLY", flush=True)
        
        return jsonify({
            "total_users": total_users,
            "total_orders": total_orders,
            "total_deposits": total_deposits,
            "revenue": revenue,
            "orders_chart": orders_chart,
            "revenue_chart": revenue_chart
        })
    except Exception as e:
        print("--> STATS ERROR:", str(e), flush=True)
        return jsonify({
            "total_users": 0, "total_orders": 0, "total_deposits": 0, "revenue": 0.0,
            "orders_chart": [15, 10, 5], 
            "revenue_chart": [120, 250, 180, 300, 220, 400, 350]
        })



# ============================================================
# المرحلة 2: الإرساليات (Inbox)
# ============================================================

@admin_bp.route("/inbox/counts", methods=["GET"])
@admin_required
def inbox_counts():
    try:
        from app.models import Order, Deposit, KYC
        from app import db
        # محاولة جلب عدد المعلقات فقط
        orders = db.session.query(Order).filter(Order.status.in_(['pending', 'معلق'])).count()
        deposits = db.session.query(Deposit).filter(Deposit.status.in_(['pending', 'معلق'])).count()
        kyc = db.session.query(KYC).filter(KYC.status.in_(['pending', 'معلق'])).count()
        return jsonify({"orders": orders, "deposits": deposits, "kyc": kyc})
    except Exception as e:
        print("Counts Error:", e, flush=True)
        return jsonify({"orders": 0, "deposits": 0, "kyc": 0})

@admin_bp.route("/orders", methods=["GET"])
@admin_required
def get_orders():
    try:
        from app.models import Order
        from app import db
        orders = db.session.query(Order).filter(Order.status.in_(['pending', 'معلق'])).all()
        return jsonify([{
            "id": o.id, "order_number": getattr(o, 'order_number', f'ORD-{o.id}'),
            "user_name": getattr(o.user, 'first_name', 'مستخدم') if hasattr(o, 'user') else 'مستخدم',
            "product_name": getattr(o.product, 'name', 'منتج') if hasattr(o, 'product') else 'منتج',
            "total_price": float(getattr(o, 'total_price', 0)), "status": "pending"
        } for o in orders])
    except Exception as e:
        print("Orders Error:", e, flush=True)
        return jsonify([])

@admin_bp.route("/deposits", methods=["GET"])
@admin_required
def get_deposits():
    try:
        from app.models import Deposit
        from app import db
        deposits = db.session.query(Deposit).filter(Deposit.status.in_(['pending', 'معلق'])).all()
        return jsonify([{
            "id": d.id, "amount": float(getattr(d, 'amount', 0)),
            "user_name": getattr(d.user, 'first_name', 'مستخدم') if hasattr(d, 'user') else 'مستخدم',
            "transaction_id": getattr(d, 'transaction_id', f'DEP-{d.id}'), "status": "pending"
        } for d in deposits])
    except Exception as e:
        return jsonify([])

@admin_bp.route("/kyc", methods=["GET"])
@admin_required
def get_kyc():
    try:
        from app.models import KYC
        from app import db
        kycs = db.session.query(KYC).filter(KYC.status.in_(['pending', 'معلق'])).all()
        return jsonify([{
            "id": k.id, "full_name": getattr(k, 'full_name', 'غير محدد'),
            "phone": getattr(k, 'phone', 'غير محدد'),
            "user_name": getattr(k.user, 'first_name', 'مستخدم') if hasattr(k, 'user') else 'مستخدم',
            "status": "pending"
        } for k in kycs])
    except Exception as e:
        return jsonify([])

# مسارات التفاصيل (Modal)
@admin_bp.route("/<string:item_type>/<int:item_id>/full", methods=["GET"])
@admin_required
def get_item_full(item_type, item_id):
    try:
        from app.models import Order, Deposit, KYC
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
            item = db.session.get(KYC, item_id)
            if not item: return jsonify({"error": "غير موجود"}), 404
            return jsonify({"id": item.id, "title": f"توثيق #{item.id}", "details": {"الاسم": getattr(item, 'full_name', '')}, "image": getattr(item, 'id_image', '')})
            
        return jsonify({"error": "نوع غير معروف"}), 400
    except Exception as e:
        print("Details Error:", e, flush=True)
        return jsonify({"error": str(e)}), 500

# مسارات القبول والرفض
@admin_bp.route("/<string:item_type>/<int:item_id>/<string:action>", methods=["POST"])
@admin_required
def handle_item_action(item_type, item_id, action):
    if action not in ['approve', 'reject']:
        return jsonify({"error": "إجراء غير صالح"}), 400
    
    try:
        from app.models import Order, Deposit, KYC
        from app import db
        
        model = {'orders': Order, 'deposits': Deposit, 'kyc': KYC}.get(item_type)
        if not model: return jsonify({"error": "نوع غير معروف"}), 400
        
        item = db.session.get(model, item_id)
        if not item: return jsonify({"error": "العنصر غير موجود"}), 404
        
        # تحديث الحالة
        new_status = 'approved' if action == 'approve' else 'rejected'
        item.status = new_status
        
        # (اختياري) إذا كان إيداعاً معتمداً، يمكن إضافة الرصيد للمستخدم هنا
        # if item_type == 'deposits' and action == 'approve':
        #     item.user.balance += item.amount
            
        db.session.commit()
        return jsonify({"success": True, "new_status": new_status})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================
# المرحلة 3: إدارة المستخدمين (Users)
# ============================================================

@admin_bp.route("/users", methods=["GET"])
@admin_required
def get_users():
    try:
        from app.models import User
        from app import db
        users = db.session.query(User).all()
        return jsonify([{
            "id": u.id,
            "telegram_id": str(getattr(u, 'telegram_id', '')),
            "first_name": getattr(u, 'first_name', 'مستخدم'),
            "balance": float(getattr(u, 'balance', 0.0)),
            "is_banned": bool(getattr(u, 'is_banned', False))
        } for u in users])
    except Exception as e:
        print("Users Error:", e, flush=True)
        return jsonify([])

@admin_bp.route("/users/<int:user_id>/balance", methods=["POST"])
@admin_required
def update_balance(user_id):
    data = request.get_json(silent=True) or {}
    amount = data.get("amount")
    
    if amount is None:
        return jsonify({"error": "المبلغ مطلوب"}), 400
        
    try:
        from app.models import User
        from app import db
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": "المستخدم غير موجود"}), 404
            
        user.balance = float(user.balance) + float(amount)
        db.session.commit()
        return jsonify({"success": True, "new_balance": user.balance})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/users/<int:user_id>/ban", methods=["POST"])
@admin_required
def ban_user(user_id):
    data = request.get_json(silent=True) or {}
    is_banned = data.get("is_banned")
    
    try:
        from app.models import User
        from app import db
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({"error": "المستخدم غير موجود"}), 404
            
        user.is_banned = bool(is_banned)
        db.session.commit()
        return jsonify({"success": True, "is_banned": user.is_banned})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================
# المرحلة 4: المتجر (Products)
# ============================================================

@admin_bp.route("/products", methods=["GET"])
@admin_required
def get_products():
    try:
        from app.models import Product
        from app import db
        
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        # محاولة استخدام الترقيم الخاص بـ SQLAlchemy
        pagination = db.session.query(Product).paginate(page=page, per_page=limit, error_out=False)
        products = pagination.items
        
        items = []
        for p in products:
            items.append({
                "id": p.id,
                "name": getattr(p, 'name', 'منتج بدون اسم'),
                "image": getattr(p, 'image', ''),
                "category_name": getattr(p.category, 'name', 'عام') if hasattr(p, 'category') and p.category else 'عام',
                "base_price": float(getattr(p, 'base_price', 0.0)),
                "base_quantity": int(getattr(p, 'base_quantity', 1)),
                "unit_name": getattr(p, 'unit_name', 'قطعة')
            })
            
        return jsonify({
            "items": items,
            "total": pagination.total,
            "pages": pagination.pages,
            "current_page": pagination.page
        })
    except Exception as e:
        print("Products Error:", e, flush=True)
        # في حال عدم وجود جدول أو ترقيم، نرسل أول 10 منتجات
        try:
            from app.models import Product
            from app import db
            products = db.session.query(Product).limit(limit).all()
            items = [{"id": p.id, "name": getattr(p, 'name', 'منتج'), "image": getattr(p, 'image', ''), "category_name": "عام", "base_price": float(getattr(p, 'base_price', 0)), "base_quantity": 1, "unit_name": "قطعة"} for p in products]
            return jsonify({"items": items, "total": len(items), "pages": 1, "current_page": 1})
        except:
            return jsonify({"items": [], "total": 0, "pages": 0, "current_page": 1})


@admin_bp.route("/categories", methods=["GET"])
@admin_required
def get_categories():
    try:
        from app.models import Category
        from app import db
        categories = db.session.query(Category).all()
        return jsonify([{"id": c.id, "name": getattr(c, 'name', 'قسم')} for c in categories])
    except Exception as e:
        print("Categories Error:", e, flush=True)
        return jsonify([])

@admin_bp.route("/products", methods=["POST"])
@admin_required
def create_product():
    data = request.get_json(silent=True) or {}
    try:
        from app.models import Product
        from app import db
        
        new_product = Product(
            name=data.get('name', 'منتج جديد'),
            category_id=data.get('category_id'),
            base_price=float(data.get('base_price', 0)),
            base_quantity=int(data.get('base_quantity', 1)),
            image=data.get('image', ''),
            unit_name=data.get('unit_name', 'قطعة')
        )
        db.session.add(new_product)
        db.session.commit()
        return jsonify({"success": True, "id": new_product.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/products/<int:product_id>", methods=["PUT", "DELETE"])
@admin_required
def manage_product(product_id):
    try:
        from app.models import Product
        from app import db
        product = db.session.get(Product, product_id)
        
        if not product:
            return jsonify({"error": "المنتج غير موجود"}), 404
            
        if request.method == 'DELETE':
            db.session.delete(product)
            db.session.commit()
            return jsonify({"success": True})
            
        if request.method == 'PUT':
            data = request.get_json(silent=True) or {}
            if 'name' in data: product.name = data['name']
            if 'category_id' in data: product.category_id = data['category_id']
            if 'base_price' in data: product.base_price = float(data['base_price'])
            if 'base_quantity' in data: product.base_quantity = int(data['base_quantity'])
            if 'image' in data: product.image = data['image']
            if 'unit_name' in data: product.unit_name = data['unit_name']
            
            db.session.commit()
            return jsonify({"success": True})
            
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================
# المرحلة 4.3: الأقسام وطرق الدفع
# ============================================================

@admin_bp.route("/categories", methods=["POST"])
@admin_required
def create_category():
    data = request.get_json(silent=True) or {}
    try:
        from app.models import Category
        from app import db
        new_cat = Category(name=data.get('name', 'قسم جديد'), image=data.get('image', ''))
        db.session.add(new_cat)
        db.session.commit()
        return jsonify({"success": True, "id": new_cat.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route("/categories/<int:cat_id>", methods=["PUT", "DELETE"])
@admin_required
def manage_category(cat_id):
    try:
        from app.models import Category
        from app import db
        cat = db.session.get(Category, cat_id)
        if not cat: return jsonify({"error": "القسم غير موجود"}), 404
        
        if request.method == 'DELETE':
            db.session.delete(cat)
            db.session.commit()
            return jsonify({"success": True})
        if request.method == 'PUT':
            data = request.get_json(silent=True) or {}
            if 'name' in data: cat.name = data['name']
            if 'image' in data: cat.image = data['image']
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
        
        # جلب الطرق غير المحذوفة فقط
        pms = db.session.query(PaymentMethod).filter(PaymentMethod.deleted_at.is_(None)).all()
        res = []
        
        for p in pms:
            try:
                # دالة مساعدة لتحويل حقول MONEY إلى float بأمان
                def parse_money(val):
                    if val is None: return 0.0
                    # إزالة أي رموز عملات أو فواصل
                    clean_val = str(val).replace('$', '').replace(',', '').strip()
                    try:
                        return float(clean_val)
                    except ValueError:
                        return 0.0

                res.append({
                    "id": p.id,
                    "name": str(getattr(p, 'name', '') or ''),
                    "account": str(getattr(p, 'account', '') or ''),
                    "min_amount": parse_money(getattr(p, 'min_amount', 0)),
                    "max_amount": parse_money(getattr(p, 'max_amount', 0))
                })
            except Exception as row_err:
                print("Row Error in PM:", row_err, flush=True)
                
        return jsonify(res)
    except Exception as e:
        print("FATAL PM Error:", str(e), flush=True)
        return jsonify([])

@admin_bp.route("/payment-methods", methods=["POST"])
@admin_required
def create_payment_method():
    data = request.get_json(silent=True) or {}
    try:
        from app.models import PaymentMethod
        from app import db
        pm = PaymentMethod(
            name=data.get('name', ''),
            account=data.get('account', ''),
            min_amount=float(data.get('min_amount', 0)),
            max_amount=float(data.get('max_amount', 0))
        )
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
        if request.method == 'PUT':
            data = request.get_json(silent=True) or {}
            if 'name' in data: pm.name = data['name']
            if 'account' in data: pm.account = data['account']
            if 'min_amount' in data: pm.min_amount = float(data['min_amount'])
            if 'max_amount' in data: pm.max_amount = float(data['max_amount'])
            db.session.commit()
            return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ============================================================
# المرحلة 5: تذاكر الدعم (Support Tickets)
# ============================================================

@admin_bp.route("/support/tickets", methods=["GET"])
@admin_required
def get_tickets():
    try:
        from app.models import SupportTicket
        from app import db
        # جلب التذاكر المفتوحة أو المعلقة
        tickets = db.session.query(SupportTicket).order_by(SupportTicket.updated_at.desc()).all()
        return jsonify([{
            "id": t.id,
            "user_name": getattr(t.user, 'first_name', 'مستخدم') if hasattr(t, 'user') and t.user else 'مستخدم',
            "status": getattr(t, 'status', 'open'),
            "updated_at": t.updated_at.isoformat() if hasattr(t, 'updated_at') and t.updated_at else None
        } for t in tickets])
    except Exception as e:
        print("Tickets Error:", e, flush=True)
        return jsonify([])

@admin_bp.route("/support/tickets/<int:ticket_id>/messages", methods=["GET"])
@admin_required
def get_ticket_messages(ticket_id):
    try:
        from app.models import SupportMessage, SupportTicket
        from app import db
        messages = db.session.query(SupportMessage).filter_by(ticket_id=ticket_id).order_by(SupportMessage.created_at.asc()).all()
        return jsonify([{
            "id": m.id,
            "sender_type": getattr(m, 'sender_type', 'user'),
            "text": getattr(m, 'text', ''),
            "created_at": m.created_at.isoformat() if hasattr(m, 'created_at') and m.created_at else None
        } for m in messages])
    except Exception as e:
        print("Messages Error:", e, flush=True)
        return jsonify([])

@admin_bp.route("/support/tickets/<int:ticket_id>/reply", methods=["POST"])
@admin_required
def reply_ticket(ticket_id):
    data = request.get_json(silent=True) or {}
    text = data.get('text', '').strip()
    if not text: return jsonify({"error": "الرسالة فارغة"}), 400
    
    try:
        from app.models import SupportMessage, SupportTicket
        from app import db
        msg = SupportMessage(ticket_id=ticket_id, sender_type='admin', text=text)
        db.session.add(msg)
        # تحديث وقت التذكرة
        ticket = db.session.get(SupportTicket, ticket_id)
        if ticket and hasattr(ticket, 'updated_at'):
            from datetime import datetime
            ticket.updated_at = datetime.utcnow()
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

# ============================================================
# المرحلة 6: الأرشيف (Archive)
# ============================================================

@admin_bp.route("/archive/<string:item_type>", methods=["GET"])
@admin_required
def get_archive(item_type):
    try:
        from app.models import Order, Deposit, KYC
        from app import db
        
        model = {'orders': Order, 'deposits': Deposit, 'kyc': KYC}.get(item_type)
        if not model: return jsonify([])
        
        # البحث عن العناصر المحذوفة (soft delete)
        query = db.session.query(model)
        if hasattr(model, 'deleted_at'):
            query = query.filter(model.deleted_at.isnot(None))
        else:
            query = query.filter(model.status.in_(['archived', 'cancelled', 'rejected', 'مرفوض']))
            
        items = query.all()
        
        res = []
        for i in items:
            res.append({
                "id": i.id,
                "title": f"{item_type} #{i.id}",
                "user_name": getattr(i.user, 'first_name', 'مستخدم') if hasattr(i, 'user') and i.user else 'مستخدم',
                "details": f"الحالة: {getattr(i, 'status', '')}"
            })
        return jsonify(res)
    except Exception as e:
        print("Archive Error:", e, flush=True)
        return jsonify([])

@admin_bp.route("/archive/<string:item_type>/<int:item_id>/restore", methods=["POST"])
@admin_required
def restore_archive(item_type, item_id):
    try:
        from app.models import Order, Deposit, KYC
        from app import db
        
        model = {'orders': Order, 'deposits': Deposit, 'kyc': KYC}.get(item_type)
        if not model: return jsonify({"error": "نوع غير معروف"}), 400
        
        item = db.session.get(model, item_id)
        if not item: return jsonify({"error": "العنصر غير موجود"}), 404
        
        if hasattr(item, 'deleted_at'):
            item.deleted_at = None
        if hasattr(item, 'status'):
            item.status = 'pending' # إعادة للحالة المعلقة
            
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
