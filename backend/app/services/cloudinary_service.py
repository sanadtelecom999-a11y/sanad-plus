# ============================================================
# ☁️ Cloudinary Service — v1.0
# ============================================================
"""
خدمة إدارة الصور عبر Cloudinary
- رفع صور (base64 → URL)
- تحسين تلقائي (WebP، resize، جودة)
- حذف الصور
"""
import os
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
# 🎨 Default Transformations
# ============================================================
# تُطبق تلقائياً على URL
DEFAULT_TRANSFORM = "w_400,h_400,c_fill,q_auto,f_auto"

# صور أكبر للمعاينة
LARGE_TRANSFORM = "w_800,q_auto,f_auto"

# صور مصغرة للـ thumbnails
THUMB_TRANSFORM = "w_200,q_auto,f_auto"


# ============================================================
# 🚀 Upload
# ============================================================
def upload_base64_image(base64_data, folder="sanad/uncategorized", public_id=None):
    """
    رفع صورة base64 إلى Cloudinary.
    
    Args:
        base64_data: "data:image/jpeg;base64,..." أو "base64_string_only"
        folder: المجلد في Cloudinary (مثل sanad/products)
        public_id: اسم مخصص (اختياري)
    
    Returns:
        URL الكامل للصورة، أو None عند الفشل
    """
    if not _ENABLED:
        logger.warning("Cloudinary not configured — skipping upload")
        return None

    if not base64_data or not isinstance(base64_data, str):
        return None

    # إذا كانت URL بالفعل — أرجعها كما هي
    if base64_data.startswith("http://") or base64_data.startswith("https://"):
        return base64_data

    # تأكد من صيغة data URL
    if not base64_data.startswith("data:image/"):
        logger.warning(f"Invalid base64 format (no data:image/ prefix)")
        return None

    try:
        result = cloudinary.uploader.upload(
            base64_data,
            folder=folder,
            public_id=public_id,
            resource_type="image",
            overwrite=True,
            invalidate=True,
            # تحسين تلقائي
            transformation=[
                {"quality": "auto", "fetch_format": "auto"},
            ],
        )
        url = result.get("secure_url")
        logger.info(f"✅ Uploaded to Cloudinary: {url}")
        return url

    except Exception as e:
        logger.error(f"❌ Cloudinary upload failed: {e}")
        return None


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
        # https://res.cloudinary.com/cloud/image/upload/v123/folder/name.ext
        parts = url.split("/upload/")
        if len(parts) != 2:
            return None
        path = parts[1]
        # إزالة version prefix (v123...)
        if path.startswith("v") and "/" in path:
            path = path.split("/", 1)[1]
        # إزالة extension
        if "." in path:
            path = path.rsplit(".", 1)[0]
        return path
    except Exception:
        return None


# ============================================================
# 🎨 Build Optimized URL
# ============================================================
def get_optimized_url(url, transform="default"):
    """
    بناء URL محسّن مع transformations.
    
    Args:
        url: Cloudinary URL الأصلي
        transform: "default" | "large" | "thumb"
    
    Returns:
        URL محسّن، أو URL الأصلي إذا لم يكن Cloudinary
    """
    if not url or not isinstance(url, str):
        return url

    if "res.cloudinary.com" not in url:
        return url  # ليس Cloudinary، أرجع كما هو

    if "/upload/" not in url:
        return url

    transform_str = {
        "default": DEFAULT_TRANSFORM,
        "large": LARGE_TRANSFORM,
        "thumb": THUMB_TRANSFORM,
    }.get(transform, DEFAULT_TRANSFORM)

    # إدراج الـ transform بعد /upload/
    parts = url.split("/upload/", 1)
    return f"{parts[0]}/upload/{transform_str}/{parts[1]}"


# ============================================================
# 💚 Health Check
# ============================================================
def is_enabled():
    """هل Cloudinary معدّ؟"""
    return _ENABLED