# ============================================================
# ☁️ Cloudinary Service — v2.3 (with signed URL support)
# ============================================================
"""
خدمة إدارة الصور عبر Cloudinary.
- رفع صور عامة (categories, products, payment-methods)
- Signed URLs للصور المحمية (KYC, Deposits)
- Fail-safe: يحتفظ بـ base64 إذا فشل الرفع
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
# 🎨 Transformations
# ============================================================
DEFAULT_TRANSFORM = "w_400,h_400,c_fill,q_auto,f_auto"
LARGE_TRANSFORM = "w_800,q_auto,f_auto"
THUMB_TRANSFORM = "w_200,q_auto,f_auto"


# ============================================================
# 🌐 Public Upload
# ============================================================
def upload_base64_image(base64_data, folder="sanad/uncategorized", public_id=None):
    """
    رفع صورة عامة (public).
    تُستخدم لـ: categories, products, payment-methods.
    """
    if not _ENABLED:
        logger.warning("Cloudinary not configured — skipping upload")
        return None

    if not base64_data or not isinstance(base64_data, str):
        return None

    # If already a URL — return as-is
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
            transformation=[
                {"quality": "auto", "fetch_format": "auto"},
            ],
        )
        url = result.get("secure_url")
        logger.info(f"✅ Public upload: {url[:80]}...")
        return url

    except Exception as e:
        logger.error(f"❌ Cloudinary upload failed: {e}")
        return None


# ============================================================
# 🔒 Signed Upload (للصور الحساسة — اختياري)
# ============================================================
def upload_signed_image(base64_data, folder="sanad/private", public_id=None):
    """
    رفع صورة محمية (authenticated).
    تحتاج Signed URL للوصول.
    Returns: public_id (str) أو None
    """
    if not _ENABLED:
        logger.warning("Cloudinary not configured")
        return None

    if not base64_data or not isinstance(base64_data, str):
        return None

    # If URL — cannot convert to authenticated
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
    - إذا كان base64 → يُرجعه كما هو (المستخدم يرى الصورة مباشرة)
    - إذا كان URL عادي → يُرجعه كما هو
    - إذا كان public_id لصورة authenticated → يُنشئ signed URL
    - عند أي فشل → يُرجع القيمة الأصلية (بدون كسر النظام)
    """
    if not public_id:
        return None

    # Case 1: base64 (صور KYC/Deposits القديمة)
    if isinstance(public_id, str) and public_id.startswith("data:"):
        return public_id

    # Case 2: URL عادي (public أو من Cloudinary)
    if isinstance(public_id, str) and (
        public_id.startswith("http://") or public_id.startswith("https://")
    ):
        return public_id

    # Case 3: public_id (نادراً ما يحدث حالياً)
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
        # Fail-safe: return original (base64 or URL still works)
        return public_id


# ============================================================
# 🎨 Optimized URL (للصور العامة)
# ============================================================
def get_optimized_url(url, transform="default"):
    """بناء URL محسّن للصور العامة"""
    if not url or not isinstance(url, str):
        return url

    if "res.cloudinary.com" not in url:
        return url

    if "/upload/" not in url:
        return url

    transform_str = {
        "default": DEFAULT_TRANSFORM,
        "large": LARGE_TRANSFORM,
        "thumb": THUMB_TRANSFORM,
    }.get(transform, DEFAULT_TRANSFORM)

    parts = url.split("/upload/", 1)
    return f"{parts[0]}/upload/{transform_str}/{parts[1]}"


# ============================================================
# 🗑️ Delete
# ============================================================
def delete_image(public_id):
    """حذف صورة من Cloudinary"""
    if not _ENABLED or not public_id:
        return False
    try:
        result = cloudinary.uploader.destroy(public_id)
        return result.get("result") == "ok"
    except Exception as e:
        logger.error(f"❌ Cloudinary delete failed: {e}")
        return False


def extract_public_id(url):
    """استخراج public_id من Cloudinary URL"""
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
# 💚 Health Check
# ============================================================
def is_enabled():
    return _ENABLED