
import threading
import os
import sys

# إضافة مسار البوت لكي نتمكن من استيراده
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def start_bot():
    try:
        from bot.bot import run_polling
        print("Starting Telegram Bot Polling...", flush=True)
        run_polling()
    except Exception as e:
        print("BOT ERROR:", str(e), flush=True)

# تشغيل البوت في الخلفية فقط إذا كنا على Render
if os.environ.get('RENDER'):
    bot_thread = threading.Thread(target=start_bot)
    bot_thread.daemon = True
    bot_thread.start()

import os
from dotenv import load_dotenv
load_dotenv()

from app import create_app
app = create_app()

if __name__ == "__main__":
    # استخدام المنفذ الذي يوفره Render والربط على 0.0.0.0
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)
