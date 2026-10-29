from decimal import Decimal, InvalidOperation
from uuid import uuid4
from app.services.ledger_service import record_transaction
import hmac
import hashlib
import json
import os
from urllib.parse import parse_qsl
from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import User, Category

public_bp = Blueprint('public', __name__, url_prefix='/api')

def verify_telegram_auth(init_data):
    """التحقق التشفيري من أن البيانات قادمة من تيليجرام وليست مزيفة"""
    try:
        parsed_data = dict(parse_qsl(init_data))
        if 'hash' not in parsed_data:
            return False, "Missing hash"
            
        received_hash = parsed_data.pop('hash')
        data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(parsed_data.items())])
        
        bot_token = os.environ.get("BOT_TOKEN", "")
        if not bot_token:
            return False, "Server config error"

        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if calculated_hash != received_hash:
            return False, "Invalid signature"
            
        return True, json.loads(parsed_data.get('user', '{}'))
    except Exception as e:
        return False, str(e)

# 1. مسار البوت (تسجيل الدخول)
@public_bp.route('/bot/auth', methods=['POST', 'OPTIONS'])
def bot_auth():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    tg_id = data.get('telegram_id') or data.get('id')
    
    if not tg_id: return jsonify({"error": "Missing ID"}), 400
    
    user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
    if not user:
        user = User(telegram_id=int(tg_id), first_name=data.get('first_name', 'User'), balance=0.0)
        db.session.add(user)
        db.session.commit()
        
    return jsonify({
        "success": True, 
        "user_id": user.id, 
        "telegram_id": user.telegram_id,
        "balance": float(user.balance) if user.balance else 0.0,
        "first_name": getattr(user, 'first_name', 'مستخدم')
    })

# 2. مسار الميني آب (تسجيل الدخول الآمن)
@public_bp.route('/auth/telegram', methods=['POST', 'OPTIONS'])
def auth_telegram():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    init_data = data.get('initData')
    
    if not init_data: return jsonify({"error": "Missing initData"}), 400
    
    is_valid, user_data = verify_telegram_auth(init_data)
    if not is_valid:
        return jsonify({"error": "Unauthorized: " + user_data}), 401
        
    tg_id = int(user_data.get('id'))
    user = db.session.query(User).filter_by(telegram_id=tg_id).first()
    if not user:
        user = User(telegram_id=tg_id, first_name=user_data.get('first_name', 'User'), balance=0.0)
        db.session.add(user)
        db.session.commit()
        
    return jsonify({"token": "jwt_token_placeholder_secure"})

# 3. مسار جلب بيانات الميني آب
@public_bp.route('/miniapp/init', methods=['POST', 'OPTIONS'])
def miniapp_init():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    tg_id = data.get('telegram_id')
    
    if not tg_id: return jsonify({"error": "Missing telegram_id"}), 400
        
    user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    # حساب إجمالي الإيداعات (فقط المقبولة)
    from sqlalchemy import func
    from app.models import Deposit
    total_deps = db.session.query(func.sum(Deposit.amount)).filter_by(user_id=user.id, status='approved').scalar()
    
    return jsonify({
        "balance": float(user.balance) if user.balance else 0.0,
        "first_name": getattr(user, 'first_name', 'مستخدم'),
        "sanad_id": f"SN-{user.id:03d}",
        "is_verified": getattr(user, 'is_verified', False),
        "total_deposits": float(total_deps) if total_deps else 0.0,
        "telegram_id": str(user.telegram_id)
    })

# 4. مسار جلب التصنيفات
@public_bp.route('/categories/', methods=['GET', 'OPTIONS'])
def get_categories():
    if request.method == 'OPTIONS': return jsonify({}), 200
    cats = db.session.query(Category).all()
    return jsonify([{
        "id": c.id, "name": c.name, "image": getattr(c, 'image', '')
    } for c in cats])


# 5. جلب طرق الدفع
@public_bp.route('/payment-methods/', methods=['GET', 'OPTIONS'])
def get_payment_methods():
    if request.method == 'OPTIONS': return jsonify({}), 200
    try:
        from app.models import PaymentMethod
        pms = db.session.query(PaymentMethod).filter(PaymentMethod.deleted_at.is_(None)).all()
        res = []
        for p in pms:
            def parse_money(val):
                if val is None: return 0.0
                clean_val = str(val).replace('$', '').replace(',', '').strip()
                try: return float(clean_val)
                except: return 0.0

            res.append({
                "id": p.id,
                "name": str(getattr(p, 'name', 'شام كاش')),
                "account": str(getattr(p, 'account', '')),
                "min_amount": parse_money(getattr(p, 'min_amount', 0)),
                "max_amount": parse_money(getattr(p, 'max_amount', 0))
            })
        return jsonify(res)
    except Exception as e:
        print("Public PM Error:", e, flush=True)
        return jsonify([])

