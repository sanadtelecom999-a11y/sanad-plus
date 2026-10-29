import hmac
import hashlib
import json
import os
import time
from urllib.parse import parse_qsl

MAX_AUTH_AGE_SECONDS = int(os.environ.get("INIT_DATA_MAX_AGE", "3600"))

def verify_telegram_auth(init_data: str):
    if not init_data:
        return False, "Missing initData"
    try:
        parsed_data = dict(parse_qsl(init_data, strict_parsing=False))
        if 'hash' not in parsed_data:
            return False, "Missing hash"

        received_hash = parsed_data.pop('hash')
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
        bot_token = os.environ.get("BOT_TOKEN", "")
        if not bot_token:
            return False, "Server config error"

        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

        if not hmac.compare_digest(calculated_hash, received_hash):
            return False, "Invalid signature"

        auth_date_str = parsed_data.get('auth_date')
        if not auth_date_str:
            return False, "Missing auth_date"
        try:
            auth_date = int(auth_date_str)
        except (ValueError, TypeError):
            return False, "Invalid auth_date"

        age = time.time() - auth_date
        if age < -60:
            return False, "auth_date in future"
        if age > MAX_AUTH_AGE_SECONDS:
            return False, f"initData expired (age={int(age)}s)"

        user_json = parsed_data.get('user')
        if not user_json:
            return False, "Missing user in initData"

        user_data = json.loads(user_json)
        if not user_data.get('id'):
            return False, "Missing user id"

        return True, user_data
    except Exception as e:
        return False, f"Verification error: {str(e)}"
