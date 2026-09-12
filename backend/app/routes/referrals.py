from datetime import datetime, timezone
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models.base import User, Referral, Notification, Transaction
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification

REFERRAL_REWARD = 1.0


def get_current_user():
    identity = get_jwt_identity()
    if not identity:
        return None
    try:
        user_id = int(identity)
    except (ValueError, TypeError):
        return None
    return User.query.get(user_id)


@main.route("/api/user/referrals", methods=["GET"])
@jwt_required()
def get_user_referrals():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    referrals = Referral.query.filter_by(referrer_id=user.id).order_by(Referral.created_at.desc()).all()
    return jsonify({
        "referral_code": user.referral_code,
        "referral_count": user.referral_count or 0,
        "referral_earnings": user.referral_earnings or 0.0,
        "referrals": [{
            "id": r.id,
            "referred_user_id": r.referred_user_id,
            "reward_amount": r.reward_amount,
            "status": r.status,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        } for r in referrals]
    }), 200


@main.route("/api/user/apply-referral", methods=["POST"])
@jwt_required()
def apply_referral():
    user = get_current_user()
    if not user:
        return jsonify({"error": "غير مصرح"}), 401

    data = request.get_json() or {}
    referral_code = (data.get("referral_code") or "").strip().upper()

    if not referral_code:
        return jsonify({"error": "كود الإحالة مطلوب"}), 400

    if user.orders:
        return jsonify({"error": "لا يمكن تطبيق كود الإحالة بعد أول طلب"}), 400

    if user.referred_by:
        return jsonify({"error": "تم تطبيق كود إحالة مسبقاً"}), 400

    referrer = User.query.filter_by(referral_code=referral_code).first()
    if not referrer:
        return jsonify({"error": "كود الإحالة غير صحيح"}), 404

    if referrer.id == user.id:
        return jsonify({"error": "لا يمكنك استخدام كودك الخاص"}), 400

    user.referred_by = referrer.telegram_id

    referral = Referral(
        referrer_id=referrer.id,
        referred_user_id=user.id,
        reward_amount=0.0,
        status="pending",
        created_at=datetime.now(timezone.utc),
    )
    db.session.add(referral)
    db.session.commit()

    return jsonify({
        "message": "تم تطبيق كود الإحالة بنجاح، ستحصل على مكافأة عند أول عملية شراء",
        "referral_id": referral.id,
    }), 200