from flask import jsonify, request
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
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
    status = request.args.get('status')
    query = SupportTicket.query
    if status in ('open', 'closed'):
        query = query.filter_by(status=status)
    tickets = query.order_by(SupportTicket.updated_at.desc()).all()
    
    result = []
    for ticket in tickets:
        last_message = SupportMessage.query.filter_by(ticket_id=ticket.id).order_by(SupportMessage.created_at.desc()).first()
        result.append({
            "id": ticket.id,
            "user_name": ticket.user.first_name if ticket.user else "مستخدم",
            "user_telegram": ticket.user.telegram_id if ticket.user else "-",
            "status": ticket.status,
            "updated_at": ticket.updated_at.isoformat() if ticket.updated_at else "",
            "last_message": last_message.message if last_message else "لا توجد رسائل"
        })
    return jsonify(result), 200

@admin_bp.route('/archive', methods=['GET'])
@jwt_required()
def get_archive():
    cats = Category.query.filter(Category.deleted_at.isnot(None)).all()
    prods = Product.query.filter(Product.deleted_at.isnot(None)).all()
    return jsonify({
        "categories": [{"id": c.id, "name": c.name, "image": c.image} for c in cats],
        "products": [{
            "id": p.id, "name": p.name, "image": p.image, "category_id": p.category_id,
            "category_name": p.category.name if p.category else "غير محدد"
        } for p in prods]
    }), 200
