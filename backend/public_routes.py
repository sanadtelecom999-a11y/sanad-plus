from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import User, Category

public_bp = Blueprint('public', __name__, url_prefix='/api')

# 1. مسار تسجيل الدخول للبوت
@public_bp.route('/bot/auth', methods=['POST', 'OPTIONS'])
def bot_auth():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    tg_id = data.get('telegram_id') or data.get('id')
    
    if not tg_id: return jsonify({"error": "Missing ID"}), 400
    
    user = db.session.query(User).filter_by(telegram_id=str(tg_id)).first()
    if not user:
        user = User(telegram_id=str(tg_id), first_name=data.get('first_name', 'User'), balance=0.0)
        db.session.add(user)
        db.session.commit()
        print(f"✅ تم تسجيل مستخدم جديد من البوت: {tg_id}", flush=True)
        
    return jsonify({"success": True, "user_id": user.id, "telegram_id": user.telegram_id})

# 2. مسار تسجيل الدخول للميني آب
@public_bp.route('/auth/telegram', methods=['POST', 'OPTIONS'])
def auth_telegram():
    if request.method == 'OPTIONS': return jsonify({}), 200
    return jsonify({"token": "dummy_token_for_now"})

# 3. مسار جلب بيانات الميني آب
@public_bp.route('/miniapp/init', methods=['POST', 'OPTIONS'])
def miniapp_init():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    tg_id = data.get('telegram_id')
    
    if not tg_id: return jsonify({"error": "Missing telegram_id"}), 400
        
    user = db.session.query(User).filter_by(telegram_id=str(tg_id)).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({
        "balance": float(user.balance) if user.balance else 0.0,
        "first_name": getattr(user, 'first_name', 'مستخدم')
    })

# 4. مسار جلب التصنيفات
@public_bp.route('/categories/', methods=['GET', 'OPTIONS'])
def get_categories():
    if request.method == 'OPTIONS': return jsonify({}), 200
    cats = db.session.query(Category).all()
    return jsonify([{
        "id": c.id, "name": c.name, "image": getattr(c, 'image', '')
    } for c in cats])