@public_bp.route('/deposits/create', methods=['POST'])
def create_deposit():
    try:
        # استخدام request.form لأننا سنرسل FormData (بسبب الصورة)
        tg_id = request.form.get('telegram_id')
        amount = float(request.form.get('amount', 0))
        reference = request.form.get('reference', '')
        
        if not tg_id or amount <= 0:
            return jsonify({"error": "بيانات غير صالحة"}), 400
            
        from app.models import User, Deposit
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
        if not user: return jsonify({"error": "المستخدم غير موجود"}), 404
        
        # محاكاة حفظ الصورة (في الإنتاج: Cloudinary)
        image_url = "receipt_placeholder.jpg"
        if 'receipt' in request.files:
            file = request.files['receipt']
            if file.filename != '':
                image_url = f"receipt_{user.id}_{reference}.jpg"
        
        new_deposit = Deposit(
            user_id=user.id,
            amount=amount,
            transaction_id=reference,
            status='pending',
            receipt_image=image_url # إذا كان الحقل موجوداً في الداتابيز
        )
        db.session.add(new_deposit)
        db.session.commit()
        return jsonify({"success": True, "deposit_id": new_deposit.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@public_bp.route('/deposits/', methods=['GET', 'OPTIONS'])
def get_user_deposits():
    if request.method == 'OPTIONS': return jsonify({}), 200
    tg_id = request.args.get('telegram_id')
    if not tg_id: return jsonify({"error": "Missing telegram_id"}), 400
    
    try:
        from app.models import User, Deposit
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
        if not user: return jsonify([])
        
        deposits = db.session.query(Deposit).filter_by(user_id=user.id).order_by(Deposit.id.desc()).all()
        return jsonify([{
            "id": d.id,
            "amount": float(d.amount),
            "status": getattr(d, 'status', 'pending'),
            "reference": getattr(d, 'transaction_id', ''),
            "receipt_image": getattr(d, 'receipt_image', '') or "https://placehold.co/400x200/101f35/FFFFFF?text=Receipt+Image",
            "date": d.created_at.isoformat() if hasattr(d, 'created_at') and d.created_at else ''
        } for d in deposits])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 8. جلب طلبات المستخدم
@public_bp.route('/orders/', methods=['GET', 'OPTIONS'])
def get_user_orders():
    if request.method == 'OPTIONS': return jsonify({}), 200
    tg_id = request.args.get('telegram_id')
    if not tg_id: return jsonify({"error": "Missing telegram_id"}), 400
    
    try:
        from app.models import User, Order
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
        if not user: return jsonify([])
        
        orders = db.session.query(Order).filter_by(user_id=user.id).order_by(Order.id.desc()).all()
        return jsonify([{
            "id": o.id,
            "order_number": getattr(o, 'order_number', f'ORD-{o.id}'),
            "product_name": getattr(o.product, 'name', 'منتج') if hasattr(o, 'product') and o.product else 'منتج',
            "amount": float(getattr(o, 'total_price', 0)),
            "quantity": getattr(o, 'quantity', 1),
            "delivery_data": getattr(o, 'delivery_data', 'غير متوفر'),
            "status": getattr(o, 'status', 'pending'),
            "date": o.created_at.isoformat() if hasattr(o, 'created_at') and o.created_at else ''
        } for o in orders])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 9. جلب المنتجات حسب القسم
@public_bp.route('/products/', methods=['GET', 'OPTIONS'])
def get_products():
    if request.method == 'OPTIONS': return jsonify({}), 200
    cat_id = request.args.get('category_id')
    
    try:
        from app.models import Product
        query = db.session.query(Product)
        if cat_id:
            query = query.filter_by(category_id=int(cat_id))
            
        products = query.all()
        return jsonify([{
            "id": p.id,
            "name": getattr(p, 'name', 'منتج'),
            "price": float(getattr(p, 'base_price', 0)),
            "image": getattr(p, 'image', '')
        } for p in products])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@public_bp.route('/kyc/status', methods=['GET'])
def kyc_status():
    tg_id = request.args.get('telegram_id')
    if not tg_id: return jsonify({"error": "Missing ID"}), 400
    try:
        from sqlalchemy import text
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
        if not user: return jsonify({"status": "not_found"}), 404
        
        # إنشاء جدول KYC إذا لم يكن موجوداً
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS kyc_requests (
                id SERIAL PRIMARY KEY, user_id INT UNIQUE, full_name VARCHAR(100),
                phone VARCHAR(20), governorate VARCHAR(50), region VARCHAR(50),
                id_front_url TEXT, selfie_url TEXT, status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.commit()
        
        row = db.session.execute(text("SELECT full_name, status FROM kyc_requests WHERE user_id = :uid"), {"uid": user.id}).fetchone()
        if row:
            return jsonify({"status": row[1], "full_name": row[0]})
        return jsonify({"status": "none"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@public_bp.route('/kyc/submit', methods=['POST'])
def kyc_submit():
    try:
        tg_id = request.form.get('telegram_id')
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
        if not user: return jsonify({"error": "User not found"}), 404
        
        full_name = request.form.get('full_name')
        phone = request.form.get('phone')
        governorate = request.form.get('governorate')
        region = request.form.get('region')
        
        # في الإنتاج، يجب رفع الصور إلى Cloudinary. هنا سنحفظها كـ Base64 مؤقتاً أو نستخدم مسار وهمي
        id_front = request.files.get('id_front')
        selfie = request.files.get('selfie')
        
        # (محاكاة حفظ الصور - سنستخدم مسار وهمي لتجنب أخطاء السيرفر)
        id_front_url = "uploaded_id_front.jpg"
        selfie_url = "uploaded_selfie.jpg"
        
        from sqlalchemy import text
        from app.models import KYCRequest
        # نستخدم الجدول الحقيقي KYCRequest
        kyc = db.session.query(KYCRequest).filter_by(user_id=user.id).first()
        if not kyc:
            kyc = KYCRequest(user_id=user.id)
            db.session.add(kyc)
            
        kyc.full_name = full_name
        kyc.phone = phone
        kyc.address = f"{governorate} - {region}"
        kyc.selfie_image = selfie_url # سنستخدم هذا الحقل للصورة
        kyc.status = 'pending'
        
        db.session.commit()
        
        return jsonify({"success": True, "message": "تم إرسال طلب التوثيق بنجاح"})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- Support Routes ---
@public_bp.route('/support/messages', methods=['GET'])
def get_support_messages():
    tg_id = request.args.get('telegram_id')
    if not tg_id: return jsonify({"error": "Missing ID"}), 400
    try:
        from sqlalchemy import text
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
        if not user: return jsonify([])
        
        from app.models import SupportTicket, SupportMessage
        
        # جلب أو إنشاء تذكرة للمستخدم
        ticket = db.session.query(SupportTicket).filter_by(user_id=user.id).first()
        if not ticket:
            return jsonify([])
            
        msgs = db.session.query(SupportMessage).filter_by(ticket_id=ticket.id).order_by(SupportMessage.created_at.asc()).all()
        return jsonify([{"id": m.id, "sender": m.sender_type, "message": m.text, "date": str(m.created_at)} for m in msgs])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@public_bp.route('/support/send', methods=['POST'])
def send_support_message():
    data = request.get_json(silent=True) or {}
    tg_id = data.get('telegram_id')
    msg = data.get('message')
    if not tg_id or not msg: return jsonify({"error": "Missing data"}), 400
    try:
        from sqlalchemy import text
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
        if not user: return jsonify({"error": "User not found"}), 404
        
        from app.models import SupportTicket, SupportMessage
        # البحث عن تذكرة مفتوحة، أو إنشاء واحدة جديدة لهذا المستخدم فقط
        ticket = db.session.query(SupportTicket).filter_by(user_id=user.id, status='open').first()
        if not ticket:
            ticket = SupportTicket(user_id=user.id, status='open')
            db.session.add(ticket)
            db.session.commit()
            
        new_msg = SupportMessage(ticket_id=ticket.id, sender_type='user', text=msg)
        db.session.add(new_msg)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# --- FAQ Route ---
@public_bp.route('/faq', methods=['GET'])
def get_faq():
    # أسئلة ثابتة (يمكن جلبها من الداتابيز لاحقاً)
    return jsonify([
        {"q": "كيف أقوم بشحن رصيدي؟", "a": "يمكنك الشحن عبر قسم (شحن الرصيد) واختيار شام كاش، ثم إدخال المبلغ ورقم العملية."},
        {"q": "كم يستغرق توثيق الحساب؟", "a": "يتم مراجعة طلبات التوثيق خلال 24 ساعة كحد أقصى."},
        {"q": "هل يمكنني استرجاع أموالي؟", "a": "في حال وجود مشكلة في طلبك، يرجى التواصل مع الدعم الفني."}
    ])

@public_bp.route('/orders/create', methods=['POST'])
def create_order():
    data = request.get_json(silent=True) or {}
    tg_id = data.get('telegram_id')
    product_id = data.get('product_id')
    quantity = int(data.get('quantity', 1))
    delivery_data = data.get('delivery_data', '') # بيانات اللاعب أو الحساب

    if not tg_id or not product_id:
        return jsonify({"error": "بيانات ناقصة"}), 400

    try:
        from app.models import User, Product, Order
        from app import db

        # قفل صف المستخدم لمنع تعارض العمليات المالية
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).with_for_update().first()
        if not user: return jsonify({"error": "المستخدم غير موجود"}), 404

        product = db.session.query(Product).filter_by(id=product_id).first()
        if not product: return jsonify({"error": "المنتج غير موجود"}), 404

        try:
            quantity_decimal = Decimal(str(quantity))
        except (InvalidOperation, TypeError, ValueError):
            return jsonify({"error": "الكمية غير صالحة"}), 400
        if not quantity_decimal.is_finite() or quantity_decimal <= 0 or quantity_decimal != quantity_decimal.to_integral_value():
            return jsonify({"error": "يجب أن تكون الكمية عددًا صحيحًا موجبًا"}), 400
        quantity = int(quantity_decimal)

        user = db.session.query(User).filter_by(id=user.id).with_for_update().populate_existing().first()
        product = db.session.query(Product).filter_by(id=product_id).with_for_update().populate_existing().first()
        if not user or not product: return jsonify({"error": "المستخدم أو المنتج غير موجود"}), 404

        unit_price = Decimal(str(product.base_price))
        if not unit_price.is_finite() or unit_price < 0: raise ValueError("سعر المنتج غير صالح.")
        
        total_price = (unit_price * quantity).quantize(Decimal("0.0001"))
        old_balance = Decimal(str(user.balance or "0")).quantize(Decimal("0.0001"))

        if old_balance < total_price: return jsonify({"error": "رصيدك غير كافٍ"}), 400

        order_number = f"ORD-{uuid4().hex.upper()}"
        new_balance = old_balance - total_price

        user.balance = new_balance
        new_order = Order(order_number=order_number, user_id=user.id, product_id=product.id, quantity=quantity, unit_price=unit_price, total_price=total_price, status="pending", delivery_data=delivery_data)
        db.session.add(new_order)
        db.session.flush()

        record_transaction(user_id=user.id, action_type="purchase", amount=-total_price, balance_before=old_balance, balance_after=new_balance, reference=order_number, description=f"شراء {product.name}")
        db.session.commit()
        
        print(f"✅ Order Created: User {user.id} bought {product.name} for ${total_price}", flush=True)
        return jsonify({"success": True, "order_id": new_order.id, "new_balance": user.balance})

    except Exception as e:
        db.session.rollback()
        print("Buy Error:", e, flush=True)
        return jsonify({"error": str(e)}), 500

@public_bp.route('/ledger', methods=['GET', 'OPTIONS'])
def get_user_ledger():
    if request.method == 'OPTIONS': return jsonify({}), 200
    tg_id = request.args.get('telegram_id')
    if not tg_id: return jsonify({"error": "Missing ID"}), 400
    
    try:
        from app.models import User, FinancialLedger
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
        if not user: return jsonify([])
        
        records = db.session.query(FinancialLedger).filter_by(user_id=user.id).order_by(FinancialLedger.created_at.desc()).all()
        return jsonify([{
            "id": r.id,
            "type": r.action_type,
            "amount": float(r.amount),
            "before": float(r.balance_before),
            "after": float(r.balance_after),
            "ref": r.reference,
            "desc": r.description,
            "date": r.created_at.isoformat() if r.created_at else ''
        } for r in records])
    except Exception as e:
        return jsonify({"error": str(e)}), 500
