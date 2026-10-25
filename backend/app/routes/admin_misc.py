from flask import jsonify
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..models import SupportTicket, SupportMessage, Category, Product, Deposit, Order, KYCRequest

@admin_bp.route('/inbox/counts', methods=['GET'])
@jwt_required()
def get_inbox_counts():
    return jsonify({
        "deposits": Deposit.query.filter_by(status='pending').count(),
        "orders": Order.query.filter_by(status='pending').count(),
        "kyc": KYCRequest.query.filter_by(status='pending').count()
    }), 200

@admin_bp.route('/support/tickets', methods=['GET'])
@jwt_required()
def get_tickets():
    tickets = SupportTicket.query.order_by(SupportTicket.updated_at.desc()).all()
    res = []
    for t in tickets:
        last_msg = SupportMessage.query.filter_by(ticket_id=t.id).order_by(SupportMessage.created_at.desc()).first()
        res.append({
            "id": t.id, "user_name": t.user.first_name if t.user else "مستخدم",
            "user_telegram": t.user.telegram_id if t.user else "-",
            "status": t.status, "updated_at": t.updated_at.isoformat() if t.updated_at else "",
            "last_message": last_msg.message if last_msg else "لا توجد رسائل"
        })
    return jsonify(res), 200

@admin_bp.route('/archive', methods=['GET'])
@jwt_required()
def get_archive():
    cats = Category.query.filter(Category.deleted_at.isnot(None)).all()
    prods = Product.query.filter(Product.deleted_at.isnot(None)).all()
    return jsonify({
        "categories": [{"id": c.id, "name": c.name, "image": c.image} for c in cats],
        "products": [{"id": p.id, "name": p.name, "image": p.image, "category_name": p.category.name if p.category else "غير محدد"} for p in prods]
    }), 200
