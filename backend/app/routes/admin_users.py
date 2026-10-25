from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import User

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    users = User.query.all()
    return jsonify([{
        "id": u.id,
        "telegram_id": u.telegram_id,
        "first_name": u.first_name,
        "username": u.username,
        "balance": float(u.balance) if u.balance else 0.0,
        "is_banned": u.is_banned
    } for u in users]), 200

@admin_bp.route('/users/<int:user_id>/ban', methods=['POST'])
@jwt_required()
def ban_user(user_id):
    data = request.json or {}
    is_banned = data.get('is_banned', False)
    
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": "المستخدم غير موجود"}), 404
        
    user.is_banned = is_banned
    db.session.commit()
    return jsonify({"success": True, "is_banned": user.is_banned}), 200

@admin_bp.route('/users/<int:user_id>/balance', methods=['POST'])
@jwt_required()
def adjust_balance(user_id):
    data = request.json or {}
    amount = data.get('amount')
    
    if amount is None:
        return jsonify({"error": "المبلغ مطلوب"}), 400
        
    try:
        # الحماية من التزامن (Race Condition)
        user = db.session.query(User).with_for_update().filter_by(id=user_id).first()
        if not user:
            return jsonify({"error": "المستخدم غير موجود"}), 404
            
        current_balance = float(user.balance) if user.balance else 0.0
        user.balance = current_balance + float(amount)
        db.session.commit()
        
        return jsonify({"success": True, "new_balance": float(user.balance)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
