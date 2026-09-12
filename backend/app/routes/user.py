import uuid
import base64
import binascii
import re
from datetime import datetime, timezone
from flask import request, jsonify
from ..models.base import User, KYCRequest, Notification, Transaction, ServiceRequest
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification, notify_admins


# ============================================================
# 🛡️ KYC Image Validation — 3 طبقات حماية
# ============================================================

ALLOWED_MIME_TYPES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png":  [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],
}

MAX_IMAGE_SIZE_BYTES = 500 * 1024       # 500 KB
MAX_DATA_URL_LENGTH = 800 * 1024        # ~800 KB (Base64 أطول 33%)


def validate_kyc_image(data_url, field_name="selfie_image"):
    """
    تحقق من صورة KYC على 3 طبقات:
    1. MIME مسموح
    2. Base64 صحيح
    3. Magic Bytes (المحتوى الحقيقي)
    """
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

    # Magic Bytes — الأهم
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
def get_or_create_user(telegram_id, first_name="", last_name="", username=""):
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        user = User(
            telegram_id=telegram_id,
            first_name=first_name,
            last_name=last_name,
            username=username,
            balance=0.0,
            kyc_status='unverified',
            is_verified=False,
            role='user',
            vip_level=0,
            referral_code=uuid.uuid4().hex[:8].upper(),
            created_at=datetime.now(timezone.utc)
        )
        db.session.add(user)
        db.session.commit()
    else:
        changed = False
        if user.first_name != first_name:
            user.first_name = first_name
            changed = True
        if user.last_name != last_name:
            user.last_name = last_name
            changed = True
        if user.username != username:
            user.username = username
            changed = True
        if changed:
            db.session.commit()
    return user


# ============================================================
# Endpoints
# ============================================================
@main.route("/api/user/me", methods=["GET"])
def get_user():
    telegram_id = request.args.get("telegram_id", type=int)
    if telegram_id:
        user = get_or_create_user(telegram_id)
        return jsonify({
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
        })
    return jsonify({"error": "telegram_id مطلوب"}), 400


@main.route("/api/kyc/submit", methods=["POST"])
def submit_kyc():
    data = request.get_json()
    telegram_id = data.get("telegram_id")
    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400

    user = get_or_create_user(telegram_id)

    # فحص وجود طلب معلّق
    existing = KYCRequest.query.filter_by(user_id=user.id, status="pending").first()
    if existing:
        return jsonify({"error": "لديك طلب توثيق قيد المراجعة بالفعل"}), 400

    # استخراج الحقول
    full_name = (data.get("full_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()
    selfie_image = data.get("selfie_image", "")

    # فحوصات نصية
    if len(full_name) < 3:
        return jsonify({"error": "الاسم الكامل مطلوب (3 أحرف على الأقل)"}), 400

    if not re.match(r"^\+?[0-9]{8,15}$", phone):
        return jsonify({"error": "رقم الهاتف غير صحيح"}), 400

    if len(address) < 3:
        return jsonify({"error": "العنوان مطلوب"}), 400

    # 🛡️ فحص الصورة
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
def get_my_kyc():
    telegram_id = request.args.get("telegram_id", type=int)
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({"status": "none"})
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
def get_notifications():
    telegram_id = request.args.get("telegram_id", type=int)
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify([])
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
def mark_notification_read():
    data = request.get_json()
    notif_id = data.get("id")
    if notif_id:
        notif = Notification.query.get(notif_id)
        if notif:
            notif.is_read = True
            db.session.commit()
    return jsonify({"success": True})


@main.route("/api/user/request-service", methods=["POST"])
def request_service():
    data = request.get_json()
    telegram_id = data.get("telegram_id")
    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400
    user = get_or_create_user(telegram_id)
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