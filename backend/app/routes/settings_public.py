# ============================================================
# 🌐 Public Settings + Health Check — v18.1
# ============================================================
import time
from flask import jsonify
from sqlalchemy import text
from ..models.base import Setting
from ..extensions import db
from ..services.cache_service import (
    is_healthy as redis_healthy,
    cache_get,
    cache_set,
    key_settings_public,
    TTL_SETTINGS,
)
from . import main


# ============================================================
# 🌐 Public Settings — 🆕 v18.1 with caching
# ============================================================
@main.route("/api/settings/public", methods=["GET"])
def get_public_settings():
    """إعدادات عامة للمستخدمين (بدون مصادقة) — cached 5 min"""
    # 🚀 حاول من Cache أولاً
    cached = cache_get(key_settings_public())
    if cached is not None:
        return jsonify(cached)

    # 💾 قراءة من DB
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

    # 💾 احفظ في Cache
    cache_set(key_settings_public(), result, ttl=TTL_SETTINGS)
    return jsonify(result)


# ============================================================
# 🆕 v18: Health Check (DB + Redis + Bot)
# ============================================================
@main.route("/api/health", methods=["GET"])
def health_check():
    """
    Health check شامل:
    - Database latency
    - Redis latency
    - Bot heartbeat (آخر 120 ثانية)

    Status codes:
    - 200: كل المكونات سليمة
    - 503: أي مكون حرج معطّل
    """
    start = time.time()
    result = {
        "status": "ok",
        "timestamp": int(time.time()),
        "version": "v18.1",
        "checks": {}
    }
    degraded = False

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
            "error": str(e)[:150]
        }
        degraded = True

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
            degraded = True
    except Exception as e:
        result["checks"]["redis"] = {
            "status": "error",
            "error": str(e)[:150]
        }
        degraded = True

    # 3. Bot Heartbeat
    try:
        hb = cache_get("bot:heartbeat")
        now = int(time.time())

        if hb is None:
            result["checks"]["bot"] = {
                "status": "unavailable",
                "note": "no heartbeat found"
            }
            degraded = True
        else:
            try:
                hb_ts = int(hb)
            except (ValueError, TypeError):
                hb_ts = 0

            age = now - hb_ts
            if age < 120:
                result["checks"]["bot"] = {
                    "status": "ok",
                    "last_heartbeat": hb_ts,
                    "age_seconds": age,
                }
            else:
                result["checks"]["bot"] = {
                    "status": "stale",
                    "last_heartbeat": hb_ts,
                    "age_seconds": age,
                    "note": "heartbeat older than 120s"
                }
                degraded = True
    except Exception as e:
        result["checks"]["bot"] = {
            "status": "error",
            "error": str(e)[:150]
        }
        degraded = True

    result["total_latency_ms"] = round((time.time() - start) * 1000, 2)

    if degraded:
        result["status"] = "degraded"
        return jsonify(result), 503

    return jsonify(result), 200