from flask import jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from ..blueprints import admin_bp
from ..extensions import db
from ..models import User, Order, Deposit

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    return jsonify({
        "total_users": db.session.query(func.count(User.id)).scalar() or 0,
        "total_orders": db.session.query(func.count(Order.id)).scalar() or 0,
        "total_deposits": db.session.query(func.count(Deposit.id)).scalar() or 0,
        "revenue": float(db.session.query(func.sum(Order.total_price)).scalar() or 0)
    }), 200
