from flask import jsonify
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..models import SupportTicket, Category, Product, Deposit, Order, KYCRequest

@admin_bp.route('/inbox/counts', methods=['GET'])
@jwt_required()
def get_inbox_counts():
    d = Deposit.query.filter_by(status='pending').count()
    o = Order.query.filter_by(status='pending').count()
    k = KYCRequest.query.filter_by(status='pending').count()
    return jsonify({"deposits": d, "orders": o, "kyc": k}), 200

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

@admin_bp.route('/archive', methods=['GET'])
@jwt_required()
def get_archive():
    cats = Category.query.filter(Category.deleted_at.isnot(None)).all()
    prods = Product.query.filter(Product.deleted_at.isnot(None)).all()
    return jsonify({
        "categories": [{"id": c.id, "name": c.name} for c in cats],
        "products": [{"id": p.id, "name": p.name, "category_name": p.category.name if p.category else "غير محدد"} for p in prods]
    }), 200
