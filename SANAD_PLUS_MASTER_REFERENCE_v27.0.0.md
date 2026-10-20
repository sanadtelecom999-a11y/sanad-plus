# 📘 SANAD_PLUS_MASTER_REFERENCE_v28.0.1.md
**الوثيقة المرجعية الهندسية الشاملة — الدستور التقني والتشغيلي (Refactored & Bot-Documented Edition)**
**تاريخ الإصدار:** 2026-10-20 | **الإصدار:** v28.0.1
**حالة النظام:** 🟢 Live Production (محمي، مؤتمت، ومهيكل)
**الهدف:** مرجع هندسي شامل (Backend + Bot + MiniApp + Database + CI/CD + Operations / DR)
**المُعِدّ:** فريق التطوير | **المُستلِم:** أبو سند (المالك)

---

## §0. إقرار المالك (Owner's Declaration)
النظام الآن ليس مجرد كود يعمل، بل بيئة إنتاج محصنة، مختبرة، ومؤتمتة بالكامل. تم إغلاق كافة الديون التقنية الخاصة بالـ Backend، وتم نشر النظام بنجاح، وتم توثيق البوت في وثيقة مستقلة.

---

## §1. هندسة النظام والبنية التحتية (Infrastructure)

### 1.1 خريطة الخدمات (Services)
*   **Backend + Bot:** Render (Python 3.13.12, Gunicorn + Subprocess).
*   **Database:** Neon (PostgreSQL 18 - خطة Launch).
*   **Cache:** Upstash (Redis - للكاش والـ Rate Limiting والـ Heartbeat).
*   **Frontend (MiniApp & Admin):** Vercel (Vanilla JS).
*   **Images:** Cloudinary (Private Bucket for KYC).
*   **Errors:** Sentry (مع تنبيهات تيليجرام).

### 1.2 شجرة الملفات الشاملة (File Inventory)
*   **الـ Backend (مجلد `backend/`):**
    *   `run.py`: نقطة التشغيل (Gunicorn)، تدير البوت كـ subprocess، وتحتوي على `_shutdown_event`.
    *   `alembic.ini` & `migrations/`: إدارة الهجرة (Migrations).
    *   **`app/` (النواة):** `config.py`، `models/base.py` (20 جدولاً).
    *   **`app/routes/` (مسارات الأدمن - Refactored):**
        *   `admin.py` (539 سطراً): Blueprint والمسارات الأساسية.
        *   `admin_auth_service.py`: منطق OTP.
        *   `admin_users.py`, `admin_kyc.py`, `admin_deposits.py`, `admin_orders.py`, `admin_products.py`, `admin_settings.py`, `admin_archive.py`.
        *   `admin_utils.py`: Decorators والـ Helpers المشتركة.
    *   **`app/routes/` (المسارات العامة):** `auth.py`, `orders.py`, `settings_public.py`, `support.py`, `webhooks.py`.
    *   **`tests/` (26 اختباراً):** تغطي المصادقة، الأرصدة، الطلبات، الإيداعات، والبوت.
*   **الـ Bot (مجلد `bot/`):**
    *   `bot_main.py`, `bot/bot.py`.
*   **الـ Frontend (مجلد `miniapp/` و `admin/`):**
    *   `index.html`, `js/app_new.js` (منطق المتجر والدعم الفني)، `playwright.config.js` (اختبارات E2E).

### 1.2.1 وثيقة البوت المستقلة (Bot Reference)
*   **الملف:** `docs/BOT_REFERENCE_v1.1.0.md`
*   **إلزامي:** قراءة هذا الملف إلزامية قبل إجراء أي تعديل على مجلد `bot/` أو `bot_main.py`. يحتوي على كل تفاصيل التشغيل، الأوامر، واستكشاف الأخطاء.

---

## §2. قاعدة البيانات (Database - 20 جدولاً)
*   **المحرك:** PostgreSQL 18 (Neon - خطة Launch).
*   **حقول مالية (26 حقل):** جميعها `NUMERIC(14,4)` (يُترجم إلى `Decimal` في بايثون). **ممنوع `float` نهائياً.**
*   **ملاحظة أمنية (KYC):** Cloudinary Private Bucket (تم التأمين في 2026-10-20).
*   **الجداول الأساسية:** `users`, `orders`, `deposits`, `transactions`, `support_tickets` (جديد), `financial_audit_log`, `jwt_blacklist`.

---

## §3. عقود الـ API (API Contracts)

### 3.1 مسارات المستخدم والطلبات
*   `POST /api/auth/telegram`: Request `{"initData"}` | Response `{"access_token"}`.
*   `POST /api/orders/create`: يرد `201` (جديد) أو `200` (Idempotent). مدة صلاحية Idempotency Key: 24 ساعة.
*   `POST /api/support`: (جديد) Request `{"message"}` | Response `201 Created`.

### 3.2 مسارات الأدمن
*   `POST /admin/login` & `POST /admin/verify-otp`.
*   `POST /admin/api/users/<id>/balance`: Request `{"amount", "note"}`. Error 400 إذا تجاوز `max_negative_balance`.

### 3.3 مسارات البوت والويب هوك
*   `POST /api/bot/auth`: يتطلب هيدر `X-Bot-Token`.
*   `POST /api/webhooks/sentry`: (جديد) يستقبل تنبيهات Sentry ويرسلها لتيليجرام.

---

