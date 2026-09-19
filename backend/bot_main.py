# ============================================================
# 🤖 Telegram Bot — Entry Point (Standalone Process)
# ============================================================
# يعمل كعملية Python مستقلة لتوفير:
#   - Main thread حقيقي (مطلوب لـ asyncio)
#   - Main interpreter (مطلوب لـ signal handling)
#
# يُستدعى من run.py عبر subprocess.Popen()
# ============================================================
import os
import sys

# إضافة project root و backend/ إلى sys.path
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.dirname(_here)

if _root not in sys.path:
    sys.path.insert(0, _root)
if _here not in sys.path:
    sys.path.insert(0, _here)


if __name__ == "__main__":
    try:
        from bot.bot import run_polling
        print("🤖 Bot process starting (PID: %d)..." % os.getpid())
        run_polling()
    except KeyboardInterrupt:
        print("🛑 Bot stopped by user")
    except Exception as e:
        import traceback
        print(f"❌ Bot crashed: {e}")
        traceback.print_exc()
        sys.exit(1)