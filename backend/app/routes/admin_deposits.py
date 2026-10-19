"""Admin Deposits Routes"""
from flask import request, jsonify
from ..extensions import db
from ..models.base import User, Deposit, Notification, AdminActivity, log_financial
from ..services.telegram_service import send_deposit_approved, send_deposit_rejected
from ..services.cache_service import invalidate_admin
from . import main
from .admin import is_admin_user, handle_errors
from app.middleware import admin_required
from flask_jwt_extended import jwt_required, get_jwt_identity
from decimal import Decimal
from datetime import datetime, timezone
from app.models.base import FinancialAuditLog

@main.route("/admin/api/deposits", methods=["GET"])
@jwt_required()
@handle_errors
def admin_deposits():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    cached = cache_get(key_admin_list("deposits"))
    if cached is not None:
        return jsonify(cached)

    deposits = (
        Deposit.query
        .filter(Deposit.status == 'pending')
        .options(joinedload(Deposit.user))
        .order_by(Deposit.created_at.desc())
        .all()
    )

    result = []
    for d in deposits:
        user = d.user
        result.append({
            "id": d.id, "user_id": d.user_id,
            "user_telegram": user.telegram_id if user else None,
            "user_name": (user.first_name or user.username) if user else None,
            "amount": d.amount, "method": d.method, "method_id": d.method_id,
            "proof_image": get_signed_url(d.proof_image, expires_in=1800) if d.proof_image else None,
            "status": d.status, "transaction_id": d.transaction_id,
            "admin_note": d.admin_note,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        })

    cache_set(key_admin_list("deposits"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)

@main.route("/admin/api/deposits/<int:deposit_id>", methods=["GET"])
@jwt_required()
@handle_errors
def admin_deposit_detail(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    deposit = Deposit.query.get(deposit_id)
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404

    user = User.query.get(deposit.user_id)
    method_obj = PaymentMethod.query.get(deposit.method_id) if deposit.method_id else None

    return jsonify({
        "id": deposit.id,
        "transaction_id": deposit.transaction_id,
        "user": {
            "id": user.id if user else None,
            "telegram_id": user.telegram_id if user else None,
            "first_name": user.first_name if user else None,
            "last_name": user.last_name if user else None,
            "username": user.username if user else None,
            "balance": float(user.balance) if user and user.balance is not None else 0.0,
            "kyc_status": user.kyc_status if user else None,
        } if user else None,
        "amount": deposit.amount,
        "currency": deposit.currency,
        "method": deposit.method,
        "method_name": method_obj.name if method_obj else deposit.method,
        "method_account": method_obj.account if method_obj else None,
        "method_account_name": method_obj.account_name if method_obj else None,
        "sender_name": deposit.sender_name,
        "account_number": deposit.account_number,
        "txid": deposit.txid,
        "proof_image": get_signed_url(deposit.proof_image, expires_in=1800) if deposit.proof_image else None,
        "status": deposit.status,
        "admin_note": deposit.admin_note,
        "reviewed_by": deposit.reviewed_by,
        "reviewed_at": deposit.reviewed_at.isoformat() if deposit.reviewed_at else None,
        "created_at": deposit.created_at.isoformat() if deposit.created_at else None,
    })

@main.route("/admin/api/deposits/<int:deposit_id>/approve", methods=["POST"])
@jwt_required()
@handle_errors
def admin_approve_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.filter_by(id=deposit_id).with_for_update().first()
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    deposit.status = "approved"
    deposit.reviewed_at = datetime.now(timezone.utc)
    user = User.query.filter_by(id=deposit.user_id).with_for_update().first()

    # 🆕 v18.3.6: اخصم الرسوم أولاً
    deposit_fee = round(deposit.fee or 0, 2)
    dep_amount = round(deposit.amount, 2)
    net_amount = round(dep_amount - deposit_fee, 2)
    if net_amount < 0:
        net_amount = 0.0

    paid_debt = 0.0
    added_amount = net_amount

    if user:
        balance_before = round(user.balance, 2)
        current = round(user.balance, 2)

        if current < 0:
            debt = abs(current)
            if net_amount >= debt:
                paid_debt = round(debt, 2)
                added_amount = round(net_amount - debt, 2)
                user.balance = added_amount
            else:
                paid_debt = net_amount
                added_amount = 0.0
                user.balance = round(current + net_amount, 2)
        else:
            user.balance = round(current + net_amount, 2)
            added_amount = net_amount

        user.balance = round(user.balance, 2)

        db.session.add(Transaction(
            user_id=user.id, type="deposit", amount=dep_amount,
            balance_after=user.balance, reference_type="deposit", reference_id=deposit.id,
        ))
        log_financial(
            user=user, action="deposit_approved", amount=dep_amount,
            balance_before=balance_before, balance_after=user.balance,
            ref_type="deposit", ref_id=deposit.id,
        )
        db.session.add(Notification(
            user_id=user.id, title="إيداع مقبول",
            message=f"تم قبول إيداعك بقيمة {dep_amount:.2f}$", type="success",
        ))
        send_deposit_approved(user, dep_amount, paid_debt, added_amount)

    log_admin_activity(f"قبول إيداع {deposit.id}")
    db.session.commit()

    invalidate_admin("deposits")

    notify_admins(f"إيداع {deposit.id}: {deposit.amount:.2f}$")
    return jsonify({"status": deposit.status, "paid_debt": paid_debt, "added": added_amount})

@main.route("/admin/api/deposits/<int:deposit_id>/reject", methods=["POST"])
@jwt_required()
@handle_errors
def admin_reject_deposit(deposit_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    deposit = Deposit.query.filter_by(id=deposit_id).with_for_update().first()
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    data = request.get_json() or {}
    reason = data.get("reason", "")

    deposit.status = "rejected"
    deposit.reviewed_at = datetime.now(timezone.utc)
    if reason:
        deposit.admin_note = reason

    user = User.query.filter_by(id=deposit.user_id).with_for_update().first()
    if user:
        db.session.add(Notification(
            user_id=user.id, title="إيداع مرفوض",
            message=f"تم رفض إيداعك بقيمة {deposit.amount:.2f}$" + (f" - {reason}" if reason else ""),
            type="warning",
        ))

    log_admin_activity(f"رفض إيداع {deposit.id}")
    db.session.commit()

    invalidate_admin("deposits")

    if user:
        send_deposit_rejected(user, deposit.amount, reason)

    notify_admins(f"رفض إيداع {deposit.id}: {deposit.amount:.2f}$")
    return jsonify({"status": deposit.status})