"""Webhooks for external services (Sentry, etc.)"""
import os
import json
from flask import request, jsonify
from . import main
from ..services.telegram_service import send_telegram_notification

@main.route('/api/webhooks/sentry', methods=['POST'])
def sentry_webhook():
    # التحقق من السر (لمنع أي شخص من إرسال تنبيهات مزيفة)
    secret = os.getenv("SENTRY_WEBHOOK_SECRET")
    if secret:
        auth_header = request.headers.get("Sentry-Hook-Secret")
        if auth_header != secret:
            return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    if not data:
        return jsonify({"error": "No payload"}), 400

    # استخراج تفاصيل الخطأ من Sentry
    try:
        event = data.get("data", {}).get("event", {})
        title = event.get("title", "Unknown Error")
        url = event.get("web_url", "No URL")
        project = data.get("data", {}).get("issue", {}).get("project", {}).get("name", "SANAD PLUS")
        
        # إرسال التنبيه إلى المالك (أو الأدمن الأول في القائمة)
        admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
        admin_ids = [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
        
        if admin_ids:
            message = (
                f"🚨 **خطأ جديد في النظام** 🚨\n\n"
                f"**المشروع:** {project}\n"
                f"**الخطأ:** {title}\n"
                f"**التفاصيل:** [اضغط هنا لفتح Sentry]({url})"
            )
            send_telegram_notification(admin_ids[0], message)
            
    except Exception as e:
        print(f"Error processing Sentry webhook: {e}")
        return jsonify({"error": "Internal processing error"}), 500

    return jsonify({"status": "ok"}), 200
