from sqlalchemy.orm import joinedload
from decimal import Decimal
from datetime import datetime, timezone
from ..models.base import Deposit, User, Transaction, log_financial
from ..extensions import db
from ..services.telegram_service import send_deposit_approved, send_deposit_rejected
from . import main
from .admin_utils import is_admin_user, handle_errors
from ..services.cache_service import cache_delete, key_admin_list, invalidate_admin
from ..services.cloudinary_service import get_signed_url
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask import request, jsonify, current_app

@main.route("/admin/api/deposits/<int:deposit_id>/approve", methods=["POST", "OPTIONS"])
@jwt_required(optional=True)
@handle_errors
def admin_approve_deposit(deposit_id):
    if request.method == "OPTIONS": return jsonify({}), 200
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403

    try:
        deposit = Deposit.query.filter_by(id=deposit_id).with_for_update().first()
        if not deposit: return jsonify({"error": "إيداع غير موجود"}), 404
        if deposit.status != "pending": return jsonify({"error": "تمت معالجته مسبقاً"}), 400

        req_data = request.get_json(silent=True) or {}
        deposit.admin_note = req_data.get("admin_note", "")

        user = User.query.filter_by(id=deposit.user_id).with_for_update().first()
        if not user: return jsonify({"error": "المستخدم غير موجود"}), 404

        dep_amount = Decimal(str(deposit.amount)).quantize(Decimal("0.01"))
        deposit_fee = Decimal(str(deposit.fee or 0)).quantize(Decimal("0.01"))
        net_amount = max(dep_amount - deposit_fee, Decimal("0.00"))
        balance_before = Decimal(str(user.balance or 0)).quantize(Decimal("0.01"))
        
        user.balance = float(balance_before + net_amount)
        deposit.status = "approved"
        deposit.reviewed_at = datetime.now(timezone.utc)

        db.session.add(Transaction(user_id=user.id, type="deposit", amount=float(dep_amount), balance_after=float(user.balance), reference_type="deposit", reference_id=deposit.id))
        log_financial(user=user, action="deposit_approved", amount=float(dep_amount), balance_before=float(balance_before), balance_after=float(user.balance), ref_type="deposit", ref_id=deposit.id)
        
        db.session.commit()
        send_deposit_approved(user, float(dep_amount), 0, float(net_amount))
        return jsonify({"status": "approved"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@main.route("/admin/api/deposits", methods=["GET"])
@jwt_required()
@handle_errors
def admin_deposits():
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403
    deposits = Deposit.query.filter(Deposit.status == 'pending').options(joinedload(Deposit.user)).order_by(Deposit.created_at.desc()).all()
    result = []
    for d in deposits:
        result.append({
            "id": d.id, "transaction_id": d.transaction_id, "amount": d.amount, "method": d.method,
            "user_name": (d.user.first_name or d.user.username) if d.user else None, "user_telegram": d.user.telegram_id if d.user else None,
            "proof_image": get_signed_url(d.proof_image, expires_in=1800) if d.proof_image else None,
            "status": d.status, "created_at": d.created_at.isoformat() if d.created_at else None,
        })
    return jsonify(result)

@main.route("/admin/api/deposits/<int:deposit_id>/reject", methods=["POST", "OPTIONS"])
@jwt_required(optional=True)
@handle_errors
def admin_reject_deposit(deposit_id):
    if request.method == "OPTIONS": return jsonify({}), 200
    if not is_admin_user(get_jwt_identity()): return jsonify({"error": "غير مصرح"}), 403

    deposit = Deposit.query.filter_by(id=deposit_id).with_for_update().first()
    if not deposit: return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status != "pending": return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    req_data = request.get_json(silent=True) or {}
    reason = req_data.get("admin_note", "تم الرفض من قبل الإدارة")
    
    deposit.status = "rejected"
    deposit.reviewed_at = datetime.now(timezone.utc)
    deposit.admin_note = reason

    try:
        db.session.commit()
        user = User.query.get(deposit.user_id)
        if user: send_deposit_rejected(user, deposit.amount, reason)
        return jsonify({"status": "rejected"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# === إصلاح مسار المحادثة المباشرة ===
from ..models import SupportTicket, SupportMessage, db, User

@admin_bp.route('/support/start-chat', methods=['POST'])
@admin_required
def start_admin_chat():
    data = request.json
    user_id = data.get('user_id')
    message = data.get('message')
    if not user_id or not message:
        return jsonify({"error": "Missing data"}), 400
    try:
        user = User.query.get(user_id)
        if not user: return jsonify({"error": "User not found"}), 404
        
        ticket = SupportTicket.query.filter_by(user_id=user_id, status='open').first()
        if not ticket:
            ticket = SupportTicket(user_id=user_id, status='open')
            db.session.add(ticket)
            db.session.commit()
            
        msg = SupportMessage(ticket_id=ticket.id, sender_type='admin', message=message)
        db.session.add(msg)
        db.session.commit()
        return jsonify({"success": True, "ticket_id": ticket.id}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
