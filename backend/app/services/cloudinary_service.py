import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_image(file, folder="sanad_receipts"):
    if not file or file.filename == '':
        return None
    if not os.environ.get("CLOUDINARY_CLOUD_NAME"):
        print("⚠️ تحذير: مفاتيح Cloudinary غير مضبوطة. سيتم استخدام صورة وهمية.")
        return "https://placehold.co/400x200/101f35/FFFFFF?text=Cloudinary+Missing"

    try:
        upload_result = cloudinary.uploader.upload(
            file,
            folder=folder,
            resource_type="image",
            allowed_formats=["jpg", "jpeg", "png", "webp"]
        )
        return upload_result.get("secure_url")
    except Exception as e:
        print(f"❌ خطأ في رفع الصورة: {e}", flush=True)
        return None
