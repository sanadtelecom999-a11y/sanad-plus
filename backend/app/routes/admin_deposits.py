from flask import jsonify
from flask_jwt_extended import jwt_required
from ..blueprints import admin_bp
from ..extensions import db
from ..models import User, Deposit, FinancialAuditLog

@admin_bp.route('/deposits', methods=['GET'])
@jwt_required()
def get_deposits():
    deposits = Deposit.query.order_by(Deposit.created_at.desc()).all()
    return jsonify([{
        "id": d.id, "user_id": d.user_id, "amount": float(d.amount), "status": d.status
    } for d in deposits]), 200

@admin_bp.route('/deposits/<int:deposit_id>/approve', methods=['POST'])
@jwt_required()
def approve_deposit(deposit_id):
    try:
        # قفل السجل لمنع الضغط المزدوج (Race Condition Protection)
        deposit = db.session.query(Deposit).with_for_update().filter_by(id=deposit_id).first()
        if not deposit:
            return jsonify({"error": "الإيداع غير موجود"}), 404
        if deposit.status != 'pending':
            return jsonify({"error": "تمت معالجة هذا الإيداع مسبقاً"}), 400

        user = db.session.query(User).with_for_update().filter_by(id=deposit.user_id).first()
        if not user:
            return jsonify({"error": "المستخدم غير موجود"}), 404

        balance_before = float(user.balance) if user.balance else 0.0
        user.balance = balance_before + float(deposit.amount)
        deposit.status = 'approved'

        # تسجيل الحركة في سجل التدقيق
        audit = FinancialAuditLog(
            user_id=user.id, action='deposit_approved',
            amount=float(deposit.amount),
            balance_before=balance_before, balance_after=float(user.balance)
        )
        db.session.add(audit)
        db.session.commit()
        
        return jsonify({"success": True, "new_balance": float(user.balance)}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
