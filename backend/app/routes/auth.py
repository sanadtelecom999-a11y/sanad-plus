import os
import json
import uuid
import hmac
import hashlib
import time
from datetime import datetime, timezone
from urllib.parse import parse_qsl
from flask import request, jsonify
from flask_jwt_extended import create_access_token
from ..models.base import User
from ..extensions import db
from . import main

AUTH_DATE_MAX_AGE = 3600  # ساعة واحدة


# ============================================================
# ============ التحقق من initData ============
# ============================================================
def verify_telegram_init_data(init_data: str) -> bool:
    """التحقق الكامل من initData (HMAC + auth_date)"""
    if not init_data:
        return False
    token = os.getenv("BOT_TOKEN", "")
    if not token:
        print("❌ BOT_TOKEN غير معرّف")
        return False
    try:
        data = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = data.pop("hash", "")
        if not received_hash:
            return False

        auth_date_raw = data.get("auth_date")
        if not auth_date_raw:
            return False
        try:
            auth_date = int(auth_date_raw)
        except (ValueError, TypeError):
            return False
        if time.time() - auth_date > AUTH_DATE_MAX_AGE:
            print(f"❌ initData قديم: auth_date={auth_date}")
            return False

        data_check_string = "\n".join(
            f"{k}={v}" for k, v in sorted(data.items())
        )
        secret_key = hmac.new(
            b"WebAppData", token.encode(), hashlib.sha256
        ).digest()
        calculated_hash = hmac.new(
            secret_key, data_check_string.encode(), hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(calculated_hash, received_hash)
    except Exception as e:
        print(f"❌ فشل التحقق من initData: {e}")
        return False


def extract_user_from_init_data(init_data: str):
    """استخراج بيانات المستخدم من initData"""
    try:
        params = dict(parse_qsl(init_data))
        return json.loads(params.get("user", "{}"))
    except Exception:
        return None


# ============================================================
# ============ get_or_create_user ============
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
        print(f"✅ مستخدم جديد: {telegram_id} - {first_name}")
    else:
        changed = False
        if first_name and user.first_name != first_name:
            user.first_name = first_name
            changed = True
        if last_name is not None and user.last_name != last_name:
            user.last_name = last_name
            changed = True
        if username is not None and user.username != username:
            user.username = username
            changed = True
        if changed:
            db.session.commit()
    return user


def user_to_dict(user):
    """تحويل المستخدم لـ JSON"""
    return {
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
        "referral_code": user.referral_code,
    }


# ============================================================
# ============ /api/auth/telegram — للمستخدمين (MiniApp) ============
# ============================================================
@main.route("/api/auth/telegram", methods=["POST"])
def telegram_auth():
    data = request.get_json() or {}
    init_data = data.get("initData", "")

    if not init_data:
        return jsonify({"error": "initData مطلوب"}), 401
    if not verify_telegram_init_data(init_data):
        return jsonify({"error": "بيانات تيليجرام غير صالحة أو منتهية"}), 401

    user_data = extract_user_from_init_data(init_data)
    if not user_data or not user_data.get("id"):
        return jsonify({"error": "بيانات المستخدم غير مكتملة"}), 401

    telegram_id = int(user_data["id"])
    if telegram_id <= 0:
        return jsonify({"error": "telegram_id غير صالح"}), 400

    user = get_or_create_user(
        telegram_id,
        user_data.get("first_name", ""),
        user_data.get("last_name", ""),
        user_data.get("username", ""),
    )

    # ✅ توليد JWT
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "telegram_id": user.telegram_id,
            "role": user.role,
        }
    )

    return jsonify({
        "access_token": access_token,
        "user": user_to_dict(user),
        # للتوافق مع الكود القديم:
        **user_to_dict(user),
    }), 200


# ============================================================
# ============ /api/bot/auth — للبوت فقط ============
# ============================================================
@main.route("/api/bot/auth", methods=["POST"])
def bot_auth():
    """نقطة مصادقة للبوت — تتحقق من X-Bot-Token"""
    secret = os.getenv("BOT_API_SECRET", "")
    if not secret:
        return jsonify({"error": "الخادم غير مهيأ"}), 500

    provided = request.headers.get("X-Bot-Token", "")
    if not hmac.compare_digest(provided, secret):
        print("🚫 محاولة وصول غير مصرح لـ /api/bot/auth")
        return jsonify({"error": "غير مصرح"}), 401

    data = request.get_json() or {}
    telegram_id = data.get("telegram_id")
    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400
    try:
        telegram_id = int(telegram_id)
        if telegram_id <= 0:
            return jsonify({"error": "telegram_id غير صالح"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "telegram_id غير صالح"}), 400

    user = get_or_create_user(
        telegram_id,
        data.get("first_name", ""),
        data.get("last_name", ""),
        data.get("username", ""),
    )

    return jsonify(user_to_dict(user)), 200