# ============================================================
# 💰 Deposits Routes — v2.2.2 (with size validation)
# ============================================================
import uuid
from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import User, Deposit, Transaction, Notification, log_financial, PaymentMethod
from ..extensions import db
from . import main
from ..services.telegram_service import notify_admins

# 🎯 الحد الأقصى لصورة الإثبات (2 MB base64)
MAX_PROOF_SIZE_BYTES = 2 * 1024 * 1024           # 2 MB
MAX_PROOF_BASE64_LENGTH = int(MAX_PROOF_SIZE_BYTES * 1.4)  # ~2.8 MB


def get_current_user():
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        return User.query.get(int(identity))
    except (ValueError, TypeError):
        return None


@main.route("/api/deposits/", methods=["POST"])
@jwt_required()
def create_deposit():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    if user.kyc_status != "verified" and not user.is_verified:
        return jsonify({
            "error": "يجب توثيق حسابك أولاً قبل الإيداع",
            "code": "KYC_REQUIRED",
        }), 403

    data = request.get_json() or {}

    idempotency_key = data.get("idempotency_key")
    if idempotency_key:
        existing = Deposit.query.filter_by(idempotency_key=idempotency_key).first()
        if existing:
            return jsonify({
                "id": existing.id,
                "transaction_id": existing.transaction_id,
                "status": existing.status,
                "message": "طلب إيداع مكرر — تم إرجاعه من السجل",
            }), 200

    amount = float(data.get("amount", 0))
    method = data.get("method", "")
    method_id = data.get("method_id")
    proof_image = data.get("proof_image", "")
    account_number = data.get("account_number", "")
    sender_name = data.get("sender_name", "")
    txid = (data.get("txid") or "").strip()

    if amount <= 0:
        return jsonify({"error": "مبلغ غير صالح"}), 400

    # 🔒 Validate image size BEFORE processing
    if proof_image and isinstance(proof_image, str):
        if len(proof_image) > MAX_PROOF_BASE64_LENGTH:
            size_mb = round(len(proof_image) / 1024 / 1024, 2)
            return jsonify({
                "error": f"صورة الإثبات كبيرة جداً ({size_mb} MB) — الحد الأقصى 2 MB",
                "code": "IMAGE_TOO_LARGE",
            }), 413

    if txid:
        existing = Deposit.query.filter_by(user_id=user.id, txid=txid).first()
        if existing:
            return jsonify({
                "error": "رقم العملية مُستخدم مسبقاً",
                "code": "DEPOSIT_DUPLICATE",
            }), 400

    try:
        method_id_int = int(method_id) if method_id else None
        if not method_id_int and method and method.isdigit():
            method_id_int = int(method)
    except (ValueError, TypeError):
        method_id_int = None

    if method_id_int:
        pm = PaymentMethod.query.get(method_id_int)
        if not pm or not pm.is_active:
            return jsonify({"error": "طريقة الدفع غير متاحة"}), 400
        if pm.requires_kyc and not user.is_verified:
            return jsonify({"error": "هذه الطريقة تتطلب توثيق الحساب", "code": "KYC_REQUIRED"}), 403

    # 📦 Store base64 as-is (no Cloudinary for deposits — privacy)
    deposit = Deposit(
        user_id=user.id,
        amount=amount,
        currency="USD",
        method=method or (str(method_id_int) if method_id_int else ""),
        method_id=method_id_int,
        proof_image=proof_image,
        account_number=account_number,
        sender_name=sender_name,
        txid=txid or None,
        transaction_id="DEP-" + uuid.uuid4().hex[:8].upper(),
        status="pending",
        idempotency_key=idempotency_key or uuid.uuid4().hex,
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(deposit)

    db.session.add(Notification(
        user_id=user.id, title="إيداع جديد",
        message=f"تم استلام طلب إيداعك بقيمة {amount:.2f}$", type="info",
    ))

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            return jsonify({"error": "طلب مكرر أو رقم عملية مُستخدم", "code": "DEPOSIT_DUPLICATE"}), 400
        return jsonify({"error": f"فشل الحفظ: {e}"}), 500

    notify_admins(
        f"إيداع جديد\n"
        f"المستخدم: {user.telegram_id}\n"
        f"المبلغ: {amount:.2f}$\n"
        f"الطريقة: {method}"
    )

    return jsonify({
        "message": "تم إرسال طلب الإيداع بنجاح",
        "transaction_id": deposit.transaction_id,
        "deposit_id": deposit.id,
    }), 201


@main.route("/api/deposits/my", methods=["GET"])
@jwt_required()
def get_my_deposits():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    deposits = Deposit.query.filter_by(user_id=user.id).order_by(Deposit.created_at.desc()).all()
    return jsonify([{
        "id": d.id, "amount": d.amount, "method": d.method,
        "status": d.status, "transaction_id": d.transaction_id,
        "admin_note": d.admin_note,
        "created_at": d.created_at.isoformat() if d.created_at else None,
    } for d in deposits])