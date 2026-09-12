import uuid
import base64
import binascii
import re
from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from ..models.base import User, KYCRequest, Notification, Transaction, ServiceRequest
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification, notify_admins


# ============================================================
# 🛡️ KYC Image Validation
# ============================================================
ALLOWED_MIME_TYPES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png":  [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
}
MAX_IMAGE_SIZE_BYTES = 500 * 1024
MAX_DATA_URL_LENGTH = 800 * 1024


def validate_kyc_image(data_url, field_name="selfie_image"):
    if not data_url or not isinstance(data_url, str):
        return False, f"{field_name}: الصورة مطلوبة"
    if len(data_url) > MAX_DATA_URL_LENGTH:
        return False, f"{field_name}: الصورة كبيرة جداً"
    if not data_url.startswith("data:image/"):
        return False, f"{field_name}: صيغة الصورة غير صحيحة"
    match = re.match(r"^data:(image/[a-z]+);base64,(.+)$", data_url, re.DOTALL)
    if not match:
        return False, f"{field_name}: صيغة Base64 غير صحيحة"
    mime_type, b64_data = match.group(1), match.group(2)
    if mime_type not in ALLOWED_MIME_TYPES:
        return False, f"{field_name}: صيغة غير مدعومة ({mime_type})"
    try:
        binary_data = base64.b64decode(b64_data, validate=True)
    except (binascii.Error, ValueError):
        return False, f"{field_name}: بيانات Base64 تالفة"
    if len(binary_data) > MAX_IMAGE_SIZE_BYTES:
        return False, f"{field_name}: حجم الصورة يتجاوز 500KB"
    if len(binary_data) < 100:
        return False, f"{field_name}: الصورة صغيرة جداً"
    signatures = ALLOWED_MIME_TYPES[mime_type]
    if not any(binary_data.startswith(sig) for sig in signatures):
        return False, f"{field_name}: محتوى الملف لا يطابق الصيغة"
    if mime_type == "image/webp":
        if len(binary_data) < 12 or binary_data[8:12] != b"WEBP":
            return False, f"{field_name}: ملف WebP تالف"
    return True, None


# ============================================================
# Helpers
# ============================================================
def get_current_user():
    """استخراج المستخدم من JWT"""
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        user_id = int(identity)
    except (ValueError, TypeError):
        return None
    return User.query.get(user_id)


def user_to_dict(user):
    return {
        "id": user.id,
        "telegram_id": user.telegram_id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "balance": user.balance,
        "kyc_status": user.kyc_status,
        "is_verified": user.is_verified,
        "role": user.role,
        "is_banned": user.is_banned,
        "vip_level": user.vip_level,
        "referral_code": user.referral_code,
    }


# ============================================================
# Endpoints — كلها محمية بـ JWT
# ============================================================
@main.route("/api/user/me", methods=["GET"])
@jwt_required()
def get_user():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401
    return jsonify(user_to_dict(user))


@main.route("/api/kyc/submit", methods=["POST"])
@jwt_required()
def submit_kyc():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    data = request.get_json() or {}

    existing = KYCRequest.query.filter_by(user_id=user.id, status="pending").first()
    if existing:
        return jsonify({"error": "لديك طلب توثيق قيد المراجعة بالفعل"}), 400

    full_name = (data.get("full_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()
    selfie_image = data.get("selfie_image", "")

    if len(full_name) < 3:
        return jsonify({"error": "الاسم الكامل مطلوب (3 أحرف على الأقل)"}), 400
    if not re.match(r"^\+?[0-9]{8,15}$", phone):
        return jsonify({"error": "رقم الهاتف غير صحيح"}), 400
    if len(address) < 3:
        return jsonify({"error": "العنوان مطلوب"}), 400

    is_valid, error_msg = validate_kyc_image(selfie_image, "selfie_image")
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    kyc = KYCRequest(
        user_id=user.id,
        full_name=full_name,
        phone=phone,
        address=address,
        selfie_image=selfie_image,
        status="pending",
        submitted_at=datetime.now(timezone.utc),
    )
    user.kyc_status = "pending"
    db.session.add(kyc)

    notif = Notification(
        user_id=user.id,
        title="طلب التوثيق",
        message="تم إرسال طلب التوثيق إلى الإدارة، انتظر حتى يتم التحقق من بياناتك خلال 24 ساعة",
        type="info",
    )
    db.session.add(notif)
    db.session.commit()

    send_telegram_notification(user.telegram_id, "تم إرسال طلب التوثيق بنجاح")
    notify_admins(f"🪪 طلب توثيق جديد!\nالمستخدم: {user.telegram_id}\nالاسم: {full_name}\nالهاتف: {phone}")

    return jsonify({"message": "تم إرسال طلب التوثيق بنجاح"}), 200


@main.route("/api/kyc/my", methods=["GET"])
@jwt_required()
def get_my_kyc():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    kyc = KYCRequest.query.filter_by(user_id=user.id).order_by(KYCRequest.submitted_at.desc()).first()
    if not kyc:
        return jsonify({"status": "none"})
    return jsonify({
        "status": kyc.status,
        "full_name": kyc.full_name,
        "phone": kyc.phone,
        "address": kyc.address,
        "submitted_at": kyc.submitted_at.isoformat() if kyc.submitted_at else None,
    })


@main.route("/api/user/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    notifications = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify([{
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "is_read": n.is_read,
        "type": n.type,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    } for n in notifications])


@main.route("/api/user/notifications/read", methods=["POST"])
@jwt_required()
def mark_notification_read():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    data = request.get_json() or {}
    notif_id = data.get("id")
    if notif_id:
        notif = Notification.query.filter_by(id=notif_id, user_id=user.id).first()
        if notif:
            notif.is_read = True
            db.session.commit()
    return jsonify({"success": True})


@main.route("/api/user/request-service", methods=["POST"])
@jwt_required()
def request_service():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    data = request.get_json() or {}
    service_name = data.get("service_name")
    description = data.get("description", "")
    estimated_price = data.get("estimated_price")

    if not service_name:
        return jsonify({"error": "اسم الخدمة مطلوب"}), 400

    req = ServiceRequest(
        user_id=user.id,
        service_name=service_name,
        description=description,
        estimated_price=estimated_price,
        status="pending",
        created_at=datetime.now(timezone.utc)
    )
    db.session.add(req)
    db.session.commit()

    notify_admins(f"🛠️ طلب خدمة مخصصة جديد!\nالمستخدم: {user.telegram_id}\nالخدمة: {service_name}")

    return jsonify({"message": "تم إرسال طلب الخدمة المخصصة"}), 200