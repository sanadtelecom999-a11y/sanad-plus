import os
import logging
import requests

logger = logging.getLogger(__name__)

def send_telegram_notification(chat_id, message):
    token = os.getenv("BOT_TOKEN", "")
    if not token:
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
    }
    try:
        response = requests.post(url, json=payload, timeout=5)
        return response.ok
    except Exception as e:
        logger.error(f"فشل إرسال إشعار تيليجرام: {e}")
        return False