import uuid
from datetime import datetime, timezone
from flask import request, jsonify
from ..models.base import User, KYCRequest, Notification, Transaction, ServiceRequest
from ..extensions import db
from . import main

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
        })
    return jsonify({"error": "telegram_id مطلوب"}), 400

@main.route("/api/kyc/submit", methods=["POST"])
def submit_kyc():
    data = request.get_json()
    telegram_id = data.get("telegram_id")
    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400

    user = get_or_create_user(
        telegram_id,
        data.get("first_name", ""),
        data.get("last_name", ""),
        data.get("username", "")
    )

    existing = KYCRequest.query.filter_by(user_id=user.id, status="pending").first()
    if existing:
        return jsonify({"error": "لديك طلب توثيق قيد المراجعة بالفعل"}), 400

    kyc = KYCRequest(
        user_id=user.id,
        full_name=data.get("full_name"),
        phone=data.get("phone"),
        address=data.get("address", ""),
        selfie_image=data.get("selfie_image", ""),
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
        "selfie_image": kyc.selfie_image,
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
    return jsonify({"message": "تم إرسال طلب الخدمة المخصصة"}), 200
