from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import User, KYCRequest, Notification, Transaction
from ..extensions import db
from . import main
import os

@main.route("/api/user/me", methods=["GET"])
def get_user():
    telegram_id = request.args.get("telegram_id")
    if telegram_id:
        user = User.query.filter_by(telegram_id=telegram_id).first()
        if user:
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
    return jsonify({"error": "مستخدم غير موجود"}), 404

@main.route("/api/kyc/submit", methods=["POST"])
def submit_kyc():
    data = request.get_json()
    telegram_id = data.get("telegram_id")
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    # التحقق من عدم وجود طلب قيد المراجعة
    existing = KYCRequest.query.filter_by(user_id=user.id, status="pending").first()
    if existing:
        return jsonify({"error": "لديك طلب توثيق قيد المراجعة بالفعل"}), 400

    kyc = KYCRequest(
        user_id=user.id,
        full_name=data.get("full_name"),
        phone=data.get("phone"),
        id_front_image=data.get("id_front_image"),
        id_back_image=data.get("id_back_image"),
        status="pending",
    )
    user.kyc_status = "pending"
    db.session.add(kyc)
    db.session.commit()

    # إشعار للمستخدم
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
    telegram_id = request.args.get("telegram_id")
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404
    kyc = KYCRequest.query.filter_by(user_id=user.id).order_by(KYCRequest.submitted_at.desc()).first()
    if not kyc:
        return jsonify({"status": "none"})
    return jsonify({
        "status": kyc.status,
        "full_name": kyc.full_name,
        "phone": kyc.phone,
        "submitted_at": kyc.submitted_at.isoformat() if kyc.submitted_at else None,
    })

@main.route("/api/user/notifications", methods=["GET"])
def get_notifications():
    telegram_id = request.args.get("telegram_id")
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