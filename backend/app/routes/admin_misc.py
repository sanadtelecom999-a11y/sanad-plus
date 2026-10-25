from flask import jsonify
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import PaymentMethod, SupportTicket, SupportMessage, Deposit, Order, User

@admin_bp.route('/payment-methods', methods=['GET'])
@jwt_required()
def get_payment_methods():
    pms = PaymentMethod.query.filter_by(deleted_at=None).all()
    return jsonify([{
        "id": pm.id, "name": pm.name, "account": pm.account, "icon": pm.icon,
        "min_amount": float(pm.min_amount or 0), "max_amount": float(pm.max_amount or 0)
    } for pm in pms]), 200

@admin_bp.route('/support/tickets', methods=['GET'])
@jwt_required()
def get_tickets():
    tickets = SupportTicket.query.order_by(SupportTicket.updated_at.desc()).all()
    return jsonify([{
        "id": t.id, "user_name": t.user.first_name if t.user else "مستخدم",
        "user_telegram": t.user.telegram_id if t.user else "-",
        "status": t.status, "updated_at": t.updated_at.isoformat() if t.updated_at else "",
        "last_message": t.messages[-1].message if t.messages else "لا توجد رسائل"
    } for t in tickets]), 200

@admin_bp.route('/inbox/counts', methods=['GET'])
@jwt_required()
def get_inbox_counts():
    # إرجاع أرقام وهمية كبداية حتى لا تظهر أخطاء في الواجهة
    return jsonify({"deposits": 0, "orders": 0, "kyc": 0}), 200

@admin_bp.route('/archive', methods=['GET'])
@jwt_required()
def get_archive():
    return jsonify({"categories": [], "products": []}), 200
