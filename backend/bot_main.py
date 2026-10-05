# ============================================================
# 🤖 Telegram Bot — Entry Point (Standalone Process)
# ============================================================
# - Main thread (مطلوب لـ asyncio)
# - Main interpreter (مطلوب لـ signal handling)
# - 🆕 v18: Sentry monitoring
# ============================================================

import os
import re
import sys

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

    # --- Redaction: منع تسريب BOT_TOKEN في Sentry (AUD-M-005) ---
    _BOT_TOKEN_PATTERN = re.compile(r"bot\d+:[A-Za-z0-9_-]+")

    def _sentry_redact(value):
        """Redact BOT_TOKEN-like strings from a value."""
        if isinstance(value, str):
            return _BOT_TOKEN_PATTERN.sub("bot***REDACTED***", value)
        return value

    def _sentry_before_send(event, hint):
        """Redact sensitive data before sending events to Sentry."""
        if "exception" in event:
            for val in event["exception"].get("values", []):
                if "value" in val:
                    val["value"] = _sentry_redact(val["value"])
        if "extra" in event:
            for k, v in list(event["extra"].items()):
                event["extra"][k] = _sentry_redact(v)
        return event

    def _sentry_before_breadcrumb(breadcrumb, hint):
        """Redact sensitive data from breadcrumbs."""
        if "message" in breadcrumb:
            breadcrumb["message"] = _sentry_redact(breadcrumb["message"])
        if "data" in breadcrumb:
            for k, v in list(breadcrumb["data"].items()):
                breadcrumb["data"][k] = _sentry_redact(v)
        return breadcrumb

    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN", ""),
        integrations=[ThreadingIntegration()],
        traces_sample_rate=0.1,
        profiles_sample_rate=0.0,
        send_default_pii=False,
        environment="bot",
        release=os.getenv("RELEASE_VERSION", "v18"),
        before_send=_sentry_before_send,
        before_breadcrumb=_sentry_before_breadcrumb,
    )
    print("🛡️ Sentry initialized (bot process)")
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