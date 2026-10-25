from flask import jsonify
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import Deposit, Order, KYCRequest

@admin_bp.route('/deposits', methods=['GET'])
@jwt_required()
def get_deposits():
    deposits = Deposit.query.filter_by(status='pending').order_by(Deposit.created_at.desc()).all()
    return jsonify([{
        "id": d.id, "user_name": d.user.first_name if d.user else "مستخدم",
        "user_telegram": d.user.telegram_id if d.user else "",
        "amount": float(d.amount), "transaction_id": f"DEP-{d.id}", "status": d.status
    } for d in deposits]), 200

@admin_bp.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    orders = Order.query.filter_by(status='pending').order_by(Order.created_at.desc()).all()
    return jsonify([{
        "id": o.id, "order_number": o.order_number,
        "user_name": o.user.first_name if o.user else "مستخدم",
        "user_telegram": o.user.telegram_id if o.user else "",
        "product_name": "منتج", "quantity": 1, "total_price": float(o.total_price), 
        "status": o.status, "created_at": o.created_at.isoformat() if o.created_at else ""
    } for o in orders]), 200

@admin_bp.route('/orders/<int:order_id>/full', methods=['GET'])
@jwt_required()
def get_order_full(order_id):
    o = db.session.get(Order, order_id)
    if not o: return jsonify({"error": "Not found"}), 404
    return jsonify({
        "order_number": o.order_number,
        "user": {"first_name": o.user.first_name if o.user else "", "telegram_id": o.user.telegram_id if o.user else ""},
        "product": {"name": "منتج"}, "quantity": 1, "total_price": float(o.total_price),
        "status": o.status, "status_arabic": o.status, "delivery_data": "بيانات التسليم",
        "created_at": o.created_at.isoformat() if o.created_at else ""
    }), 200

@admin_bp.route('/kyc', methods=['GET'])
@jwt_required()
def get_kyc():
    kyc = KYCRequest.query.filter_by(status='pending').all()
    return jsonify([{"id": k.id, "full_name": k.full_name, "phone": k.phone, "status": k.status, "user_telegram": k.user.telegram_id if k.user else ""} for k in kyc]), 200
