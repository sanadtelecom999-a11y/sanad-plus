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
        
    return jsonify({"success": True, "user_id": user.id})

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
        
    tg_id = str(user_data.get('id'))
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
        pms = db.session.query(PaymentMethod).all()
        return jsonify([{"id": p.id, "name": getattr(p, 'name', 'شام كاش'), "account": getattr(p, 'account', '')} for p in pms])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 6. إنشاء طلب إيداع جديد (شحن)
@public_bp.route('/deposits/create', methods=['POST', 'OPTIONS'])
def create_deposit():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    tg_id = data.get('telegram_id')
    amount = float(data.get('amount', 0))
    reference = data.get('reference', '')
    
    if not tg_id or amount <= 0:
        return jsonify({"error": "بيانات غير صالحة"}), 400
        
    try:
        from app.models import User, Deposit
        user = db.session.query(User).filter_by(telegram_id=int(tg_id)).first()
        if not user: return jsonify({"error": "المستخدم غير موجود"}), 404
        
        # إنشاء إيداع جديد (معلق)
        new_deposit = Deposit(
            user_id=user.id,
            amount=amount,
            transaction_id=reference,
            status='pending'
        )
        db.session.add(new_deposit)
        db.session.commit()
        return jsonify({"success": True, "deposit_id": new_deposit.id})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# 7. جلب إيداعات المستخدم
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


import os
import base64
from werkzeug.utils import secure_filename

# --- KYC Routes ---
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
        db.session.execute(text("""
            INSERT INTO kyc_requests (user_id, full_name, phone, governorate, region, id_front_url, selfie_url, status)
            VALUES (:uid, :name, :phone, :gov, :reg, :idf, :selfie, 'pending')
            ON CONFLICT (user_id) DO UPDATE SET 
            full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, governorate = EXCLUDED.governorate, 
            region = EXCLUDED.region, id_front_url = EXCLUDED.id_front_url, selfie_url = EXCLUDED.selfie_url, status = 'pending'
        """), {"uid": user.id, "name": full_name, "phone": phone, "gov": governorate, "reg": region, "idf": id_front_url, "selfie": selfie_url})
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
        
        # إنشاء جدول تذاكر مبسط إذا لم يكن موجوداً
        db.session.execute(text("""
            CREATE TABLE IF NOT EXISTS mini_support (
                id SERIAL PRIMARY KEY, user_id INT, sender VARCHAR(10), message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
        db.session.commit()
        
        rows = db.session.execute(text("SELECT id, sender, message, created_at FROM mini_support WHERE user_id = :uid ORDER BY created_at ASC"), {"uid": user.id}).fetchall()
        return jsonify([{"id": r[0], "sender": r[1], "message": r[2], "date": str(r[3])} for r in rows])
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
        
        db.session.execute(text("INSERT INTO mini_support (user_id, sender, message) VALUES (:uid, 'user', :msg)"), {"uid": user.id, "msg": msg})
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
