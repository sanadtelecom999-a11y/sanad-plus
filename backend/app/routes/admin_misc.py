from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import SupportTicket, Category, Product, Deposit, Order, KYCRequest, PaymentMethod, SupportMessage

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
    return jsonify([{
        "id": t.id, "user_name": t.user.first_name if t.user else "مستخدم",
        "user_telegram": t.user.telegram_id if t.user else "-",
        "status": t.status, "updated_at": t.updated_at.isoformat() if t.updated_at else "",
        "last_message": t.messages[-1].message if t.messages else "لا توجد رسائل"
    } for t in tickets]), 200

@admin_bp.route('/support/tickets/<int:ticket_id>', methods=['GET'])
@jwt_required()
def get_ticket_messages(ticket_id):
    t = db.session.get(SupportTicket, ticket_id)
    if not t: return jsonify({"error": "Not found"}), 404
    return jsonify({
        "id": t.id,
        "messages": [{"sender_type": m.sender_type, "message": m.message, "created_at": m.created_at.isoformat()} for m in t.messages]
    }), 200

@admin_bp.route('/archive', methods=['GET'])
@jwt_required()
def get_archive():
    cats = Category.query.filter(Category.deleted_at.isnot(None)).all()
    prods = Product.query.filter(Product.deleted_at.isnot(None)).all()
    return jsonify({
        "categories": [{"id": c.id, "name": c.name} for c in cats],
        "products": [{"id": p.id, "name": p.name, "category_name": p.category.name if p.category else "غير محدد"} for p in prods]
    }), 200
