import os
import requests

def upload_image_to_imgbb(image_base64_or_path, name="image"):
    api_key = os.getenv("IMGBB_API_KEY", "")
    if not api_key:
        return None
    url = "https://api.imgbb.com/1/upload"
    try:
        if image_base64_or_path.startswith("http"):
            return image_base64_or_path
        # نفترض أن المدخل Base64
        payload = {
            "key": api_key,
            "image": image_base64_or_path,
            "name": name,
        }
        response = requests.post(url, data=payload, timeout=10)
        if response.ok:
            data = response.json()
            return data["data"]["url"]
    except Exception as e:
        print(f"ImgBB error: {e}")
    return None