# ============================================================
# 🔥 Cache Service — Redis (v18.1 — Extended Coverage)
# ============================================================
"""
نظام Cache بسيط مبني على Redis (Upstash).
- JSON serialization
- TTL لكل نوع
- Auto-invalidation من admin
- Fail-safe: لو Redis سقط، الموقع يعمل عادي
- 🆕 v17.3: تنبيهات Sentry عند سقوط/عودة Redis
- 🆕 v18.1: توسيع التغطية (settings, single product, admin lists)
"""
import os
import json
import logging
import redis

logger = logging.getLogger(__name__)

# ============================================================
# 🔌 Redis Client
# ============================================================
_REDIS_URL = os.getenv("REDIS_URL", "").strip()
_redis_client = None
_redis_down = False

if _REDIS_URL:
    try:
        _redis_client = redis.from_url(
            _REDIS_URL,
            decode_responses=True,
            socket_timeout=3,
            socket_connect_timeout=3,
            health_check_interval=30,
        )
        _redis_client.ping()
        print("✅ Cache: Redis connected")
    except Exception as e:
        print(f"⚠️ Cache: Redis unavailable — {e}")
        _redis_client = None
else:
    print("⚠️ Cache: Redis URL missing — disabled")


# ============================================================
# 🆕 v17.3: Redis Health Alerts
# ============================================================
def _mark_redis_down(error):
    global _redis_down
    if not _redis_down:
        _redis_down = True
        try:
            import sentry_sdk
            sentry_sdk.capture_message(
                f"🔴 Redis DOWN: {str(error)[:200]}",
                level="error"
            )
        except Exception:
            logger.error(f"Redis DOWN: {error}")


def _mark_redis_up():
    global _redis_down
    if _redis_down:
        _redis_down = False
        try:
            import sentry_sdk
            sentry_sdk.capture_message("🟢 Redis RECOVERED", level="info")
        except Exception:
            logger.info("Redis RECOVERED")


# ============================================================
# ⏱️ TTLs (بالثواني)
# ============================================================
TTL_CATEGORIES = 300        # 5 دقائق
TTL_PRODUCTS = 120          # 2 دقائق
TTL_PAYMENT_METHODS = 300   # 5 دقائق
TTL_SETTINGS = 300          # 🆕 5 دقائق (public settings)
TTL_SINGLE_PRODUCT = 180    # 🆕 3 دقائق
TTL_ADMIN_LISTS = 30        # 🆕 30 ثانية (admin lists — يجب أن تكون قصيرة)
TTL_DEFAULT = 60


# ============================================================
# 🔑 Keys
# ============================================================
def key_categories():
    return "cache:categories:all"


def key_products(category_id=None):
    if category_id:
        return f"cache:products:cat:{category_id}"
    return "cache:products:all"


def key_single_product(product_id):
    """🆕 v18.1"""
    return f"cache:product:{product_id}"


def key_payment_methods():
    return "cache:payment-methods:all"


def key_settings_public():
    """🆕 v18.1"""
    return "cache:settings:public"


def key_admin_list(name):
    """🆕 v18.1: قائمة admin عامة (مثل orders, deposits, users)"""
    return f"cache:admin:{name}"


# ============================================================
# 💾 Core Operations
# ============================================================
def cache_get(key):
    global _redis_down
    if not _redis_client:
        return None
    try:
        raw = _redis_client.get(key)
        if _redis_down:
            _mark_redis_up()
        if raw:
            return json.loads(raw)
        return None
    except redis.RedisError as e:
        _mark_redis_down(e)
        return None
    except Exception as e:
        logger.warning(f"cache_get [{key}] failed: {e}")
        return None


def cache_set(key, value, ttl=TTL_DEFAULT):
    global _redis_down
    if not _redis_client:
        return False
    try:
        _redis_client.setex(key, ttl, json.dumps(value, ensure_ascii=False))
        if _redis_down:
            _mark_redis_up()
        return True
    except redis.RedisError as e:
        _mark_redis_down(e)
        return False
    except Exception as e:
        logger.warning(f"cache_set [{key}] failed: {e}")
        return False


