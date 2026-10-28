from flask import Blueprint, request, jsonify
from app.extensions import db
from app.models import User, Category
import os

public_bp = Blueprint('public_api', __name__, url_prefix='/api')

# 1. تسجيل الدخول عبر تيليجرام
@public_bp.route('/auth/telegram', methods=['POST', 'OPTIONS'])
def auth_telegram():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    init_data = data.get('initData')
    if not init_data:
        return jsonify({"error": "Missing initData"}), 400
    # حالياً نعيد توكن وهمي لتجاوز الحماية، لاحقاً يمكن التحقق من initData
    return jsonify({"token": "admin_token_placeholder"})

# 2. جلب بيانات المستخدم (الرصيد والاسم)
@public_bp.route('/miniapp/init', methods=['POST', 'OPTIONS'])
def miniapp_init():
    if request.method == 'OPTIONS': return jsonify({}), 200
    data = request.get_json(silent=True) or {}
    tg_id = data.get('telegram_id')
    
    if not tg_id:
        return jsonify({"error": "Missing telegram_id"}), 400
        
    user = db.session.query(User).filter_by(telegram_id=str(tg_id)).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({
        "balance": float(user.balance) if user.balance else 0.0,
        "first_name": getattr(user, 'first_name', 'مستخدم')
    })

# 3. جلب التصنيفات
@public_bp.route('/categories/', methods=['GET', 'OPTIONS'])
def get_categories():
    if request.method == 'OPTIONS': return jsonify({}), 200
    cats = db.session.query(Category).all()
    return jsonify([{
        "id": c.id,
        "name": c.name,
        "image": getattr(c, 'image', '')
    } for c in cats])
