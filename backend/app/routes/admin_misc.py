from flask import jsonify
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import PaymentMethod, SupportTicket, Deposit, Order, User, Category, Product, KYCRequest

@admin_bp.route('/orders', methods=['GET'])
@jwt_required()
def get_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return jsonify([{
        "id": o.id, "order_number": o.order_number,
        "user_name": o.user.first_name if o.user else "Unknown",
        "user_telegram": o.user.telegram_id if o.user else "",
        "product_name": "منتج", "total_price": float(o.total_price or 0), 
        "status": o.status, "created_at": o.created_at.isoformat() if o.created_at else ""
    } for o in orders]), 200

@admin_bp.route('/kyc', methods=['GET'])
@jwt_required()
def get_kyc():
    kyc = KYCRequest.query.filter_by(status='pending').all()
    return jsonify([{
        "id": k.id, "full_name": k.full_name, "phone": k.phone,
        "status": k.status, "user_telegram": k.user.telegram_id if k.user else ""
    } for k in kyc]), 200

@admin_bp.route('/archive', methods=['GET'])
@jwt_required()
def get_archive():
    cats = Category.query.filter(Category.deleted_at.isnot(None)).all()
    prods = Product.query.filter(Product.deleted_at.isnot(None)).all()
    return jsonify({
        "categories": [{"id": c.id, "name": c.name} for c in cats],
        "products": [{"id": p.id, "name": p.name, "category_name": p.category.name if p.category else "غير محدد"} for p in prods]
    }), 200

@admin_bp.route('/support/tickets', methods=['GET'])
@jwt_required()
def get_tickets():
    tickets = SupportTicket.query.order_by(SupportTicket.updated_at.desc()).all()
    res = []
    for t in tickets:
        last_msg = t.messages[-1].message if t.messages else "لا توجد رسائل"
        res.append({
            "id": t.id, "user_name": t.user.first_name if t.user else "مستخدم",
            "user_telegram": t.user.telegram_id if t.user else "-",
            "status": t.status, "updated_at": t.updated_at.isoformat() if t.updated_at else "",
            "last_message": last_msg
        })
    return jsonify(res), 200

@admin_bp.route('/inbox/counts', methods=['GET'])
@jwt_required()
def get_inbox_counts():
    deposits = Deposit.query.filter_by(status='pending').count()
    orders = Order.query.filter_by(status='pending').count()
    kyc = KYCRequest.query.filter_by(status='pending').count()
    return jsonify({"deposits": deposits, "orders": orders, "kyc": kyc}), 200
