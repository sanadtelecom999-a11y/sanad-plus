# ============================================================
# 🔥 Cache Service — Redis (v1.0)
# ============================================================
"""
نظام Cache بسيط مبني على Redis (Upstash).
- JSON serialization
- TTL لكل نوع
- Auto-invalidation من admin
- Fail-safe: لو Redis سقط، الموقع يعمل عادي
"""
import os
import json
import logging
import redis
from functools import wraps

logger = logging.getLogger(__name__)

# ============================================================
# 🔌 Redis Client
# ============================================================
_REDIS_URL = os.getenv("REDIS_URL", "").strip()
_redis_client = None

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
# ⏱️ TTLs (بالثواني)
# ============================================================
TTL_CATEGORIES = 300        # 5 دقائق (نادراً ما تتغير)
TTL_PRODUCTS = 120          # 2 دقائق
TTL_PAYMENT_METHODS = 300   # 5 دقائق
TTL_DEFAULT = 60            # 1 دقيقة


# ============================================================
# 🔑 Keys
# ============================================================
def key_categories():
    return "cache:categories:all"


def key_products(category_id=None):
    if category_id:
        return f"cache:products:cat:{category_id}"
    return "cache:products:all"


def key_payment_methods():
    return "cache:payment-methods:all"


# ============================================================
# 💾 Core Operations
# ============================================================
def cache_get(key):
    """اقرأ من Cache — يُرجع None لو مفقود"""
    if not _redis_client:
        return None
    try:
        raw = _redis_client.get(key)
        if raw:
            return json.loads(raw)
        return None
    except Exception as e:
        logger.warning(f"cache_get [{key}] failed: {e}")
        return None


def cache_set(key, value, ttl=TTL_DEFAULT):
    """احفظ في Cache"""
    if not _redis_client:
        return False
    try:
        _redis_client.setex(key, ttl, json.dumps(value, ensure_ascii=False))
        return True
    except Exception as e:
        logger.warning(f"cache_set [{key}] failed: {e}")
        return False


def cache_delete(*keys):
    """احذف واحد أو أكثر"""
    if not _redis_client or not keys:
        return 0
    try:
        return _redis_client.delete(*keys)
    except Exception as e:
        logger.warning(f"cache_delete failed: {e}")
        return 0


def cache_delete_pattern(pattern):
    """احذف كل المفاتيح المطابقة (scan_iter آمن للإنتاج)"""
    if not _redis_client:
        return 0
    try:
        keys = list(_redis_client.scan_iter(match=pattern, count=100))
        if keys:
            return _redis_client.delete(*keys)
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
    return cache_delete_pattern("cache:products:*")


def invalidate_payment_methods():
    return cache_delete_pattern("cache:payment-methods:*")


# ============================================================
# 🎯 Auto-Invalidation Middleware
# ============================================================
def setup_cache_invalidation(app):
    """
    يربط invalidation تلقائي على Flask app.

    عند أي POST/PUT/DELETE على /admin/api/...
    → يمسح الـ cache المناسب.
    
    شفاف للمطور — لا يحتاج تعديل admin.py.
    """
    from flask import request

    @app.after_request
    def _auto_invalidate(response):
        # نفّذ فقط على عمليات التعديل
        if request.method not in ("POST", "PUT", "DELETE", "PATCH"):
            return response

        # نفّذ فقط لو الرد ناجح (2xx)
        if not (200 <= response.status_code < 300):
            return response

        path = request.path
        try:
            if "/admin/api/categories" in path:
                invalidate_categories()
                logger.info(f"🔥 Cache invalidated: categories ({path})")
            if "/admin/api/products" in path:
                invalidate_products()
                logger.info(f"🔥 Cache invalidated: products ({path})")
            if "/admin/api/payment-methods" in path:
                invalidate_payment_methods()
                logger.info(f"🔥 Cache invalidated: payment-methods ({path})")
        except Exception as e:
            logger.warning(f"Auto-invalidation failed for {path}: {e}")

        return response

    print("✅ Cache auto-invalidation registered")


# ============================================================
# 📊 Health
# ============================================================
def is_enabled():
    return _redis_client is not None