import os
import json
import uuid
from datetime import datetime, timezone
from flask import request, jsonify
from ..models.base import User
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
        # تحديث البيانات إذا تغيرت
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

@main.route("/api/auth/telegram", methods=["POST"])
def telegram_auth():
    data = request.get_json()
    if not data:
        return jsonify({"error": "بيانات غير صالحة"}), 400

    # استخراج البيانات من initData أو من الحقول المباشرة
    telegram_id = data.get("telegram_id")
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    username = data.get("username", "")

    # إذا لم يتوفر telegram_id، نحاول من initData
    if not telegram_id:
        init_data = data.get("initData", "")
        if init_data:
            try:
                from urllib.parse import parse_qsl
                params = dict(parse_qsl(init_data))
                user_json = params.get("user", "{}")
                user_data = json.loads(user_json)
                telegram_id = user_data.get("id")
                first_name = user_data.get("first_name", "")
                last_name = user_data.get("last_name", "")
                username = user_data.get("username", "")
            except Exception:
                pass

    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400

    user = get_or_create_user(telegram_id, first_name, last_name, username)

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
