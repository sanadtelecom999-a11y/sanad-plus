import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
  cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
  api_key=os.getenv("CLOUDINARY_API_KEY"),
  api_secret=os.getenv("CLOUDINARY_API_SECRET"),
  secure=True
)

def upload_base64_image(base64_str, folder="sanad_products"):
    if not base64_str: return None
    try:
        if ',' in base64_str:
            base64_str = base64_str.split(',')[1]
        upload_result = cloudinary.uploader.upload(
            f"data:image/png;base64,{base64_str}",
            folder=folder
        )
        return upload_result.get("secure_url")
    except Exception as e:
        print(f"Cloudinary Error: {e}")
        return None
