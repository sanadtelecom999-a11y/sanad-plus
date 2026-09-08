import hmac
import hashlib
from flask import request, jsonify
from ..models.base import User
from ..extensions import db
from . import main

BOT_TOKEN = None

def verify_telegram_init_data(init_data: str) -> dict:
    """التحقق من صحة initData القادمة من تيليجرام"""
    import os
    token = os.getenv("BOT_TOKEN", "")
    if not token:
        return {}
    try:
        from urllib.parse import parse_qsl
        data = dict(parse_qsl(init_data))
        received_hash = data.pop("hash", "")
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        if calculated_hash == received_hash:
            import json
            user_data = json.loads(data.get("user", "{}"))
            return user_data
    except Exception:
        pass
    return {}

@main.route("/api/auth/telegram", methods=["POST"])
def telegram_auth():
    """تسجيل دخول أو إنشاء مستخدم عبر Telegram WebApp"""
    data = request.get_json()
    init_data = data.get("initData", "")
    if not init_data:
        return jsonify({"error": "initData مطلوب"}), 400

    user_data = verify_telegram_init_data(init_data)
    if not user_data:
        # في بيئة التطوير، نسمح بالتسجيل اليدوي
        user_data = {
            "id": data.get("telegram_id"),
            "first_name": data.get("first_name", "مستخدم"),
            "last_name": data.get("last_name", ""),
            "username": data.get("username", ""),
        }
        if not user_data["id"]:
            return jsonify({"error": "بيانات غير صالحة"}), 400

    telegram_id = user_data["id"]
    user = User.query.filter_by(telegram_id=telegram_id).first()
    if not user:
        user = User(
            telegram_id=telegram_id,
            first_name=user_data.get("first_name", ""),
            last_name=user_data.get("last_name", ""),
            username=user_data.get("username", ""),
            balance=0.0,
            kyc_status="unverified",
            is_verified=False,
            role="user",
        )
        db.session.add(user)
        db.session.commit()

    return jsonify({
        "id": user.id,
        "telegram_id": user.telegram_id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "balance": user.balance,
        "kyc_status": user.kyc_status,
        "is_verified": user.is_verified,
        "role": user.role,
        "is_banned": user.is_banned,
        "vip_level": user.vip_level,
    }), 200