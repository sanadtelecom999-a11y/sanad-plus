import uuid
from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import User, Deposit, Transaction, Notification
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification, notify_admins


def get_current_user():
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        user_id = int(identity)
    except (ValueError, TypeError):
        return None
    return User.query.get(user_id)


@main.route("/api/deposits/", methods=["POST"])
@jwt_required()
def create_deposit():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    data = request.get_json() or {}
    amount = float(data.get("amount", 0))
    method = data.get("method", "")
    proof_image = data.get("proof_image", "")
    account_number = data.get("account_number", "")
    sender_name = data.get("sender_name", "")
    txid = data.get("txid", "")

    if amount <= 0:
        return jsonify({"error": "مبلغ غير صالح"}), 400

    deposit = Deposit(
        user_id=user.id,
        amount=amount,
        currency="USD",
        method=method,
        proof_image=proof_image,
        account_number=account_number,
        sender_name=sender_name,
        txid=txid,
        transaction_id="DEP-" + uuid.uuid4().hex[:8].upper(),
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(deposit)
    db.session.commit()

    notif = Notification(
        user_id=user.id,
        title="إيداع جديد",
        message=f"تم استلام طلب الإيداع بقيمة {amount}$ وهو قيد المراجعة",
        type="info",
    )
    db.session.add(notif)
    db.session.commit()

    send_telegram_notification(user.telegram_id, f"تم استلام طلب الإيداع بقيمة {amount}$ وهو قيد المراجعة")
    notify_admins(f"💰 إيداع جديد!\nالمستخدم: {user.telegram_id}\nالمبلغ: {amount}$\nالطريقة: {method}")

    return jsonify({
        "message": "تم إرسال طلب الإيداع بنجاح",
        "transaction_id": deposit.transaction_id,
    }), 201


@main.route("/api/deposits/my", methods=["GET"])
@jwt_required()
def get_my_deposits():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    deposits = Deposit.query.filter_by(user_id=user.id).order_by(Deposit.created_at.desc()).all()
    return jsonify([{
        "id": d.id,
        "amount": d.amount,
        "method": d.method,
        "status": d.status,
        "transaction_id": d.transaction_id,
        "admin_note": d.admin_note,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    } for d in deposits])