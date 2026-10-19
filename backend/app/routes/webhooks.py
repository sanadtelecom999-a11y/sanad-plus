"""Webhooks for external services (Sentry, etc.)"""
import os
import json
from flask import request, jsonify
from . import main
from ..services.telegram_service import send_telegram_notification

@main.route('/api/webhooks/sentry', methods=['POST'])
def sentry_webhook():
    secret = os.getenv("SENTRY_WEBHOOK_SECRET")
    if secret:
        auth_header = request.headers.get("X-Sanad-Secret")
        if auth_header != secret:
            return jsonify({"error": "Unauthorized"}), 401

    data = request.json
    if not data:
        return jsonify({"error": "No payload"}), 400

    try:
        event = data.get("data", {}).get("event", {})
        title = event.get("title", "Unknown Error")
        url = event.get("web_url", "No URL")
        
        admin_ids_str = os.getenv("TELEGRAM_ADMIN_IDS", "")
        admin_ids = [int(x.strip()) for x in admin_ids_str.split(",") if x.strip()]
        
        if admin_ids:
            message = f"🚨 **خطأ جديد في النظام** 🚨\n\n**الخطأ:** {title}\n**التفاصيل:** [اضغط هنا]({url})"
            send_telegram_notification(admin_ids[0], message)
            
    except Exception as e:
        print(f"Error processing Sentry webhook: {e}")
        return jsonify({"error": "Internal error"}), 500

    return jsonify({"status": "ok"}), 200
