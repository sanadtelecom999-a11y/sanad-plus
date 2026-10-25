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
        "product_name": o.product.name if o.product else "منتج غير متاح",
        "product_image": o.product.image if o.product else None,
        "quantity": o.quantity, "unit_price": float(o.unit_price or 0),
        "total_price": float(o.total_price or 0), "discount_amount": float(o.discount_amount or 0),
        "coupon_code": o.coupon_code, "payment_method": o.payment_method,
        "delivery_data": o.delivery_data, "status": o.status, "status_arabic": o.status,
        "admin_note": o.admin_note, "created_at": o.created_at.isoformat() if o.created_at else ""
    } for o in orders]), 200

@admin_bp.route('/orders/<int:order_id>/full', methods=['GET'])
@jwt_required()
def get_order_full(order_id):
    o = db.session.get(Order, order_id)
    if not o: return jsonify({"error": "الطلب غير موجود"}), 404
    return jsonify({
        "id": o.id, "order_number": o.order_number,
        "user": {
            "first_name": o.user.first_name if o.user else "",
            "last_name": o.user.last_name if o.user else "",
            "telegram_id": o.user.telegram_id if o.user else "",
            "username": o.user.username if o.user else "",
        },
        "product": {
            "id": o.product.id if o.product else None,
            "name": o.product.name if o.product else "منتج غير متاح",
            "image": o.product.image if o.product else None,
        },
        "quantity": o.quantity, "unit_price": float(o.unit_price or 0),
        "total_price": float(o.total_price or 0), "discount_amount": float(o.discount_amount or 0),
        "coupon_code": o.coupon_code, "payment_method": o.payment_method,
        "delivery_data": o.delivery_data, "status": o.status, "status_arabic": o.status,
        "admin_note": o.admin_note, "created_at": o.created_at.isoformat() if o.created_at else "",
        "updated_at": o.updated_at.isoformat() if o.updated_at else "",
        "completed_at": o.completed_at.isoformat() if o.completed_at else "",
        "failed_at": o.failed_at.isoformat() if o.failed_at else "",
        "cancelled_at": o.cancelled_at.isoformat() if o.cancelled_at else "",
    }), 200

@admin_bp.route('/kyc', methods=['GET'])
@jwt_required()
def get_kyc():
    kyc = KYCRequest.query.filter_by(status='pending').all()
    return jsonify([{"id": k.id, "full_name": k.full_name, "phone": k.phone, "status": k.status, "user_telegram": k.user.telegram_id if k.user else ""} for k in kyc]), 200
