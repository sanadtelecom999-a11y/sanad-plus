from sqlalchemy.orm import joinedload, selectinload
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from ..models.base import (
    User, Category, Product, ProductBundle, Order, Deposit, PaymentMethod,
    KYCRequest, Notification, Setting, AdminActivity, ServiceRequest,
    Transaction, Coupon, CouponUsage, Referral, FinancialAuditLog, log_financial,
    AdminOTPSession, UserProductDiscount
)
from ..services.cache_service import (
    cache_get, cache_set, cache_delete, key_admin_list, TTL_ADMIN_LISTS,
    invalidate_admin, invalidate_categories, invalidate_products,
    invalidate_payment_methods, invalidate_settings,
)
from ..services.cloudinary_service import get_signed_url, upload_base64_image
from flask import request, jsonify
from ..extensions import db
from ..services.telegram_service import send_deposit_approved, send_deposit_rejected, notify_admins, send_telegram_notification
from . import main
from .admin_utils import is_admin_user, handle_errors
from .admin import log_admin_activity, get_arabic_status
from flask_jwt_extended import jwt_required, get_jwt_identity
from .. import get_real_ip
import logging

logger = logging.getLogger(__name__)

@main.route("/admin/api/deposits/<int:deposit_id>/approve", methods=["POST", "OPTIONS"])
@jwt_required(optional=True)
@handle_errors
def admin_approve_deposit(deposit_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    # 1. جلب الإيداع مع قفل
    deposit = Deposit.query.filter_by(id=deposit_id).with_for_update().first()
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    # 2. جلب المستخدم مع قفل والتحقق من وجوده
    user = User.query.filter_by(id=deposit.user_id).with_for_update().first()
    if not user:
        db.session.rollback()
        return jsonify({"error": "المستخدم صاحب الإيداع غير موجود"}), 404

    # 3. الحسابات المالية
    deposit_fee = round(deposit.fee or 0, 2)
    dep_amount = round(deposit.amount, 2)
    net_amount = round(dep_amount - deposit_fee, 2)
    if net_amount < 0:
        net_amount = 0.0

    balance_before = round(user.balance, 2)
    current = round(user.balance, 2)
    paid_debt = 0.0
    added_amount = net_amount

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

    # 4. تحديث حالة الإيداع
    deposit.status = "approved"
    deposit.reviewed_at = datetime.now(timezone.utc)

    # 5. تسجيل العمليات
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
    log_admin_activity(f"قبول إيداع {deposit.id}")

    # 6. الحفظ في قاعدة البيانات (الخطوة الأهم)
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Commit failed for deposit {deposit.id}: {e}")
        return jsonify({"error": "فشل حفظ الرصيد في قاعدة البيانات"}), 500

    # 7. إرسال الإشعار فقط بعد نجاح الحفظ بنسبة 100%
    try:
        send_deposit_approved(user, dep_amount, paid_debt, added_amount)
    except Exception as e:
        logger.warning(f"Telegram notify failed for deposit {deposit.id}: {e}")

    invalidate_admin("deposits")
    notify_admins(f"إيداع {deposit.id}: {deposit.amount:.2f}$")

    return jsonify({"status": "approved", "paid_debt": paid_debt, "added": added_amount, "new_balance": user.balance}), 200

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



@main.route("/admin/api/deposits/<int:deposit_id>/reject", methods=["POST", "OPTIONS"])
@jwt_required(optional=True)
@handle_errors
def admin_reject_deposit(deposit_id):
    if request.method == "OPTIONS":
        return jsonify({}), 200
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
        
    deposit = Deposit.query.filter_by(id=deposit_id).with_for_update().first()
    if not deposit:
        return jsonify({"error": "إيداع غير موجود"}), 404
    if deposit.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    try:
        data = request.get_json() or {}
        reason = data.get("reason", "تم الرفض من قبل الإدارة")
    except:
        reason = "تم الرفض من قبل الإدارة"

    deposit.status = "rejected"
    deposit.reviewed_at = datetime.now(timezone.utc)
    log_admin_activity(f"رفض إيداع {deposit.id}")

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        logger.error(f"Commit failed for reject {deposit.id}: {e}")
        return jsonify({"error": "فشل حفظ الحالة"}), 500

    invalidate_admin("deposits")

    try:
        user = User.query.get(deposit.user_id)
        if user:
            send_deposit_rejected(user, deposit.amount, reason)
    except Exception as e:
        logger.warning(f"Telegram notify failed for reject {deposit.id}: {e}")

    return jsonify({"status": "rejected"}), 200
