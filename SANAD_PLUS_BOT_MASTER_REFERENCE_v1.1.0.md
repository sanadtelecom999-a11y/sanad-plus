# 📘 SANAD_PLUS_BOT_MASTER_REFERENCE_v1.1.0.md
**المرجع التقني الشامل لبوت تليجرام (Telegram Bot)**
**تاريخ الإصدار:** 2026-10-22 | **الحالة:** 🟢 Production-Ready

## §1. دورة الحياة (Lifecycle)
* يتم التشغيل كـ `subprocess` عبر `_bot_supervisor`.
* **Startup Validation:** يتم التحقق من شكل `BOT_TOKEN` (الطول ووجود `:`) قبل تشغيل الـ Polling لمنع الانهيار المتأخر.

## §2. الأوامر والـ Handlers
* `/start`: يتحقق من الصيانة، يرسل زر WebApp.
* `/me`: يستدعي `POST /api/bot/auth` (مزود الآن بـ `timeout=10.0`).
* `/admin_info`: يتحقق من `TELEGRAM_ADMIN_IDS`، ويسجل أي محاولة وصول غير مصرح بها في Sentry.

## §3. الأمان (Security & Rate Limiting)
* **الحد الأقصى (Hard Floor):** نظام الـ Rate Limiting يعتمد على Redis (10 req/min). في حال سقوط Redis، يتم تفعيل Fallback صارم في الذاكرة (20 req/min) لمنع هجمات DoS عند إعادة التشغيل.
* **Error Throttling:** يتم استخدام مفتاح `bot:error_notified:{error_type}` في Redis لمنع إخفاء الأخطاء الجديدة بسبب أخطاء قديمة استهلكت الـ Window.

## §4. المراقبة (Monitoring)
* **Heartbeat:** يرسل نبضة كل 60 ثانية بمفتاح `bot:heartbeat`.
* **TTL:** 180 ثانية (هامش أمان 3x) لتفادي الـ False-Down بسبب تأخير Upstash أو GC Pause.
* **Shutdown:** دالة `post_shutdown` تمسح النبضة بأمان.

## §5. الديون التقنية (Technical Debt)
1. **Structured Logging:** البوت يستخدم نصوصاً عادية، يجب التحول إلى JSON Logs.
2. **Schema Contract:** مسار `/api/bot/auth` يفتقر إلى `Pydantic Model` لمنع الانحراف.
3. **HMAC Authentication:** الهيدر `X-Bot-Token` ثابت، يجب الانتقال إلى توقيع `HMAC-SHA256` لمنع Replay Attacks.
4. **Modularization:** ملف `bot.py` (498 سطراً) يحتاج تقسيمه إلى مجلد `handlers/`.
