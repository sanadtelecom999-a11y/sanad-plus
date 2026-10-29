import os
import time
import cloudinary
import cloudinary.uploader
import cloudinary.utils

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_image(file, folder="sanad_receipts", is_kyc=False):
    if not file or file.filename == '':
        return None
    if not os.environ.get("CLOUDINARY_CLOUD_NAME"):
        return "https://placehold.co/400x200/101f35/FFFFFF?text=Cloudinary+Missing"

    try:
        upload_params = {
            "folder": folder,
            "resource_type": "image",
            "allowed_formats": ["jpg", "jpeg", "png", "webp"]
        }
        # إذا كانت الصورة خاصة (KYC)، نجعلها authenticated
        if is_kyc:
            upload_params["type"] = "authenticated"
            
        upload_result = cloudinary.uploader.upload(file, **upload_params)
        
        # إذا كانت KYC، نرجع public_id (لتوليد رابط مؤقت لاحقاً)
        if is_kyc:
            return upload_result.get("public_id")
        # للإيصالات العادية، نرجع الرابط المباشر
        return upload_result.get("secure_url")
    except Exception as e:
        print(f"❌ خطأ في رفع الصورة: {e}", flush=True)
        return None

def get_signed_url(public_id, expiry_seconds=3600):
    if not public_id:
        return None
    try:
        url, _ = cloudinary.utils.cloudinary_url(
            public_id,
            type="authenticated",
            sign_url=True,
            expires_at=int(time.time()) + expiry_seconds,
            secure=True
        )
        return url
    except Exception as e:
        print(f"❌ خطأ في توليد الرابط المؤقت: {e}", flush=True)
        return None
