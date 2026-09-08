import uuid
from datetime import datetime, timezone
from flask import request, jsonify
from ..models.base import User, Deposit, Transaction, Notification
from ..extensions import db
from . import main

@main.route("/api/deposits/", methods=["POST"])
def create_deposit():
    data = request.get_json()
    telegram_id = data.get("telegram_id")
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

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

    # إشعار
    notif = Notification(
        user_id=user.id,
        title="إيداع جديد",
        message=f"تم استلام طلب الإيداع بقيمة {amount}$ وهو قيد المراجعة",
        type="info",
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({"message": "تم إرسال طلب الإيداع بنجاح", "transaction_id": deposit.transaction_id}), 201

@main.route("/api/deposits/my", methods=["GET"])
def get_my_deposits():
    telegram_id = request.args.get("telegram_id")
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify([])
    deposits = Deposit.query.filter_by(user_id=user.id).order_by(Deposit.created_at.desc()).all()
    return jsonify([{
        "id": d.id,
        "amount": d.amount,
        "method": d.method,
        "status": d.status,
        "transaction_id": d.transaction_id,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    } for d in deposits])