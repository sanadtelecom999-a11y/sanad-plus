import hmac
import hashlib
import json
import urllib.parse
import os
from flask import request, jsonify

# تأكد من وجود TELEGRAM_BOT_TOKEN في ملف .env
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN") or os.getenv("BOT_TOKEN") or ""

def verify_init_data(init_data_str):
    try:
        parsed_data = dict(urllib.parse.parse_qsl(init_data_str))
        if "hash" not in parsed_data:
            return None
        received_hash = parsed_data.pop("hash")
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
        secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        
        if hmac.compare_digest(calculated_hash, received_hash):
            return json.loads(parsed_data.get("user", "{}"))
    except Exception:
        pass
    return None

def get_verified_user(data):
    init_data = data.get("initData")
    if not init_data:
        return None
    return verify_init_data(init_data)
