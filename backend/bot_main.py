# ============================================================
# 🤖 Telegram Bot — Entry Point (Standalone Process)
# ============================================================
# يعمل كعملية Python مستقلة لتوفير:
#   - Main thread حقيقي (مطلوب لـ asyncio)
#   - Main interpreter (مطلوب لـ signal handling)
#   - 🆕 v18: Sentry monitoring
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


# ============================================================
# 🛡️ v18: Sentry init BEFORE any bot imports
# ============================================================
try:
    import sentry_sdk
    from sentry_sdk.integrations.threading import ThreadingIntegration

    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN", ""),
        integrations=[ThreadingIntegration()],
        traces_sample_rate=0.1,
        profiles_sample_rate=0.0,
        send_default_pii=False,
        environment="bot",
        release=os.getenv("RELEASE_VERSION", "v18"),
    )
    print("✅ Sentry initialized (bot process)")
except Exception as e:
    print(f"⚠️ Sentry init failed: {e}")


if __name__ == "__main__":
    try:
        from bot.bot import run_polling
        print("🤖 Bot process starting (PID: %d)..." % os.getpid())
        run_polling()
    except KeyboardInterrupt:
        print("🛑 Bot stopped by user")
    except Exception as e:
        import traceback
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        except Exception:
            pass
        print(f"❌ Bot crashed: {e}")
        traceback.print_exc()
        sys.exit(1)