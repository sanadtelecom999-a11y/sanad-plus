import os
import logging
import requests

logger = logging.getLogger(__name__)


def send_telegram_notification(chat_id, message):
    token = os.getenv("BOT_TOKEN", "")
    if not token:
        logger.warning("BOT_TOKEN غير معرّف")
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
    admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
    try:
        admin_ids = [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
    except ValueError:
        admin_ids = []
    if not admin_ids:
        return
    for admin_id in admin_ids:
        send_telegram_notification(admin_id, message)


# ============================================================
# 8 رسائل Telegram المخصصة للمستخدم
# ============================================================

def send_deposit_approved(user, amount, paid_debt=0.0, added=0.0):
    if paid_debt > 0 and added > 0:
        msg = f"تم خصم {paid_debt:.2f}$ لسداد دينك، وإضافة {added:.2f}$ لرصيدك"
    elif paid_debt > 0 and added == 0:
        msg = f"تم خصم {paid_debt:.2f}$ لسداد دينك. رصيدك الآن: {user.balance:.2f}$"
    else:
        msg = f"تمت إضافة {amount:.2f}$ لرصيدك"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_deposit_rejected(user, amount, reason=None):
    msg = f"تم رفض إيداعك بقيمة {amount:.2f}$"
    if reason:
        msg += f"\nالسبب: {reason}"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_kyc_approved(user):
    msg = "تم توثيق حسابك بنجاح"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_kyc_rejected(user, reason=None):
    msg = "تم رفض طلب التوثيق"
    if reason:
        msg += f"\nالسبب: {reason}"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_referral_reward(referrer, amount):
    msg = f"حصلت على مكافأة إحالة بقيمة {amount:.2f}$"
    send_telegram_notification(referrer.telegram_id, msg)
    return msg


def send_admin_balance_adjustment(user, amount, note=None):
    sign = "+" if amount > 0 else ""
    msg = f"تم تعديل رصيدك بمقدار {sign}{amount:.2f}$"
    if note:
        msg += f"\nملاحظة: {note}"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_order_refund_failed(user, amount, order_number):
    msg = f"تم استرداد {amount:.2f}$ لطلبك {order_number} بسبب فشل التنفيذ"
    send_telegram_notification(user.telegram_id, msg)
    return msg


def send_order_refund_cancelled(user, amount, order_number):
    msg = f"تم استرداد {amount:.2f}$ لطلبك {order_number} بعد الإلغاء"
    send_telegram_notification(user.telegram_id, msg)
    return msg