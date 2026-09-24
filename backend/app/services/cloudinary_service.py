# ============================================================
# ☁️ Cloudinary Service — v18.1 (Progressive + Better Compression)
# ============================================================
"""
خدمة إدارة الصور عبر Cloudinary.
- رفع صور عامة (categories, products, payment-methods)
- Signed URLs للصور المحمية (KYC, Deposits)
- Fail-safe: يحتفظ بـ base64 إذا فشل الرفع
- 🆕 v18.1: تحسينات ضغط + responsive + progressive loading
"""
import os
import time
import base64
import logging
import cloudinary
import cloudinary.uploader
import cloudinary.utils

logger = logging.getLogger(__name__)


# ============================================================
# ⚙️ Configuration
# ============================================================
_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME", "").strip()
_API_KEY = os.getenv("CLOUDINARY_API_KEY", "").strip()
_API_SECRET = os.getenv("CLOUDINARY_API_SECRET", "").strip()

_ENABLED = bool(_CLOUD_NAME and _API_KEY and _API_SECRET)

if _ENABLED:
    cloudinary.config(
        cloud_name=_CLOUD_NAME,
        api_key=_API_KEY,
        api_secret=_API_SECRET,
        secure=True,
    )
    print(f"✅ Cloudinary configured (cloud: {_CLOUD_NAME})")
else:
    print("⚠️ Cloudinary not configured (missing env vars)")


# ============================================================
# 🎨 Transformations — 🆕 v18.1 optimized
# ============================================================
# q_auto:good = quality balanced
# q_auto:eco = smaller (for thumbnails)
# f_auto = WebP/AVIF for supported browsers
# fl_progressive = progressive JPEG (visible improvement)

DEFAULT_TRANSFORM = "w_400,h_400,c_fill,q_auto:good,f_auto,fl_progressive"
LARGE_TRANSFORM = "w_800,q_auto:good,f_auto,fl_progressive"
THUMB_TRANSFORM = "w_200,q_auto:eco,f_auto,fl_progressive"
MOBILE_TRANSFORM = "w_600,q_auto:good,f_auto,fl_progressive"       # 🆕
TINY_TRANSFORM = "w_100,q_auto:eco,f_auto,fl_progressive"          # 🆕
HERO_TRANSFORM = "w_1200,q_auto:good,f_auto,fl_progressive"        # 🆕


# ============================================================
# 🌐 Public Upload — 🆕 v18.1: eager transformations
# ============================================================
def upload_base64_image(base64_data, folder="sanad/uncategorized", public_id=None):
    """
    رفع صورة عامة (public).
    تُستخدم لـ: categories, products, payment-methods.

    🆕 v18.1: eager transformations لتحسين أول طلب.
    """
    if not _ENABLED:
        logger.warning("Cloudinary not configured — skipping upload")
        return None

    if not base64_data or not isinstance(base64_data, str):
        return None

    # URL already — return as-is
    if base64_data.startswith("http://") or base64_data.startswith("https://"):
        return base64_data

    if not base64_data.startswith("data:image/"):
        logger.warning("Invalid base64 format")
        return None

    try:
        result = cloudinary.uploader.upload(
            base64_data,
            folder=folder,
            public_id=public_id,
            resource_type="image",
            overwrite=True,
            invalidate=True,
            # 🆕 v18.1: eager transformations
            eager=[
                {"width": 200, "crop": "fill", "quality": "auto:eco", "fetch_format": "auto"},
                {"width": 400, "crop": "fill", "quality": "auto:good", "fetch_format": "auto"},
                {"width": 800, "crop": "limit", "quality": "auto:good", "fetch_format": "auto"},
            ],
            eager_async=True,
            # 🆕 v18.1: default transformation for direct URL access
            transformation=[
                {"quality": "auto:good", "fetch_format": "auto", "flags": "progressive"},
            ],
        )
        url = result.get("secure_url")
        logger.info(f"✅ Public upload: {url[:80]}...")
        return url

    except Exception as e:
        logger.error(f"❌ Cloudinary upload failed: {e}")
        return None


