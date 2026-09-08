import os
import sys
import threading

# إضافة جذر المشروع للمسار حتى نستطيع استيراد bot من المجلد الأعلى
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app import create_app

app = create_app()

def run_bot_thread():
    from bot.bot import run_polling
    run_polling()

if __name__ == "__main__":
    # تشغيل البوت في خيط منفصل (daemon) حتى لا يمنع الخادم
    bot_thread = threading.Thread(target=run_bot_thread, daemon=True)
    bot_thread.start()

    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