## §4. الأمان والمصادقة (Security & Auth)
*   **آلية OTP للأدمن:** 6 أرقام، صلاحية 3 دقائق، 3 محاولات.
*   **JWT:** صلاحية 2 ساعة. التحقق يعتمد على `exp` رياضياً، و Redis للتوفير فقط.
*   **Maintenance Mode:** عند تفعيله (Env Var)، يرد الـ Backend بـ 503، ويتوقف البوت عن الرد.
*   **Rate Limiting:** مستخدم (10/دقيقة)، أدمن (30/دقيقة).
*   **اختبارات التكامل (CI):** تشمل `backend-tests` (Postgres)، `frontend-tests` (Vitest)، و `e2e-tests` (Playwright).

---

## §5. إدارة الأسرار (Secrets Management)
| السر (Secret) | الوصف | التدوير الإلزامي |
| :--- | :--- | :--- |
| `DATABASE_URL` | رابط Neon (psycopg2) | كل 6 أشهر. |
| `JWT_SECRET_KEY` | تشفير التوكنات | كل 90 يوماً. |
| `BOT_TOKEN` | توكن تيليجرام | كل 12 شهراً. |
| `BOT_API_SECRET` (هيدر: `X-Bot-Token`) | حماية مسار البوت | كل 90 يوماً. |
| `ADMIN_PASSWORD_HASH` | كلمة سر الأدمن | كل 180 يوماً. |

*(ملاحظة: الهيدر يُرسل باسم `X-Bot-Token`، لكن القيمة تُخزَّن في متغير بيئة باسم `BOT_API_SECRET`).*

---

## §6. دليل التشغيل والنشر (CI/CD)
*   **التشغيل المحلي:** `python -m venv venv` ثم `pip install -r backend/requirements-lock.txt` ثم `python run.py` (مع `SKIP_BOT=1`).
*   **النشر:** `main` -> CD يرسل إشارة لـ Render. `develop` -> اختبارات CI. `Vercel` -> نشر تلقائي.
*   **التراجع (Rollback):** Render -> Deploys -> Rollback (30 ثانية).

---

## §7. استكشاف الأخطاء (Troubleshooting)
| العَرَض | السبب المحتمل | الحل الفوري |
| :--- | :--- | :--- |
| **BOT_API_SECRET** | خطأ في تسمية الهيدر. | تأكد من أن الهيدر `X-Bot-Token` والمتغير `BOT_API_SECRET`. |
| **psycopg** | إصدار Python 3.14. | تأكد من `PYTHON_VERSION=3.13.12` في Render. |
| **Unicode error** | تعديل بنصوص عربية بترميز Windows. | استخدم `encoding='utf-8'` في سكربتات Python. |
| **البوت لا يرد** | توقف `bot_main.py`. | Render -> Manual Deploy -> Restart Service. |

---

## §8. استراتيجية الاختبار (Testing Strategy)
*   **الآلي:** 26 اختباراً (Postgres)، Vitest (الواجهة)، Playwright (E2E).
*   **Definition of Done:** لا يُدمج أي PR بدون اختبار، وبدون `downgrade()` إذا كان Migration.

### 8.4 Documentation DoD (معايير جودة التوثيق)
كل وثيقة مرجعية جديدة يجب أن تحتوي على:
1. [ ] مراجع `file:line` لـ 80% من الادعاءات التقنية.
2. [ ] أمثلة نصية/أوامر قابلة للنسخ.
3. [ ] تاريخ التحقق لكل ادعاء وقتي (إحصاءات، أرقام أسطر).
4. [ ] جدول Known Gaps صريح (لا "TODO").
5. [ ] التحقق من الـ Markdown (`Sections` و `Tables`).

---

## §9. النسخ الاحتياطي والاستعادة (Backup & DR)
*   **PITR:** 7 أيام (Neon).
*   **الطبقة الثانية:** `pg_dump` أسبوعي (GitHub Actions).
*   **Restore Drill:** ربع سنوي (آخر اختبار: 2026-Q4).

---

## §10. الاستجابة للحوادث (Incident Response)
1.  **التراجع عن الكود:** Render -> Rollback.
2.  **التراجع عن Migration:** `alembic downgrade -1`.
3.  **وضع الصيانة:** تفعيل `MAINTENANCE_MODE=1` في Render.

---

## §11. المراقبة والتنبيهات (Observability)
*   **Sentry:** يلتقط 500.
*   **UptimeRobot:** يفحص `/api/health`.
*   **Telegram Alerts:** ✅ تم الحل (Webhook يعمل ويرسل التنبيهات فوراً).

---

## §12. سياسة الاحتفاظ بالبيانات
*   `financial_audit_log`: دائم.
*   `jwt_blacklist`: 2 ساعة.
*   `support_tickets`: تمسح بعد سنة من الحل.

---

## §13. الثغرات المعروفة والمخاطر المقبولة (Known Gaps & Accepted Risks)
| البند | القرار | تاريخ المراجعة |
| :--- | :--- | :--- |
| **بيئة Staging** | مقبول مؤقتاً (نستخدم `develop`). | 2027-01-20 |
| **تنبيهات تيليجرام (Sentry)** | ✅ تم الحل (Webhook مفعل). | 2026-10-20 |
| **التحقق من Cloudinary** | ✅ تم تأمين KYC (Private). (الملفات القديمة تحتاج مراجعة). | 2026-10-20 |
| **نسخ احتياطي pg_dump** | دين تقني (مُجدول). | 2026-11-01 |
| **وثيقة البوت** | ✅ تم إنشاؤها (BOT_REFERENCE_v1.1.0). | 2026-10-20 |

---
**نهاية الوثيقة v28.0.1 — Documented Reality. Fully Automated.**