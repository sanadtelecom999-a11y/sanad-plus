# ============================================================
# 🔥 Cache Service — Redis (v18.2 — Catalog only)
# ============================================================
"""
نظام Cache بسيط مبني على Redis (Upstash).

⚠️ v18.2 — سياسة الكاش:
   ✅ يُخزّن: الكتالوج (categories, products, settings, payment_methods)
   ❌ لا يُخزّن: الطلبات، الإيداعات، KYC، المستخدمين، الرصيد

   الدوال المالية القديمة (key_admin_list, invalidate_admin, ...)
   مُبقاة كـ no-op stubs للتوافق مع admin.py بدون تعديله.
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
# ⏱️ TTLs — كتالوج فقط (v18.2)
# ============================================================
TTL_CATEGORIES = 300
TTL_PRODUCTS = 120
TTL_PAYMENT_METHODS = 300
TTL_SETTINGS = 300
TTL_SINGLE_PRODUCT = 180
TTL_DEFAULT = 60

# ⚠️ deprecated — تبقى للتوافق مع admin.py
# القيمة 0 تعني: لا تخزين
TTL_ADMIN_LISTS = 0


# ============================================================
# 🔑 Keys — كتالوج
# ============================================================
def key_categories():
    return "cache:categories:all"


def key_products(category_id=None):
    if category_id:
        return f"cache:products:cat:{category_id}"
    return "cache:products:all"


def key_single_product(product_id):
    return f"cache:product:{product_id}"


def key_payment_methods():
    return "cache:payment-methods:all"


def key_settings_public():
    return "cache:settings:public"


# ============================================================
# ⚠️ v18.2: No-op Stubs — للتوافق مع admin.py
# ============================================================
# admin.py يستدعي هذه الدوال في 57 موضع.
# نحتفظ بها هنا لتجنب تعديل admin.py ضخم.
# النتيجة الفعلية: لا كاش على البيانات المالية.
#
# - key_admin_list()  → يُرجع مفتاحاً لكن cache_set يرفضه
# - invalidate_admin() → no-op
# - invalidate_admin_all() → no-op

_stub_warned = set()


def _warn_once(name):
    if name not in _stub_warned:
        logger.info(f"ℹ️ {name}: no-op (v18.2 policy — no financial cache)")
        _stub_warned.add(name)


def key_admin_list(name):
    """⚠️ deprecated — لا يُستخدم للتخزين (v18.2)"""
    _warn_once("key_admin_list")
    return f"deprecated:admin:{name}"


def invalidate_admin(name):
    """⚠️ deprecated — no-op (v18.2)"""
    _warn_once("invalidate_admin")
    return 0


def invalidate_admin_all():
    """⚠️ deprecated — no-op (v18.2)"""
    _warn_once("invalidate_admin_all")
    return 0


# ============================================================
# 💾 Core Operations
# ============================================================
def cache_get(key):
    """اقرأ من Cache"""
    global _redis_down
    if not _redis_client:
        return None
    if key and key.startswith("deprecated:"):
        return None  # v18.2: لا قراءة للـ admin keys
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
    """احفظ في Cache — يرفض ttl <= 0 (v18.2)"""
    global _redis_down
    if not _redis_client:
        return False
    if ttl is None or ttl <= 0:
        return False  # v18.2: لا تخزين بقيمة صفرية
    if key and key.startswith("deprecated:"):
        return False  # v18.2: لا تخزين للـ admin keys
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
    return cache_delete_pattern("cache:settings:*")


# ============================================================
# 🎯 Auto-Invalidation Middleware
# ============================================================
def setup_cache_invalidation(app):
    """
    عند POST/PUT/DELETE ناجح على /admin/api/:
    → يمسح الكاش المناسب للكتالوج فقط.

    v18.2: لا invalidate للبيانات المالية (لا يوجد كاش لها).
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
            if "/admin/api/categories" in path:
                invalidate_categories()
                logger.info(f"🔥 Invalidated: categories ({path})")

            if "/admin/api/products" in path:
                invalidate_products()
                logger.info(f"🔥 Invalidated: products ({path})")

            if "/admin/api/payment-methods" in path:
                invalidate_payment_methods()
                logger.info(f"🔥 Invalidated: payment-methods ({path})")

            if "/admin/api/settings" in path:
                invalidate_settings()
                logger.info(f"🔥 Invalidated: settings ({path})")

            # v18.2: لا invalidate للطلبات/الإيداعات/KYC
            # لأن admin.py يستدعي invalidate_admin() وهي no-op الآن

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