# ============================================================
# 🔒 Signed Upload
# ============================================================
def upload_signed_image(base64_data, folder="sanad/private", public_id=None):
    """رفع صورة محمية (authenticated). تحتاج Signed URL للوصول."""
    if not _ENABLED:
        logger.warning("Cloudinary not configured")
        return None

    if not base64_data or not isinstance(base64_data, str):
        return None

    if base64_data.startswith("http://") or base64_data.startswith("https://"):
        return base64_data

    if not base64_data.startswith("data:image/"):
        return None

    try:
        result = cloudinary.uploader.upload(
            base64_data,
            folder=folder,
            public_id=public_id,
            type="authenticated",
            resource_type="image",
            overwrite=True,
            invalidate=True,
        )
        pid = result.get("public_id")
        logger.info(f"✅ Signed upload: {pid}")
        return pid

    except Exception as e:
        logger.error(f"❌ Cloudinary signed upload failed: {e}")
        return None


# ============================================================
# 🔐 Signed URL Generation (Fail-Safe)
# ============================================================
def get_signed_url(public_id, expires_in=1800):
    """
    يُرجع URL للعرض.

    منطق آمن (fail-safe):
    - إذا كان base64 → يُرجعه كما هو
    - إذا كان URL عادي → يُرجعه كما هو
    - إذا كان public_id لصورة authenticated → signed URL
    - عند أي فشل → يُرجع القيمة الأصلية
    """
    if not public_id:
        return None

    # base64
    if isinstance(public_id, str) and public_id.startswith("data:"):
        return public_id

    # URL عادي
    if isinstance(public_id, str) and (
        public_id.startswith("http://") or public_id.startswith("https://")
    ):
        return public_id

    if not _ENABLED:
        logger.warning("Cloudinary not configured — returning raw public_id")
        return public_id

    try:
        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            type="authenticated",
            sign_url=True,
            secure=True,
            resource_type="image",
            expires_at=int(time.time()) + expires_in,
        )
        return url

    except Exception as e:
        logger.warning(f"Signed URL generation failed for {public_id}: {e}")
        return public_id


# ============================================================
# 🎨 Optimized URL — 🆕 v18.1 with more sizes
# ============================================================
def get_optimized_url(url, transform="default"):
    """
    بناء URL محسّن للصور العامة.

    Available transforms:
    - "tiny"   → 100px  (icons, list thumbs)
    - "thumb"  → 200px  (product grid)
    - "default"→ 400px  (standard)
    - "mobile" → 600px  (mobile hero)
    - "large"  → 800px  (detail modal)
    - "hero"   → 1200px (desktop hero)
    """
    if not url or not isinstance(url, str):
        return url

    if "res.cloudinary.com" not in url:
        return url

    if "/upload/" not in url:
        return url

    transform_str = {
        "tiny": TINY_TRANSFORM,
        "thumb": THUMB_TRANSFORM,
        "default": DEFAULT_TRANSFORM,
        "mobile": MOBILE_TRANSFORM,
        "large": LARGE_TRANSFORM,
        "hero": HERO_TRANSFORM,
    }.get(transform, DEFAULT_TRANSFORM)

    parts = url.split("/upload/", 1)
    return f"{parts[0]}/upload/{transform_str}/{parts[1]}"


# ============================================================
# 🗑️ Delete
# ============================================================
def delete_image(public_id):
    if not _ENABLED or not public_id:
        return False
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception as e:
        logger.error(f"❌ Cloudinary delete failed: {e}")
        return False


def extract_public_id(url):
    if not url or not isinstance(url, str):
        return None
    if "res.cloudinary.com" not in url:
        return None
    try:
        parts = url.split("/upload/")
        if len(parts) != 2:
            return None
        path = parts[1]
        if path.startswith("v") and "/" in path:
            path = path.split("/", 1)[1]
        if "." in path:
            path = path.rsplit(".", 1)[0]
        return path
    except Exception:
        return None


# ============================================================
# 💚 Health
# ============================================================
def is_enabled():
    return _ENABLED