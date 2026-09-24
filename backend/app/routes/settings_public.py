# ============================================================
# 🌐 Public Settings + Health Check — v17.3
# ============================================================
import time
from flask import jsonify
from sqlalchemy import text
from ..models.base import Setting
from ..extensions import db
from ..services.cache_service import is_healthy as redis_healthy
from . import main


@main.route("/api/settings/public", methods=["GET"])
def get_public_settings():
    """إعدادات عامة للمستخدمين (بدون مصادقة)"""
    PUBLIC_KEYS = ["syp_rate", "store_name", "support_url"]
    settings = Setting.query.filter(Setting.key.in_(PUBLIC_KEYS)).all()
    result = {s.key: s.value for s in settings}

    if "syp_rate" not in result:
        result["syp_rate"] = "132"
    if "store_name" not in result:
        result["store_name"] = "SANAD+"
    if "support_url" not in result:
        result["support_url"] = "https://t.me/SANADST"

    return jsonify(result)


# ============================================================
# 🆕 v17.3: Health Check
# ============================================================
@main.route("/api/health", methods=["GET"])
def health_check():
    """Health check — DB + Redis + Bot placeholder"""
    start = time.time()
    result = {
        "status": "ok",
        "timestamp": int(time.time()),
        "version": "v17.3",
        "checks": {}
    }

    # 1. Database
    try:
        db_start = time.time()
        db.session.execute(text("SELECT 1"))
        result["checks"]["database"] = {
            "status": "ok",
            "latency_ms": round((time.time() - db_start) * 1000, 2)
        }
    except Exception as e:
        result["checks"]["database"] = {
            "status": "error",
            "error": str(e)[:100]
        }
        result["status"] = "degraded"

    # 2. Redis
    try:
        redis_start = time.time()
        if redis_healthy():
            result["checks"]["redis"] = {
                "status": "ok",
                "latency_ms": round((time.time() - redis_start) * 1000, 2)
            }
        else:
            result["checks"]["redis"] = {"status": "unavailable"}
            result["status"] = "degraded"
    except Exception as e:
        result["checks"]["redis"] = {
            "status": "error",
            "error": str(e)[:100]
        }

    # 3. Bot (not monitored — v18)
    result["checks"]["bot"] = {
        "status": "not_monitored",
        "note": "heartbeat added in v18"
    }

    result["total_latency_ms"] = round((time.time() - start) * 1000, 2)

    return jsonify(result), 200 if result["status"] == "ok" else 503