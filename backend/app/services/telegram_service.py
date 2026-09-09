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

def notify_admins(message):
    """إرسال إشعار لجميع معرفات الأدمن المحددة في TELEGRAM_ADMIN_IDS"""
    admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "8673286954")
    try:
        admin_ids = [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
    except ValueError:
        admin_ids = [8673286954]

    for admin_id in admin_ids:
        send_telegram_notification(admin_id, message)
