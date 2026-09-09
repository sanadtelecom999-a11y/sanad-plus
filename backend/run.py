import os
import sys
import threading

# إضافة جذر المشروع للمسار
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app

app = create_app()

def run_flask():
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False, use_reloader=False)

if __name__ == "__main__":
    # تشغيل Flask في خيط منفصل (حتى يعمل البوت في الخيط الرئيسي)
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    # تشغيل البوت في الخيط الرئيسي
    from bot.bot import run_polling
    run_polling()
