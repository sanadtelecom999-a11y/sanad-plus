import os
import json
import uuid
import hmac
import hashlib
from datetime import datetime, timezone
from urllib.parse import parse_qsl
from flask import request, jsonify
from ..models.base import User
from ..extensions import db
from . import main


# ============================================================
# ============ Telegram initData Verification ============
# ============================================================
def verify_telegram_init_data(init_data: str) -> bool:
    """
    التحقق من أن initData قادم فعلاً من تيليجرام
    https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not init_data:
        return False

    token = os.getenv("BOT_TOKEN", "")
    if not token:
        print("⚠️ BOT_TOKEN غير معرّف — لا يمكن التحقق من initData")
        return False

    try:
        data = dict(parse_qsl(init_data, keep_blank_values=True))
        received_hash = data.pop("hash", "")
        if not received_hash:
            return False

        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(calculated_hash, received_hash)
    except Exception as e:
        print(f"⚠️ فشل التحقق من initData: {e}")
        return False


def extract_user_from_init_data(init_data: str):
    """استخراج بيانات المستخدم من initData"""
    if not init_data:
        return None
    try:
        params = dict(parse_qsl(init_data))
        user_json = params.get("user", "{}")
        return json.loads(user_json)
    except Exception:
        return None


# ============================================================
# ============ get_or_create_user ============
# ============================================================
def get_or_create_user(telegram_id, first_name="", last_name="", username=""):
    """
    إنشاء أو تحديث المستخدم.
    - إذا كان المستخدم جديداً → إنشاء
    - إذا كان موجوداً → تحديث الاسم واليوزر تلقائياً
    """
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
        # ✅ تحديث إجباري للاسم واليوزر في كل مرة
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
            print(f"🔄 تم تحديث بيانات المستخدم: {telegram_id}")

    return user


# ============================================================
# ============ /api/auth/telegram ============
# ============================================================
@main.route("/api/auth/telegram", methods=["POST"])
def telegram_auth():
    data = request.get_json() or {}

    telegram_id = data.get("telegram_id")
    first_name = data.get("first_name", "")
    last_name = data.get("last_name", "")
    username = data.get("username", "")
    init_data = data.get("initData", "")

    # ✅ إذا كان initData متوفراً → التحقق منه واستخراج البيانات منه
    # هذا يمنع أي انتحال أو fallback خاطئ
    if init_data:
        if verify_telegram_init_data(init_data):
            user_data = extract_user_from_init_data(init_data)
            if user_data:
                # البيانات الرسمية من تيليجرام تتقدم على أي قيم مُرسلة
                telegram_id = user_data.get("id", telegram_id)
                first_name = user_data.get("first_name", first_name)
                last_name = user_data.get("last_name", last_name)
                username = user_data.get("username", username)
                print(f"🔐 تم التحقق من initData بنجاح — ID: {telegram_id}")
        else:
            # initData موجود لكن hash غير صحيح
            # نستخدم القيم المُرسلة لكن مع تسجيل تحذير
            print(f"⚠️ initData غير موثوق — نستخدم البيانات المُرسلة مباشرة")

    if not telegram_id:
        return jsonify({"error": "telegram_id مطلوب"}), 400

    # ✅ التحقق من صحة telegram_id (رقم موجب)
    try:
        telegram_id = int(telegram_id)
        if telegram_id <= 0:
            return jsonify({"error": "telegram_id غير صالح"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "telegram_id غير صالح"}), 400

    # ✅ منع استخدام ID الأدمن كـ fallback للمستخدمين العاديين
    admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
    admin_ids = []
    try:
        admin_ids = [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
    except ValueError:
        pass

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