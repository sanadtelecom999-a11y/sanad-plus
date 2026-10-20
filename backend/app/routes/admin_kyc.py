"""Admin KYC Routes - Extracted from admin.py"""
from flask import request, jsonify
from ..extensions import db
from ..models.base import User, KYCRequest, Notification, AdminActivity, log_financial
from ..services.telegram_service import send_kyc_approved, send_kyc_rejected
from ..services.cloudinary_service import get_signed_url
from ..services.cache_service import invalidate_admin, cache_get
from . import main
from .admin import is_admin_user, handle_errors
from flask_jwt_extended import jwt_required, get_jwt_identity

@main.route("/admin/api/users/<int:user_id>/kyc", methods=["POST"])
@jwt_required()
@handle_errors
def admin_toggle_kyc(user_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    data = request.get_json() or {}
    new_status = data.get("status")
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    if new_status == "verified":
        user.kyc_status = "verified"
        user.is_verified = True
    elif new_status == "unverified":
        user.kyc_status = "unverified"
        user.is_verified = False

    log_admin_activity(f"تغيير توثيق المستخدم {user.telegram_id}")
    db.session.commit()
    return jsonify({"kyc_status": user.kyc_status, "is_verified": user.is_verified})

@main.route("/admin/api/kyc", methods=["GET"])
@jwt_required()
@handle_errors
def admin_kyc():
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403

    cached = cache_get(key_admin_list("kyc"))
    if cached is not None:
        return jsonify(cached)

    kycs = (
        KYCRequest.query
        .filter(KYCRequest.status == 'pending')
        .options(joinedload(KYCRequest.user))
        .order_by(KYCRequest.submitted_at.desc())
        .all()
    )

    result = [{
        "id": k.id, "user_id": k.user_id, "full_name": k.full_name,
        "phone": k.phone, "address": k.address,
        "selfie_image": get_signed_url(k.selfie_image, expires_in=1800) if k.selfie_image else None,
        "status": k.status,
        "submitted_at": k.submitted_at.isoformat() if k.submitted_at else None,
    } for k in kycs]

    cache_set(key_admin_list("kyc"), result, ttl=TTL_ADMIN_LISTS)
    return jsonify(result)

@main.route("/admin/api/kyc/<int:kyc_id>/approve", methods=["POST"])
@jwt_required()
@handle_errors
def admin_approve_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.filter_by(id=kyc_id).with_for_update().first()
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404

    if kyc.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    kyc.status = "approved"
    kyc.reviewed_at = datetime.now(timezone.utc)
    user = User.query.filter_by(id=kyc.user_id).with_for_update().first()
    if user:
        user.kyc_status = "verified"
        user.is_verified = True
        db.session.add(Notification(
            user_id=user.id, title="تم توثيق حسابك",
            message="تم قبول طلب التوثيق", type="success",
        ))

    log_admin_activity(f"قبول KYC للمستخدم {kyc.user_id}")
    db.session.commit()

    invalidate_admin("kyc")

    if user:
        send_kyc_approved(user)

    notify_admins(f"KYC {kyc.user_id}")
    return jsonify({"status": "approved"})

@main.route("/admin/api/kyc/<int:kyc_id>/reject", methods=["POST"])
@jwt_required()
@handle_errors
def admin_reject_kyc(kyc_id):
    if not is_admin_user(get_jwt_identity()):
        return jsonify({"error": "غير مصرح"}), 403
    kyc = KYCRequest.query.filter_by(id=kyc_id).with_for_update().first()
    if not kyc:
        return jsonify({"error": "طلب غير موجود"}), 404

    data = request.get_json() or {}
    reason = data.get("reason", "")

    if kyc.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400

    kyc.status = "rejected"
    kyc.reviewed_at = datetime.now(timezone.utc)
    if reason:
        kyc.admin_note = reason

    user = User.query.filter_by(id=kyc.user_id).with_for_update().first()
    if user:
        user.kyc_status = "unverified"
        user.is_verified = False
        db.session.add(Notification(
            user_id=user.id, title="رفض التوثيق",
            message="تم رفض طلب التوثيق" + (f" - {reason}" if reason else ""),
            type="warning",
        ))

    log_admin_activity(f"رفض KYC للمستخدم {kyc.user_id}")
    db.session.commit()

    invalidate_admin("kyc")

    if user:
        send_kyc_rejected(user, reason)

    notify_admins(f"رفض KYC {kyc.user_id}")
    return jsonify({"status": "rejected"})