def cache_delete(*keys):
    if not _redis_client or not keys:
        return 0
    try:
        return _redis_client.delete(*keys)
    except redis.RedisError as e:
        _mark_redis_down(e)
        return 0
    except Exception as e:
        logger.warning(f"cache_delete failed: {e}")
        return 0


def cache_delete_pattern(pattern):
    if not _redis_client:
        return 0
    try:
        keys = list(_redis_client.scan_iter(match=pattern, count=100))
        if keys:
            return _redis_client.delete(*keys)
        return 0
    except redis.RedisError as e:
        _mark_redis_down(e)
        return 0
    except Exception as e:
        logger.warning(f"cache_delete_pattern [{pattern}] failed: {e}")
        return 0


# ============================================================
# 🧹 Invalidation Helpers
# ============================================================
def invalidate_categories():
    return cache_delete_pattern("cache:categories:*")


def invalidate_products():
    return cache_delete_pattern("cache:products:*") + cache_delete_pattern("cache:product:*")


def invalidate_payment_methods():
    return cache_delete_pattern("cache:payment-methods:*")


def invalidate_settings():
    """🆕 v18.1"""
    return cache_delete_pattern("cache:settings:*")


def invalidate_admin(name):
    """🆕 v18.1: مسح قائمة admin معينة"""
    return cache_delete(key_admin_list(name))


def invalidate_admin_all():
    """🆕 v18.1: مسح كل قوائم admin"""
    return cache_delete_pattern("cache:admin:*")


# ============================================================
# 🎯 Auto-Invalidation Middleware
# ============================================================
def setup_cache_invalidation(app):
    """
    يربط invalidation تلقائي على Flask app.

    عند أي POST/PUT/DELETE ناجح:
    → يمسح الـ cache المناسب حسب الـ path.
    """
    from flask import request

    @app.after_request
    def _auto_invalidate(response):
        if request.method not in ("POST", "PUT", "DELETE", "PATCH"):
            return response
        if not (200 <= response.status_code < 300):
            return response

        path = request.path
        try:
            # Categories
            if "/admin/api/categories" in path:
                invalidate_categories()
                logger.info(f"🔥 Invalidated: categories ({path})")

            # Products / Bundles
            if "/admin/api/products" in path:
                invalidate_products()
                logger.info(f"🔥 Invalidated: products ({path})")

            # Payment methods
            if "/admin/api/payment-methods" in path:
                invalidate_payment_methods()
                logger.info(f"🔥 Invalidated: payment-methods ({path})")

            # 🆕 v18.1: Settings
            if "/admin/api/settings" in path:
                invalidate_settings()
                logger.info(f"🔥 Invalidated: settings ({path})")

            # 🆕 v18.1: Admin lists (any write invalidates all admin lists)
            # نتحقق أولاً إذا كان admin write
            if path.startswith("/admin/api/"):
                invalidate_admin_all()
                logger.info(f"🔥 Invalidated: admin lists ({path})")

        except Exception as e:
            logger.warning(f"Auto-invalidation failed for {path}: {e}")

        return response

    print("✅ Cache auto-invalidation registered")


# ============================================================
# 📊 Health
# ============================================================
def is_enabled():
    return _redis_client is not None


def is_healthy():
    if not _redis_client:
        return False
    try:
        _redis_client.ping()
        return True
    except Exception:
        return False


def stats():
    """🆕 v18.1: إحصائيات Redis (اختياري)"""
    if not _redis_client:
        return {"enabled": False}
    try:
        info = _redis_client.info("memory")
        return {
            "enabled": True,
            "used_memory_human": info.get("used_memory_human", "N/A"),
            "keys": _redis_client.dbsize(),
        }
    except Exception as e:
        return {"enabled": True, "error": str(e)[:100]}