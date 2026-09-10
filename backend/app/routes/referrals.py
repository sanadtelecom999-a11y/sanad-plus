from datetime import datetime, timezone
from flask import request, jsonify
from ..models.base import User, Referral, Notification, Transaction
from ..extensions import db
from . import main
from ..services.telegram_service import send_telegram_notification

REFERRAL_REWARD = 1.0  # قيمة المكافأة بالدولار

@main.route("/api/user/referrals", methods=["GET"])
def get_user_referrals():
    """جلب معلومات إحالات المستخدم"""
    telegram_id = request.args.get("telegram_id", type=int)
    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400

    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

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
def apply_referral():
    """تطبيق كود إحالة عند تسجيل مستخدم جديد"""
    data = request.get_json()
    telegram_id = data.get("telegram_id")
    referral_code = (data.get("referral_code") or "").strip().upper()

    if not telegram_id or not referral_code:
        return jsonify({"error": "بيانات ناقصة"}), 400

    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        return jsonify({"error": "مستخدم غير موجود"}), 404

    # التأكد أن المستخدم جديد (ليس لديه طلبات)
    if user.orders:
        return jsonify({"error": "لا يمكن تطبيق كود الإحالة بعد أول طلب"}), 400

    # التأكد من عدم تطبيق كود إحالة سابقاً
    if user.referred_by:
        return jsonify({"error": "تم تطبيق كود إحالة مسبقاً"}), 400

    # البحث عن المستخدم صاحب الكود
    referrer = User.query.filter_by(referral_code=referral_code).first()
    if not referrer:
        return jsonify({"error": "كود الإحالة غير صحيح"}), 404

    # التأكد من عدم استخدام الكود لنفسه
    if referrer.id == user.id:
        return jsonify({"error": "لا يمكنك استخدام كودك الخاص"}), 400

    # تسجيل الإحالة
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

def complete_referral_reward(user):
    """
    منح مكافأة الإحالة عند إتمام أول عملية شراء للمستخدم
    تُستدعى هذه الدالة من orders.py عند إنشاء أول طلب
    """
    if not user.referred_by:
        return False

    # البحث عن صاحب الكود
    referrer = User.query.filter_by(telegram_id=user.referred_by).first()
    if not referrer:
        return False

    # البحث عن سجل الإحالة
    referral = Referral.query.filter_by(
        referrer_id=referrer.id,
        referred_user_id=user.id,
        status="pending"
    ).first()
    if not referral:
        return False

    # منح المكافأة لصاحب الكود
    referrer.balance += REFERRAL_REWARD
    referrer.referral_earnings = (referrer.referral_earnings or 0) + REFERRAL_REWARD
    referrer.referral_count = (referrer.referral_count or 0) + 1

    # تسجيل العملية
    txn = Transaction(
        user_id=referrer.id,
        type="referral_reward",
        amount=REFERRAL_REWARD,
        balance_after=referrer.balance,
        reference_type="referral",
        reference_id=referral.id,
    )
    db.session.add(txn)

    # تحديث سجل الإحالة
    referral.reward_amount = REFERRAL_REWARD
    referral.status = "completed"
    referral.completed_at = datetime.now(timezone.utc)

    # إشعار لصاحب الكود
    notif = Notification(
        user_id=referrer.id,
        title="مكافأة إحالة",
        message=f"حصلت على مكافأة {REFERRAL_REWARD}$ من إحالة",
        type="success",
    )
    db.session.add(notif)

    db.session.commit()

    send_telegram_notification(
        referrer.telegram_id,
        f"🎁 حصلت على مكافأة إحالة بقيمة {REFERRAL_REWARD}$"
    )

    return True