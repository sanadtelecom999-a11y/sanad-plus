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
    
    user = db.session.query(User).filter_by(telegram_id=str(tg_id)).first()
    if not user:
        user = User(telegram_id=str(tg_id), first_name=data.get('first_name', 'User'), balance=0.0)
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
