from flask import jsonify
from ..models.base import Setting
from . import main


@main.route("/api/settings/public", methods=["GET"])
def get_public_settings():
    """إعدادات عامة للمستخدمين (بدون مصادقة)"""
    PUBLIC_KEYS = ["syp_rate", "store_name", "support_url"]
    settings = Setting.query.filter(Setting.key.in_(PUBLIC_KEYS)).all()
    result = {s.key: s.value for s in settings}

    # قيم افتراضية
    if "syp_rate" not in result:
        result["syp_rate"] = "132"
    if "store_name" not in result:
        result["store_name"] = "SANAD+"
    if "support_url" not in result:
        result["support_url"] = "https://t.me/SANADST"

    return jsonify(result)