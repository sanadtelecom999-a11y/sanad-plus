import os
import html
import logging
import requests

logger = logging.getLogger(__name__)
TELEGRAM_API_BASE = "https://api.telegram.org"
REQUEST_TIMEOUT = 10

def _safe(val):
    return html.escape(str(val)) if val is not None else ''

def _send_telegram_message(chat_id, text, parse_mode="HTML"):
    token = os.environ.get("BOT_TOKEN")
    if not token or not chat_id:
        return False
    url = f"{TELEGRAM_API_BASE}/bot{token}/sendMessage"
    payload = {
        "chat_id": int(chat_id), "text": text[:4000], 
        "parse_mode": parse_mode, "disable_web_page_preview": True
    }
    try:
        resp = requests.post(url, json=payload, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200 and resp.json().get("ok"): return True
        logger.warning(f"Telegram send failed (chat_id={chat_id}): {resp.text[:200]}")
        return False
    except requests.RequestException as e:
        logger.error(f"Telegram request error (chat_id={chat_id}): {e}")
        return False

def notify_order_approved(user, order):
    product_name = order.product.name if getattr(order, "product", None) else "—"
    text = f"✅ <b>تمت الموافقة على طلبك</b>\n\n🔖 رقم الطلب: <code>{_safe(order.order_number)}</code>\n📦 المنتج: {_safe(product_name)}\n🔢 الكمية: {_safe(order.quantity)}\n💵 الإجمالي: ${_safe(order.total_price)}\n"
    if getattr(order, "delivery_data", None):
        text += f"\n🎁 التسليم:\n<code>{_safe(order.delivery_data)}</code>\n"
    text += "\nشكراً لثقتك بـ <b>SANAD PLUS⁺</b>"
    return _send_telegram_message(user.telegram_id, text)

def notify_order_rejected(user, order, reason=None):
    product_name = order.product.name if getattr(order, "product", None) else "—"
    text = f"❌ <b>تم رفض طلبك</b>\n\n🔖 رقم الطلب: <code>{_safe(order.order_number)}</code>\n📦 المنتج: {_safe(product_name)}\n💵 الإجمالي: ${_safe(order.total_price)}\n"
    if reason: text += f"\n📝 السبب: {_safe(reason)}\n"
    text += "\n💰 تم إرجاع المبلغ إلى رصيدك تلقائياً."
    return _send_telegram_message(user.telegram_id, text)

def notify_deposit_approved(user, deposit):
    text = f"💰 <b>تمت الموافقة على إيداعك</b>\n\n💵 المبلغ: ${_safe(deposit.amount)}\n🔖 رقم العملية: <code>{_safe(deposit.transaction_id)}</code>\n📊 رصيدك الجديد: <b>${_safe(user.balance)}</b>\n\nشكراً لثقتك بـ <b>SANAD PLUS⁺</b>"
    return _send_telegram_message(user.telegram_id, text)

def notify_deposit_rejected(user, deposit, reason=None):
    text = f"❌ <b>تم رفض إيداعك</b>\n\n💵 المبلغ: ${_safe(deposit.amount)}\n🔖 رقم العملية: <code>{_safe(deposit.transaction_id)}</code>\n"
    if reason: text += f"\n📝 السبب: {_safe(reason)}\n"
    text += "\nللاستفسار تواصل مع الدعم الفني."
    return _send_telegram_message(user.telegram_id, text)

def notify_kyc_approved(user):
    text = f"✅ <b>تم توثيق حسابك بنجاح</b>\n\n🎉 يمكنك الآن الاستمتاع بجميع مزايا <b>SANAD PLUS⁺</b>"
    return _send_telegram_message(user.telegram_id, text)

def notify_kyc_rejected(user, reason=None):
    text = f"❌ <b>لم يتم قبول طلب التوثيق</b>\n"
    if reason: text += f"\n📝 السبب: {_safe(reason)}\n"
    text += "\nيمكنك إعادة الإرسال بمستندات أوضح."
    return _send_telegram_message(user.telegram_id, text)

def notify_balance_adjusted(user, amount, reason=None):
    sign = "➕" if amount >= 0 else "➖"
    text = f"{sign} <b>تم تعديل رصيدك</b>\n\n💵 المبلغ: ${_safe(abs(amount))}\n📊 رصيدك الجديد: <b>${_safe(user.balance)}</b>\n"
    if reason: text += f"\n📝 السبب: {_safe(reason)}\n"
    return _send_telegram_message(user.telegram_id, text)
