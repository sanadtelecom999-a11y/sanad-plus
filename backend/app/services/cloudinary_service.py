# ============================================================
# ☁️ Cloudinary Service — v2.0 (with Signed URLs)
# ============================================================
"""
خدمة إدارة الصور عبر Cloudinary مع دعم:
- رفع صور عامة (public)
- رفع صور محمية (authenticated) + Signed URLs
- تحسين تلقائي للصور العامة
- حذف الصور
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
# 🌐 PUBLIC Upload (للصور العامة)
# ============================================================
def upload_base64_image(base64_data, folder="sanad/uncategorized", public_id=None):
    """
    رفع صورة عامة (public).
    تُستخدم لـ: categories, products, payment-methods
    """
    if not _ENABLED:
        logger.warning("Cloudinary not configured — skipping upload")
        return None

    if not base64_data or not isinstance(base64_data, str):
        return None

    # إذا URL جاهز — أرجعه
    if base64_data.startswith("http://") or base64_data.startswith("https://"):
        return base64_data

    if not base64_data.startswith("data:image/"):
        logger.warning("Invalid base64 format (no data:image/ prefix)")
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
# 🔒 SIGNED Upload (للصور الحساسة)
# ============================================================
def upload_signed_image(base64_data, folder="sanad/private", public_id=None):
    """
    رفع صورة محمية (authenticated).
    تحتاج Signed URL للوصول.
    
    تُستخدم لـ: KYC, Deposits
    
    Returns:
        public_id (str) — وليس URL
        None عند الفشل
    """
    if not _ENABLED:
        logger.warning("Cloudinary not configured — skipping upload")
        return None

    if not base64_data or not isinstance(base64_data, str):
        return None

    # إذا URL — لا يمكن تحويله لـ authenticated
    if base64_data.startswith("http://") or base64_data.startswith("https://"):
        return base64_data

    if not base64_data.startswith("data:image/"):
        logger.warning("Invalid base64 format (no data:image/ prefix)")
        return None

    try:
        result = cloudinary.uploader.upload(
            base64_data,
            folder=folder,
            public_id=public_id,
            type="authenticated",       # 🔒 مهم
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
# 🔐 Signed URL Generation
# ============================================================
def get_signed_url(public_id, expires_in=1800):
    """
    إنشاء رابط موقّع لصورة محمية.
    
    Args:
        public_id: معرّف الصورة (من upload_signed_image)
        expires_in: صلاحية الرابط بالثواني (افتراضي 30 دقيقة)
    
    Returns:
        URL موقّع، أو القيمة الأصلية إذا كانت base64/URL
    """
    if not public_id:
        return None

    # إذا كانت base64 (صور قديمة) → أرجعها كما هي
    if public_id.startswith("data:"):
        return public_id

    # إذا كانت URL عادي → أرجعها كما هي
    if public_id.startswith("http://") or public_id.startswith("https://"):
        return public_id

    if not _ENABLED:
        return None

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
        logger.error(f"❌ Signed URL generation failed for {public_id}: {e}")
        return None


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


# ============================================================
# 💚 Health Check
# ============================================================
def is_enabled():
    return _ENABLED