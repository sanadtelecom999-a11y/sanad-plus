# SANAD PLUS⁺ — MASTER TECHNICAL REFERENCE

**الإصدار المرجعي:** v18.4.15
**Anchor (release reference):** `9f89bf5` — آخر commit بـ `v18.4.14`
**HEAD:** `5bf031b`
**الفارق:** 17 commits من anchor إلى HEAD
**الغرض:** وثيقة مرجعية رسمية audit-ready

---

## 🔖 نظام التحقق

| الرمز | المعنى |
|---|---|
| ✅ | Verified — Runtime / Dashboard / SQL |
| 📖 | Code Verified — في الكود، لم يُختبر Runtime |
| ⚠️ | Not Tested — مع ذكر السبب |
| 🟡 | Partial — تحقق جزئي |
| ❌ | Not Present |
| ❓ | Unknown |

**قاعدة:** لا "إلخ". كل عنصر صريح أو مصنّف Unknown.

---

# §1. بطاقة المشروع

| البند | القيمة | الحالة |
|---|---|---|
| اسم المشروع | SANAD PLUS⁺ | ✅ |
| الاسم التقني | `sanad-plus` | ✅ |
| Version (anchor) | `v18.4.14` | ✅ |
| Commit (HEAD) | `5bf031b` | ✅ |
| Anchor commit | `9f89bf5` | ✅ |
| Commits منذ anchor | 17 | ✅ |
| Git tag فعلي | ❌ لا يوجد | ✅ |
| الفرع | `main` | ✅ |
| حالة Git | clean | ✅ |
| Python | `3.13.12` | ✅ |
| Flask | `2.3.3` | 📖 |
| python-telegram-bot | `22.6` | 📖 |
| PostgreSQL (Neon) | `18.6` | ✅ |
| Production | 🟢 Live | ✅ |
| آخر Deploy | 2026-10-04 01:04:09 UTC | ✅ |
| Owner | أبو سند | ✅ |
| Owner Telegram ID | `8673286954` | ✅ |
| Admin 2 Telegram ID | `8916852221` | ✅ |
| Bot username | `@Sa3pls1_bot` | ✅ |
| Support | `@SANADST` | ✅ |
| GitHub | `sanadtelecom999-a11y/sanad-plus` | ✅ |
| Render | `sanad-plus-backend` | ✅ |
| Vercel miniapp | `sanad-plus.vercel.app` | ✅ |
| Vercel admin | `sanad-plus-admi.vercel.app` | ✅ |
| Neon project | `purple-glade-72253426` | ✅ |

**⚠️ تنويه:** `version` = anchor، وليس آخر deploy. للـ HEAD استخدم `commit`.

---

# §2. الملكية والصلاحيات

## §2.1 ADMIN IDs

متغير البيئة: `TELEGRAM_ADMIN_IDS="8673286954,8916852221"`.
**الحالة:** 📖 Code Verified.

## §2.2 آلية Parsing

    ADMIN_IDS = []
    for _x in TELEGRAM_ADMIN_IDS_STR.split(","):
        _x = _x.strip()
        if not _x:
            continue
        try:
            ADMIN_IDS.append(int(_x))
        except ValueError:
            logger.warning(f"⚠️ Invalid admin ID: {_x}")

**إصلاح موثّق:** `logger` كان معرّفًا بعد هذا البلوك → NameError. نُقل إلى الأعلى في commit `c5ec3cb` (2026-09-29).

**السلوك عند خطأ ID:** يتخطى + warning + البوت يستمر.

## §2.3 Owner vs Admin

| البُعد | Owner | Admin |
|---|---|---|
| Telegram ID | `8673286954` | `8916852221` |
| تمييز في الكود | ❌ لا يوجد | ❌ لا يوجد |
| الصلاحيات | كاملة | كاملة |

**✅ حقيقة مؤكدة:** لا فرق صريح في الكود. كلاهما في `ADMIN_IDS`. التمييز تنظيمي فقط.

## §2.4 الأوامر

| الأمر | الوظيفة | صلاحية |
|---|---|---|
| `/start` | بدء + تسجيل | Public |
| `/me` | معلومات المستخدم | Public (rate-limited) |
| `/admin_info` | معلومات النظام | `ADMIN_IDS` فقط |

**غير موجود:** ❌ `/help`, `/settings`, `/cancel`, `/balance`, `/stats`, Inline Mode, CallbackQueryHandler.

---

# §3. البنية المعمارية

## §3.1 مخطط التكامل

| الطبقة | يتصل بـ | آلية | الحالة |
|---|---|---|---|
| Bot (subprocess) | Backend | HTTP + `X-Bot-Token` | ✅ Verified (PID منفصل) |
| MiniApp (Vercel) | Backend | HTTP + JWT | ✅ Verified |
| Admin (Vercel) | Backend | HTTP + JWT | ✅ Verified |
| Backend | Neon DB | SQLAlchemy + psycopg2 | ✅ |
| Backend | Upstash Redis | redis-py | ✅ |
| Backend | Telegram API | requests | 📖 |
| Backend | Cloudinary | SDK | 📖 |

**الحالة:** 📖 Code Verified.

## §3.2 Isolation Boundaries

| الحد | الوصف | الحالة |
|---|---|---|
| Bot ↔ DB | لا اتصال مباشر — API فقط | 📖 |
| MiniApp ↔ DB | لا اتصال — API فقط | 📖 |
| Admin ↔ DB | لا اتصال — API فقط | 📖 |
| Bot ↔ Backend | Network subprocess | ✅ |

## §3.3 Gunicorn Config

| البند | القيمة |
|---|---|
| workers | 1 |
| threads | 4 |
| worker_class | `gthread` |
| timeout | 120s |
| graceful_timeout | 30s |
| preload_app | False |

**الحالة:** ✅ Verified — ظهر في Render logs.

## §3.4 Subprocess + Supervisor

- Bot: `subprocess.Popen` من `post_fork` hook.
- Supervisor thread daemon — restart كل 5s عند crash.
- **المرجع:** `backend/run.py:post_fork()`, `_bot_supervisor()`.

**⚠️ Not Tested:** crash recovery عند موت البوت.
**🔴 اكتشاف Runtime (2026-10-04):** أثناء deploy، بوتان يعملان لثانية-ثانيتين → Telegram يُصدر `telegram.error.Conflict` للبوت القديم. لا ضرر وظيفي، لكن noise في Sentry مع كل deploy.

## §3.5 لماذا هذا التصميم؟

📖 الأسباب المُستنتجة (بلا تعليق رسمي في الكود):

1. PTB 22.6 يحتاج main thread + asyncio loop.
2. Supervisor داخلي = crash recovery بدون أداة خارجية.
3. Single worker — Redis/DB locks تدير التزامن.
4. gthread — توازن I/O concurrency.

⚠️ تفسير مستنتج — لم يُثبَت بتعليق رسمي.

---

# §4. الملفات والمسارات

## §4.0 نطاق التغطية الصريح

| البُعد | الرقم | النسبة |
|---|---|---|
| FULL_SOURCE.md dump | 77 ملف | 100% من الـ dump |
| محتوى reviewed فعليًا | ~40 ملف | ~7% من الإجمالي |
| إجمالي المشروع (Master Ref §7) | 582 ملف | — |
| ملفات غير موثقة صراحةً | **505 ملف** | ~87% |

**الخلاصة:** جدول §4 أدناه يغطي 77 ملفًا من 582. الـ505 المتبقية مُدرجة في inventory إجمالي لكن لم يُفحَص محتواها.

**حالة الجدول:** 📖 Code Verified — ليس ✅.

## §4.1 جدول الملفات (77)

| # | المسار | النوع | الوظيفة | Git tracked؟ |
|---|---|---|---|---|
| 1 | `.github/workflows/backup.yml` | YAML | Database backup workflow | ✅ |
| 2 | `.gitignore` | Text | Git exclusions | ✅ |
| 3 | `FULL_SOURCE.md` | Markdown | Source dump (removed) | ❌ removed in db7bf6e |
| 4 | `admin/css/admin.css` | CSS | Admin styles | ✅ |
| 5 | `admin/index.html` | HTML | Admin shell | ✅ |
| 6 | `admin/js/admin-v16.js` | JS | Admin overrides v16 | ✅ |
| 7 | `admin/js/admin-v17.js` | JS | URL support v17 | ✅ |
| 8 | `admin/js/admin.js` | JS | Admin core | ✅ |
| 9 | `admin/js/api.js` | JS | API wrapper | ✅ |
| 10 | `admin/manifest.json` | JSON | PWA manifest | ✅ |
| 11 | `admin/sw.js` | JS | Self-destruct SW | ✅ |
| 12 | `admin/vercel.json` | JSON | Vercel + CSP | ✅ |
| 13 | `backend/app/__init__.py` | Python | Flask app factory | ✅ |
| 14 | `backend/app/config.py` | Python | Config + secrets checks | ✅ (b90859a) |
| 15 | `backend/app/extensions.py` | Python | DB + JWT init | ✅ |
| 16 | `backend/app/models/__init__.py` | Python | (empty) | ✅ |
| 17 | `backend/app/models/base.py` | Python | 20 SQLAlchemy models | ✅ |
| 18 | `backend/app/routes/__init__.py` | Python | Blueprint imports | ✅ |
| 19 | `backend/app/routes/admin.py` | Python | Admin API (~55 routes) | ✅ (b1dc41f, 384e171, e8b7ee5, 07ea924) |
| 20 | `backend/app/routes/auth.py` | Python | Telegram + bot auth | ✅ |
| 21 | `backend/app/routes/categories.py` | Python | Public categories | ✅ |
| 22 | `backend/app/routes/coupons.py` | Python | Coupon validation | ✅ |
| 23 | `backend/app/routes/deposits.py` | Python | User deposits | ✅ (2754012) |
| 24 | `backend/app/routes/orders.py` | Python | User orders | ✅ (2754012) |
| 25 | `backend/app/routes/payment_methods.py` | Python | Public PMs | ✅ |
| 26 | `backend/app/routes/products.py` | Python | Public products | ✅ |
| 27 | `backend/app/routes/referrals.py` | Python | Referrals | ✅ |
| 28 | `backend/app/routes/settings_public.py` | Python | Settings + health | ✅ (4657e13, 5bf031b) |
| 29 | `backend/app/routes/user.py` | Python | Profile + KYC | ✅ |
| 30 | `backend/app/services/cache_service.py` | Python | Redis cache | ✅ |
| 31 | `backend/app/services/cloudinary_service.py` | Python | Cloudinary | ✅ |
| 32 | `backend/app/services/imgbb_service.py` | Python | DEAD CODE | ✅ (unused) |
| 33 | `backend/app/services/telegram_service.py` | Python | Bot notifications | ✅ |
| 34 | `backend/app/utils.py` | Python | Error codes + helpers | ✅ |
| 35 | `backend/bot_main.py` | Python | Bot subprocess entry | ✅ |
| 36 | `backend/create_test_user.py` | Python | Dev utility | ✅ |
| 37 | `backend/migrate_images_to_cloudinary.py` | Python | One-time migration | ✅ |
| 38 | `backend/migrations/2026_09_24_numeric.py` | Python | FLOAT→NUMERIC | ✅ |
| 39 | `backend/migrations/__init__.py` | Python | Package marker | ✅ |
| 40 | `backend/requirements.txt` | Text | Python deps | ✅ |
| 41 | `backend/reset_test_data.py` | Python | Dev utility (خطير) | ✅ |
| 42 | `backend/run.py` | Python | Gunicorn + supervisor | ✅ |
| 43 | `backend/runtime.txt` | Text | python-3.13.12 | ✅ |
| 44 | `backend/tests/__init__.py` | Python | Test package | ✅ |
| 45 | `backend/tests/test_pricing_parity.py` | Python | Pricing test | ✅ |
| 46 | `bot/bot.py` | Python | Bot logic | ✅ (c5ec3cb, b0bd995) |
| 47 | `bot/requirements.txt` | Text | Bot deps | ✅ |
| 48 | `bump-sw-versions.sh` | Shell | SW helper | ✅ |
| 49 | `docs/06-api-contract.md` | Markdown | API contract | ✅ |
| 50 | `docs/CHANGELOG_v18.4.11.md` | Markdown | Changelog | ✅ |
| 51 | `docs/SUPERVISOR_TEST_v18.4.14.md` | Markdown | Test procedure | ✅ |
| 52 | `dump_all.sh` | Shell | Source dump | ✅ |
| 53 | `fix_decimal_backend_v18.4.13.py` | Python | Patch script | ✅ |
| 54 | `fix_decimal_v18.4.13.py` | Python | Patch script | ✅ |
| 55 | `fix_deposits_filter_v18.4.12.py` | Python | Patch script | ✅ |
| 56 | `fix_warnings_v18.4.14.py` | Python | Patch script | ✅ |
| 57 | `loadtest.js` | JS | k6 load test | ✅ |
| 58 | `loadtest.py` | Python | Python load test | ✅ |
| 59 | `loadtest_18.1.js` | JS | k6 v18.1 | ✅ |
| 60 | `loadtest_results.json` | JSON | Load test output | ✅ |
| 61 | `loadtest_v2.py` | Python | Load test v2 | ✅ |
| 62 | `loadtest_v2_results.json` | JSON | Load test v2 output | ✅ |
| 63 | `miniapp/css/style.css` | CSS | MiniApp styles | ✅ |
| 64 | `miniapp/index.html` | HTML | MiniApp shell | ✅ |
| 65 | `miniapp/js/api.js` | JS | API wrapper | ✅ |
| 66 | `miniapp/js/app_new.js` | JS | Core logic (~125KB) | ✅ (384a711) |
| 67 | `miniapp/js/telegram.js` | JS | Telegram SDK | ✅ |
| 68 | `miniapp/js/vip-badge.js` | JS | VIP renderer | ✅ |
| 69 | `miniapp/privacy.html` | HTML | Privacy policy | ✅ |
| 70 | `miniapp/sw.js` | JS | Self-destruct SW | ✅ |
| 71 | `miniapp/vercel.json` | JSON | Vercel config | ✅ |
| 72 | `patch_bot_v18.4.11.py` | Python | Patch script | ✅ |
| 73 | `phase1_bot_v18.4.14.py` | Python | Patch script | ✅ |
| 74 | `phase2_a11y_v18.4.14.py` | Python | Patch script | ✅ |
| 75 | `phase_b_v18.4.11.py` | Python | Patch script | ✅ |
| 76 | `test_error_throttle.py` | Python | Throttle test | ✅ |
| 77 | `backend/.env` (implicit) | Env | Secrets | ❌ .gitignore |

**⚠️ Not Tested:** لم تُراجَع 77 ملفًا سطراً بسطر. مراجعة selective.
**❓ Unknown:** 505 ملفًا آخر لم تُدرَج.

---

# §5. Bot — تفصيلي

**الملف:** `bot/bot.py` — ~450 سطر
**Deps:** `python-telegram-bot==22.6`, `python-dotenv==1.0.0`, `requests==2.31.0`

## §5.1 Functions (14)

| # | Function | النوع | مُستدعى من |
|---|---|---|---|
| 1 | `get_miniapp_url()` | sync | `start`, `admin_info` |
| 2 | `is_rate_limited(user_id)` | sync | `start`, `me` |
| 3 | `notify_admins_sync(msg, important)` | sync | متعدد |
| 4 | `register_or_update_user(...)` | sync | `start`, `me` |
| 5 | `heartbeat_loop()` | async | `post_init` |
| 6 | `post_init(application)` | async | PTB lifecycle |
| 7 | `post_shutdown(application)` | async | PTB lifecycle |
| 8 | `start(update, ctx)` | async | `CommandHandler("start")` |
| 9 | `me(update, ctx)` | async | `CommandHandler("me")` |
| 10 | `admin_info(update, ctx)` | async | `CommandHandler("admin_info")` |
| 11 | `_should_notify_error(err)` | sync | `error_handler` |
| 12 | `error_handler(update, ctx)` | async | PTB error handler |
| 13 | `create_application()` | sync | `run_polling` |
| 14 | `run_polling()` | sync | `bot_main.py` |

**الحالة:** 📖 Code Verified.

## §5.2 Handlers

    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("me", me))
    application.add_handler(CommandHandler("admin_info", admin_info))
    application.add_error_handler(error_handler)

**غير موجود:** ❌ Inline Mode, CallbackQueryHandler, MessageHandler.

## §5.3 Rate Limiting — نظامان منفصلان

**نظام 1 — Bot Command:**

| البند | القيمة |
|---|---|
| `RATE_LIMIT_MAX` | 10 |
| `RATE_LIMIT_WINDOW` | 60s |
| Storage | Redis `ratelimit:bot:{uid}:{bucket}` + in-memory fallback |
| Admin exempt | ✅ نعم |
| In-memory cap | 50,000 entries + LRU eviction 25% |
| Runtime test | ⚠️ لم يُختبر |
| الحالة | 📖 Code Verified |

**نظام 2 — Admin Login:**

| البند | القيمة |
|---|---|
| `LOGIN_RATE_MAX` | 5 |
| `LOGIN_RATE_WINDOW` | 300s |
| Storage | in-memory فقط |
| Runtime test | ✅ Verified 2026-10-04 |
| الحالة | ✅ Runtime Verified |

**الدليل:** Attempts 1-5 → 401، Attempt 6 → 429، Attempt 7 → 429.

**⚠️ حاشية:** in-memory يُفقَد عند restart Gunicorn. يحمي خلال جلسة worker واحدة، **لا يحمي** ضد distributed slow attack أو عبر restarts.

**إصلاح مستقبلي (P2):** نقل counter إلى Redis.

## §5.4 Heartbeat

- Interval: 60s | TTL: 90s | Key: `bot:heartbeat`
- `_heartbeat_task` محفوظ (v18.4.7 — منع GC) + `post_shutdown` يُلغي (v18.4.10)
- **الحالة:** ✅ Verified — age 24-43s في health 2026-10-04.

## §5.5 Error Handler + Throttling

| البند | القيمة |
|---|---|
| `_ERROR_NOTIFY_WINDOW` | 300s |
| `_ERROR_NOTIFY_MAX` | 3 |
| `_ERROR_NOTIFY_KEY_LEN` | 80 |

**السلوك:** 3 إشعارات / 5 دقائق لنفس النوع + bucket cleanup عند >1000 entries.
**حالة خاصة:** `Conflict` errors تُتجاهل بصمت.

## §5.6 Notifications

- لكل `ADMIN_IDS` — `requests.post` + `timeout=5` + `parse_mode=Markdown`.
- Silent failure مسجّل.

## §5.7 Post Init / Post Shutdown

`post_init`: cancel prev + `asyncio.create_task(heartbeat_loop())`.
`post_shutdown`: cancel + await + except CancelledError.
**الحالة:** ✅ Partial — `post_shutdown: heartbeat task cancelled` في logs.

## §5.8 Subprocess Interaction

Gunicorn fork → `post_fork` → Supervisor thread → `Popen(bot_main.py)` → loop مع restart 5s.

**الحالة:** ✅ Verified — PID 65, restarts: 0.
**⚠️ Not Tested:** crash recovery.

## §5.9 Backend API Calls

| Endpoint | Method | Auth |
|---|---|---|
| `/api/bot/auth` | POST | `X-Bot-Token` |

## §5.10 Environment Variables (Bot)

| Var | إلزامي؟ |
|---|---|
| `BOT_TOKEN` | ✅ نعم |
| `TELEGRAM_ADMIN_IDS` | ⚠️ لا (لا notifications) |
| `MINIAPP_URL` | default |
| `ADMIN_PANEL_URL` | default |
| `BACKEND_URL` | default |
| `BOT_API_SECRET` | ✅ نعم |
| `SENTRY_DSN` | اختياري |

---

# §6. Backend — تفصيلي

## §6.1 Entry Point

`backend/run.py`: Sentry init → `create_app()` → `db.create_all()` → `upgrade_database()` → Gunicorn → `post_fork` → Supervisor.

## §6.2 Gunicorn Config

| البند | القيمة |
|---|---|
| workers | 1 |
| threads | 4 |
| worker_class | `gthread` |
| timeout | 120 |
| graceful_timeout | 30 |
| keepalive | 5 |
| preload_app | False |

**الحالة:** ✅ Verified.

## §6.3 Supervisor + Bot

`post_fork` hook → thread daemon → loop: `Popen(bot_main.py)` → `wait()` → restart 5s عند crash. `atexit` مسجَّل.

## §6.4 Routes

- ✅ **العدد الإجمالي: 88** — verified runtime via `app.url_map.iter_rules()`
- ❌ **كل route على حدة** — contracts لم تُراجع
- ❌ **التوزيع الدقيق** — تقديري

**الحالة:** 🟡 Partial — count verified, contracts not audited.

**التوزيع التقريبي:** `admin.py` ~55, `user.py` 6, `auth.py` 4, `orders.py` 3, `deposits.py` 2, `referrals.py` 2, `settings_public.py` 2, `categories.py` 1, `coupons.py` 1, `payment_methods.py` 1, `products.py` 1.

## §6.5 Services

| Service | Purpose | الحالة |
|---|---|---|
| `cache_service.py` | Redis + invalidation + rate limit | 📖 |
| `cloudinary_service.py` | Uploads + signed URLs | 📖 |
| `imgbb_service.py` | **DEAD CODE** | ⚠️ Unused |
| `telegram_service.py` | 8 custom messages | 📖 |

## §6.6 Models (20 tables)

**✅ Verified via Neon SQL 2026-10-04:**

users, categories, products, product_bundles, orders, deposits, payment_methods, kyc_requests, notifications, transactions, settings, admin_otp_sessions, jwt_blacklist, admin_activities, service_requests, coupons, coupon_usages, referrals, financial_audit_log, user_product_discounts.

**`playing_with_neon` (Neon demo)** → ✅ **DROPPED** 2026-10-04.

**⚠️ Note:** لم تُراجَع جميع columns/indexes لكل جدول فرديًا. تحققنا من: 20 جدول (وجود) + 11 NUMERIC(14,4) + 10 UNIQUE constraints + 4 NOT NULL.
**❓ Unknown:** indexes إضافية، PKs، FKs الفردية.

## §6.7 Migrations

- `backend/migrations/2026_09_24_numeric.py` — FLOAT → NUMERIC(14,4) على 11 حقل. Idempotent.
- **⚠️ Not Tested:** لم يُشغَّل يدويًا. 📖 Code Verified.
- `upgrade_database()` في `run.py` — يعمل عند كل startup. ✅ Verified — logs أظهرت `referring_by_id migrated`, `stock=0 → NULL`.

## §6.8 Error Handlers

Flask: `handle_errors` decorator في `admin.py` — rollback + log + 500.

## §6.9 Cache Strategy

**يُخزَّن:** categories (300s), products (120s), payment-methods (300s), settings (300s).
**لا يُخزَّن:** orders, deposits, kyc, users, balance.
**Auto-invalidation:** `setup_cache_invalidation(app)` — مسح عند POST/PUT/DELETE.

**الحالة:** ✅ Partial — Redis connected + auto-invalidation registered؛ ⚠️ لم يُختبر runtime.

---

**انتهى Block 1**
# §7. Admin Panel — تفصيلي

**الموقع:** `admin/` (12 ملف)
**الـ shell:** `admin/index.html` — RTL، Cairo font، Material Icons، Chart.js 4.4.0، xlsx 0.18.5

## §7.1 الأقسام (17 — مُصرَّح بها في HTML)

| # | القسم | Section ID | الحالة |
|---|---|---|---|
| 1 | Dashboard | `section-dashboard` | ✅ Verified (لقطة UI 2026-10-04) |
| 2 | Inbox | `section-inbox` | ✅ Verified (لقطة UI) |
| 3 | Users | `section-users` | 📖 |
| 4 | Categories | `section-categories` | 📖 |
| 5 | Products | `section-products` | 📖 |
| 6 | Payment Methods | `section-payment-methods` | 📖 |
| 7 | Orders | `section-orders` | 📖 |
| 8 | Deposits | `section-deposits` | 📖 |
| 9 | KYC | `section-kyc` | 📖 |
| 10 | Service Requests | `section-service-requests` | 📖 |
| 11 | Coupons | `section-coupons` | 📖 |
| 12 | Referrals | `section-referrals` | 📖 |
| 13 | Notifications | `section-notifications` | 📖 |
| 14 | Settings | `section-settings` | 📖 |
| 15 | Archive | `section-archive` | 📖 |
| 16 | Activities | `section-activities` | 📖 |
| 17 | Audit Log | `section-audit-log` | 📖 |

**المصدر:** `admin/index.html` (FULL_SOURCE.md) + لقطة UI 2026-10-04.
**⚠️ Not Tested:** لم تُفتح كل شاشة — التركيز على Dashboard + Inbox + Login.

## §7.2 Auth Flow

    Login (username + password)
        ↓ POST /admin/login
        ↓ 200: {require_otp: true, session_id}
        ↓ Telegram OTP → all ADMIN_IDS
        ↓ User inputs 6-digit code
        ↓ POST /admin/verify-otp {session_id, otp_code}
        ↓ 200: {token: JWT}
        ↓ localStorage['admin_token'] = JWT

**المصدر:** `admin/js/admin.js:doLogin, showOTPForm, verifyOTP` + `backend/app/routes/admin.py:admin_login, admin_verify_otp`.
**الحالة:** ✅ Verified — Login + OTP استُخدِما في جلسة 2026-10-04 (دخول 3 مرات).

## §7.3 OTP Config

| البند | القيمة | المصدر |
|---|---|---|
| Code length | 6 digits | `admin.py:generate_otp_code()` |
| TTL | 300s | `OTP_TTL_SECONDS = 300` |
| Max attempts | 3 | `OTP_MAX_ATTEMPTS = 3` |
| Hash | `werkzeug.generate_password_hash` | `admin.py:admin_login` |
| Storage | `admin_otp_sessions` table | `models/base.py:AdminOTPSession` |
| Cleanup | `cleanup_expired_otp_sessions()` | `admin.py` |

**الحالة:** ✅ Verified (استُخدم فعليًا).

## §7.4 JWT (Admin)

| البند | القيمة |
|---|---|
| Algorithm | HS256 |
| Expiry | 2 hours |
| Secret | `JWT_SECRET_KEY` (≥ 32 char) |
| Storage | `localStorage['admin_token']` |
| Blacklist | `jwt_blacklist` table (by jti) |
| Revoke-all | `admin_sessions_revoked_at` setting |

**الحالة:** ✅ Verified — JWT مُولَّد + مقبول من Render في جلسة 2026-10-04.

## §7.5 Token Revocation

- **Single logout:** `POST /admin/api/logout` — adds jti to blacklist.
- **Revoke-all:** `POST /admin/api/logout-all` — writes `admin_sessions_revoked_at`.
- **Check:** `is_admin_token_revoked(jwt_payload)` — compares `iat < revoked_at`.

**المصدر:** `backend/app/routes/auth.py:revoke_all_admin_sessions, is_admin_token_revoked`.
**الحالة:** 📖 Code Verified.
**⚠️ Not Tested:** revoke-all runtime.

## §7.6 الميزات

| الميزة | الملف | المسار |
|---|---|---|
| Users | `admin.js` | render/filter/adjustBalance/ban/VIP/discount |
| Orders | `admin-v16.js` | renderOrders + swipe + bulk |
| Deposits | `admin-v16.js` | renderDeposits + approve/reject |
| KYC | `admin-v16.js` | renderKYC + approve/reject |
| Service Requests | `admin-v16.js` | renderServiceRequests |
| Archive | `admin-v16.js` | loadArchiveData + restore |
| Inbox | `admin.js` | loadInbox + auto-refresh |
| Products w/URL | `admin-v17.js` | input_type=url support |
| Dark Mode | `admin.js` | `toggleAdminTheme` |
| Pull-to-Refresh | `admin.js` | `AdminPTR` |
| Global Search | `admin.js` | `performGlobalSearch` (Ctrl+K) |

**الحالة:** 📖 Code Verified.

## §7.7 الحالات (Loading / Error / Empty)

| الحالة | المثال |
|---|---|
| Loading | Skeleton cards (`skeleton-card`) + `hourglass_empty` |
| Error | `empty-icon error` + error message |
| Empty | `empty-state` + `inbox_empty` |
| Success | Toast + overlay |

**المصدر:** `admin/css/admin.css` + `admin-v16.js:showToast`.
**الحالة:** 📖 Code Verified.

## §7.8 Accessibility

- 14 `aria-label` أُضيفت على inputs/selects.
- Script: `phase2_a11y_v18.4.14.py`.
- Commit: `166d1ef`.

**الحالة:** 📖 Code Verified.

## §7.9 Service Worker

- **Self-destruct** (`admin/sw.js` v18.3.0) — يُلغي نفسه عند activation.
- السبب: كان يخدم نسخًا قديمة من JS/CSS.

**الحالة:** 📖 Code Verified.

---

# §8. MiniApp — تفصيلي

**الموقع:** `miniapp/` (10 ملفات)
**الملف الأساسي:** `app_new.js` (~125 KB، ~2900 سطر)
**الـ shell:** `index.html` — RTL، Telegram SDK، Cairo + Tajawal.

## §8.1 الصفحات (9)

| # | الصفحة | Section ID |
|---|---|---|
| 1 | home | `page-home` |
| 2 | orders | `page-orders` |
| 3 | charge | `page-charge` |
| 4 | deposits | `page-deposits` |
| 5 | account | `page-account` |
| 6 | kyc | `page-kyc` |
| 7 | products | `page-products` |
| 8 | favorites | `page-favorites` |
| 9 | faq | `page-faq` |

**المصدر:** `miniapp/index.html`.
**الحالة:** 📖 Code Verified.

## §8.2 Telegram WebApp Integration

    const tg = window.Telegram?.WebApp;
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#00A0E9');
    tg.setBackgroundColor('#F5F7FA');

**initData flow:**

    const initData = window.Telegram.WebApp.initData;
    const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        body: JSON.stringify({ initData })
    });

- Backend verify: HMAC-SHA256 مع `WebAppData` key.
- Auth date max age: 600s (v18.2).

**المصدر:** `miniapp/js/telegram.js` + `backend/app/routes/auth.py:verify_telegram_init_data`.
**الحالة:** ✅ Verified — login يعمل runtime.

## §8.3 Service Worker

- **Self-destruct** (`miniapp/sw.js` v18.3.0).
- يُلغي نفسه في activation.
- مؤشر: `[SANAD] ✅ SW unregistered` في console.

**الحالة:** 📖 Code Verified.

## §8.4 Error Handling

    function showNotification(title, message, type = 'success') {
        // type: success | error | warning | info
        // duration: 2200ms (4000ms error)
    }

Flash-overlay + success-overlay patterns.

**المصدر:** `app_new.js:showNotification`.
**الحالة:** 📖 Code Verified.

## §8.5 XSS Protection

- `escapeHtml(str)` — HTML entities.
- `escapeAttr(str)` — attribute-safe.
- `safeCssUrl(url)` — P1 fix (commit `384a711`, 2026-10-04) — `encodeURI` + escape `'`, `(`, `)`.
- `copyToClipboard` — fallback to `execCommand`.

**المصدر:** `app_new.js` (top).
**الحالة:** ✅ Verified — `safeCssUrl` موجود 4 مرات في Vercel deploy 2026-10-04.

## §8.6 Pull-to-Refresh

    const PullToRefresh = (() => {
        const THRESHOLD = 70;
        const MAX_PULL = 110;
        async function triggerRefresh() { await loadInitialData(); }
    })();

**المصدر:** `app_new.js:PullToRefresh`.
**الحالة:** 📖 Code Verified.

## §8.7 Swipe Navigation

    const SwipeNav = (() => {
        const PAGES = ['page-home', 'page-orders', 'page-charge', 'page-deposits', 'page-account'];
        const SWIPE_THRESHOLD = 60;
    })();

**المصدر:** `app_new.js:SwipeNav`.
**الحالة:** 📖 Code Verified.

## §8.8 Splash Screen

- Canvas-based particles + shield animation.
- Tiers: shield-in → light-sweep → disintegrate → text reveal.
- `localStorage splash_seen_v11` — يتخطى من المرة الثانية.

**المصدر:** `app_new.js:SplashScreen`.
**الحالة:** 📖 Code Verified.

## §8.9 VIP Badges (7 levels)

| Level | Name | Icon |
|---|---|---|
| 1 | برونزي | `military_tech` |
| 2 | فضي | `star` |
| 3 | ذهبي | `emoji_events` |
| 4 | بلاتيني | `diamond` |
| 5 | ماسي | `auto_awesome` |
| 6 | أسطوري | `local_fire_department` |
| 7 | الأسطورة | `workspace_premium` |

**المصدر:** `app_new.js:VIP_LEVELS` + `miniapp/js/vip-badge.js`.

## §8.10 Image Compression

    function compressImageFile(file, maxWidth = 800, quality = 0.6) {
        // Canvas-based; output JPEG data URL
    }

**المصدر:** `app_new.js`.
**الحالة:** 📖 Code Verified.

## §8.11 Recently Viewed + Favorites

- `RECENTLY_VIEWED_KEY = 'recently_viewed'` (localStorage, max 6).
- `favorites` (localStorage array of IDs).

**الحالة:** 📖 Code Verified.

## §8.12 Currency Toggle

- `currentCurrency` — USD | SYP.
- `syp_rate` from public settings (default 132).

**الحالة:** 📖 Code Verified.

---

# §9. Database

## §9.1 Overview

- **Engine:** PostgreSQL 18.6 (Neon)
- **ORM:** SQLAlchemy (via Flask-SQLAlchemy 3.1.1)
- **Driver:** psycopg2 (forced via `config.py:_get_database_url()`)
- **عدد الجداول:** 20 ✅ Verified (Neon SQL, 2026-10-04)
- **إضافي:** `playing_with_neon` (Neon demo) → ❌ DROPPED 2026-10-04

## §9.2 Financial Fields (NUMERIC(14,4))

كلها ✅ Verified (Neon SQL, 2026-10-04):

| Table | Column | Type | Precision | Scale |
|---|---|---|---|---|
| users | balance | numeric | 14 | 4 |
| users | general_discount | numeric | 14 | 4 |
| users | max_negative_balance | numeric | 14 | 4 |
| users | referral_earnings | numeric | 14 | 4 |
| products | base_price | numeric | 14 | 4 |
| orders | total_price | numeric | 14 | 4 |
| orders | unit_price | numeric | 14 | 4 |
| orders | discount_amount | numeric | 14 | 4 |
| deposits | amount | numeric | 14 | 4 |
| deposits | fee | numeric | 14 | 4 |
| user_product_discounts | discount_percent | numeric | 14 | 4 |

## §9.3 UNIQUE Constraints — Verified

| Table | Constraint | Columns |
|---|---|---|
| users | users_telegram_id_key | telegram_id |
| users | users_referral_code_key | referral_code |
| orders | orders_order_number_key | order_number |
| orders | orders_idempotency_key_key | idempotency_key |
| deposits | deposits_transaction_id_key | transaction_id |
| deposits | uq_deposits_idempotency | idempotency_key |
| coupons | coupons_code_key | code |
| coupon_usages | uq_coupon_user | coupon_id, user_id |
| user_product_discounts | uq_user_product_discount | user_id, product_id |
| settings | settings_key_key | key |

**المصدر:** Neon SQL 2026-10-04.

## §9.4 NOT NULL — Checked Sample

| Table | Column | NOT NULL |
|---|---|---|
| users | telegram_id | ✅ |
| users | balance | ✅ |
| orders | total_price | ✅ |
| deposits | amount | ✅ |

**⚠️ Partial:** هذه الـ4 فقط. Full NOT NULL audit لم يُنفَّذ.

## §9.5 Relations (من `models/base.py`)

- `Order.user` — relationship('User', foreign_keys=[user_id]).
- `Order.product` — relationship('Product', foreign_keys=[product_id]).
- `Product.bundles` — relationship('ProductBundle', cascade='all, delete-orphan').
- `Category.products` — relationship('Product', backref='category').
- `User.referred_by_id` — self-referential FK (users.id, ondelete='SET NULL').
- `CouponUsage.coupon_id` → coupons.id.
- `FinancialAuditLog.user_id` → users.id.
- `UserProductDiscount.user_id` → users.id ondelete='CASCADE'.

**المصدر:** `backend/app/models/base.py`.
**الحالة:** 📖 Code Verified.

## §9.6 Indexes (مذكورة في `models/base.py`)

- `idx_users_kyc_status`, `idx_users_vip_level`, `idx_users_is_banned`
- `idx_orders_user_status`, `idx_orders_created_at`
- `idx_deposits_user_status`, `idx_deposits_created_at`
- `idx_notifications_user_read`
- `idx_transactions_user_created`
- `idx_audit_user_created`, `idx_audit_action`
- `idx_products_category_active` (partial: `deleted_at IS NULL`)
- `idx_coupons_code_active` (partial: `deleted_at IS NULL`)
- `idx_upd_user`, `idx_upd_product`

**الحالة:** 📖 Code Verified.
**⚠️ Not Tested:** لم يُتحقَّق من وجودها فعليًا في Production DB.

## §9.7 Migration Strategy

- **الملف:** `backend/migrations/2026_09_24_numeric.py`
- **الوظيفة:** FLOAT → NUMERIC(14,4) على 11 حقل مالي.
- **Idempotent:** نعم. **تشغيل:** يدوي.
- **Runtime migration:** `upgrade_database()` في `run.py` — عند كل startup.
- **الحالة:** ✅ Verified — logs أظهرت `referring_by_id migrated`, `stock=0 → NULL`.

## §9.8 Backup Strategy

3 طبقات:

1. **Neon PITR 6 ساعات** ✅ (Free plan).
2. **Neon Manual Snapshot** — 1 max على Free: `pre-migration-v2.1` (37MB, 16d ago) ✅.
3. **GitHub Actions encrypted backup** ✅ جديد (2026-10-04):
   - Daily 2 AM UTC.
   - `pg_dump` 18.6 + gzip + AES-256-CBC (PBKDF2 100k iter).
   - Artifact retention 90d.
   - PASS: 420KB encrypted artifact (Run #19).
   - PASS: local decryption verified (20 tables + real data).
   - Restore drill: ❌ لم يُنفَّذ استرجاع فعلي.

**المصدر:** `.github/workflows/backup.yml` + Neon console + GitHub Actions.
**الحالة:** ✅ Partial.

---

# §10. Redis

## §10.1 Keys

| Key Pattern | TTL | Writer | Reader | Purpose |
|---|---|---|---|---|
| `cache:categories:all` | 300s | categories.py | categories.py | Public categories |
| `cache:products:all` | 120s | products.py | products.py | Products (all) |
| `cache:products:cat:{id}` | 120s | products.py | products.py | Products by category |
| `cache:payment-methods:all` | 300s | payment_methods.py | payment_methods.py | Public PMs |
| `cache:settings:public` | 300s | settings_public.py | settings_public.py | Store settings |
| `bot:heartbeat` | 90s | bot:heartbeat_loop | settings_public.py:health | Bot liveness |
| `ratelimit:bot:{uid}:{bucket}` | 60s | cache_service | same | Bot rate limit |
| `ratelimit:admin_login:{ip}` | ❌ غير مستخدم | — | — | Admin login uses in-memory only |

## §10.2 TTL Constants

    TTL_CATEGORIES = 300
    TTL_PRODUCTS = 120
    TTL_PAYMENT_METHODS = 300
    TTL_SETTINGS = 300
    TTL_SINGLE_PRODUCT = 180
    TTL_DEFAULT = 60
    TTL_ADMIN_LISTS = 0          # deprecated

**المصدر:** `cache_service.py`.

## §10.3 Fallback Strategy

- **Rate limit:** Redis → None إذا فشل → in-memory fallback.
- **Cache:** Redis → None إذا فشل → DB direct read.
- **لا crash** في الحالتين.

**المصدر:** `cache_service.py:cache_get, cache_set, rate_limit_check`.
**الحالة:** 📖 Code Verified.
**⚠️ Not Tested:** سلوك عند Redis down runtime.

## §10.4 Redis Health Alerts

- `_mark_redis_down(error)` — Sentry message + set flag.
- `_mark_redis_up()` — Sentry message.
- Flag `_redis_down` globally tracked.

**المصدر:** `cache_service.py`.

## §10.5 Memory Considerations

- In-memory rate limit cap: `LOGIN_RATE_MAX_KEYS = 10_000` (admin login).
- Bot rate limit in-memory fallback cap: 50,000 entries (bot).
- LRU eviction 25% when exceeded.

**المصدر:** `admin.py:check_login_rate_limit` + `bot.py:is_rate_limited`.
**الحالة:** ✅ Verified — fix في `07ea924`.

## §10.6 Auto-Invalidation

- `setup_cache_invalidation(app)` — after_request hook.
- مسح pattern على POST/PUT/DELETE ناجح.
- Patterns: `cache:categories:*`, `cache:products:*`, `cache:payment-methods:*`, `cache:settings:*`.

**المصدر:** `cache_service.py:setup_cache_invalidation`.
**الحالة:** ✅ Partial — registered في logs.

---

# §11. Authentication & Authorization

## §11.1 Telegram initData HMAC

    secret_key = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(calculated_hash, received_hash)

Max age: 600s (`AUTH_DATE_MAX_AGE = 600`).

**المصدر:** `backend/app/routes/auth.py:verify_telegram_init_data`.
**الحالة:** ✅ Verified — login يعمل runtime.

## §11.2 X-Bot-Token

    provided = request.headers.get("X-Bot-Token", "")
    if not hmac.compare_digest(provided, secret):
        return jsonify({"error": "غير مصرح"}), 401

**المصدر:** `auth.py:bot_auth`.
**الحالة:** 📖 Code Verified.

## §11.3 JWT

| البند | القيمة |
|---|---|
| Algorithm | HS256 |
| Expiry | `timedelta(hours=2)` |
| Secret | `JWT_SECRET_KEY` — إلزامي، ≥32 char |
| Blacklist | `JWTBlacklist` table |
| Revoke-all | عبر `admin_sessions_revoked_at` |

**المصدر:** `config.py` + `extensions.py` + `auth.py`.
**الحالة:** ✅ Verified — JWT محلي مقبول من production.

## §11.4 Admin OTP

| البند | القيمة |
|---|---|
| Length | 6 digits |
| TTL | 300s |
| Max attempts | 3 |
| Hash | werkzeug `generate_password_hash` |
| Cleanup | `cleanup_expired_otp_sessions()` |

**المصدر:** `admin.py`.

## §11.5 Password Hashing

- Admin password: `ADMIN_PASSWORD_HASH` env → `check_password_hash`.
- إلزامي: `RuntimeError` إذا مفقود.

**المصدر:** `admin.py:verify_admin_password`.

## §11.6 Constant-Time Comparisons

- ✅ `hmac.compare_digest` في `bot_auth`.
- ✅ `hmac.compare_digest` في `verify_telegram_init_data`.
- ✅ `check_password_hash` (werkzeug — constant-time).

## §11.7 CORS

    ALLOWED_ORIGINS = [
        "https://sanad-plus.vercel.app",
        "https://sanad-plus-admi.vercel.app",
    ]

**⚠️ معلومة صريحة:** قائمة ثابتة في الـ config. ليست قراءة من env حاليًا.

## §11.8 Security Headers (Backend after_request)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()`
- `Strict-Transport-Security` (production فقط — if `os.getenv("RENDER")`)
- `Cache-Control: no-store` لـ `/api/` و `/admin/`

**المصدر:** `backend/app/__init__.py:add_security_headers`.

## §11.9 CSP (Vercel)

- `admin/vercel.json`: custom CSP (default-src 'self' + jsdelivr + telegram.org).
- `miniapp/vercel.json`: minimal headers.

**الحالة:** 📖 Code Verified.

## §11.10 Rate Limit Layers

| الطبقة | Config | Storage | Verified |
|---|---|---|---|
| Flask-Limiter (default) | 500/hour, 100/minute (per IP) | Redis or memory | 📖 |
| Admin login | 5 / 5min (IP) | in-memory | ✅ 2026-10-04 |
| Admin OTP verify | 10 / 5min (IP) | Redis or memory | 📖 |
| Bot commands | 10 / 60s (per user) | Redis + memory fallback | 📖 |

**المصدر:** `backend/app/__init__.py` + `admin.py` + `bot.py`.

---

# §12. Security Audit

| الفحص | النتيجة | الدليل |
|---|---|---|
| `.env` tracked in Git? | ❌ NO | `.gitignore` + `git ls-files` |
| `.db` tracked? | ❌ NO | `.gitignore` |
| Secrets in HEAD? | ❌ NO (clean) | Master Ref §26 + scan |
| `SECRET_KEY` default `change-me`? | ✅ Fixed | `config.py` + runtime test |
| `JWT_SECRET_KEY` fallback? | ✅ Fixed | same |
| `SECRET_KEY` length check? | ✅ (≥ 32) | RuntimeError test |
| `.env` in git history? | ❓ Unknown | يحتاج `git log -p -S` scan |
| Historical secrets scan? | ❓ Unknown | يحتاج trufflehog |
| Rate limit (bot) | 📖 Code Verified | لم يُختبر runtime |
| Rate limit (admin login) | ✅ Verified (5→429) | Session test |
| Constant-time compares | ✅ Verified | Multiple locations |
| SQL injection | ✅ No raw SQL w/ user input | SQLAlchemy ORM فقط |
| XSS (admin) | ✅ escapeHtml/escapeAttr | v17.2 commits |
| XSS (MiniApp) | ✅ escapeHtml + safeCssUrl | runtime verified |
| CSS injection | ✅ Fixed (`384a711`) | Runtime Verified |
| Sensitive data in logs? | 🟡 bot.py reduces httpx logs | `e2155b5` |
| `ADMIN_PASSWORD` env removed? | ✅ | `ADMIN_PASSWORD_HASH` only |
| Image upload validation | ✅ MIME + size + magic bytes | `user.py` + `deposits.py` |
| `RENDER_GIT_COMMIT` exposure | ✅ Safe (public SHA) | `/api/health` |

**🔴 Gaps مؤكدة:**

- Full git history secrets scan.
- Penetration test.
- DDoS resilience.
- Full route-by-route security audit.

**🟡 Partials:**

- Sentry `traces_sample_rate = 0.2` (80% traces غير مُسجَّلة).
- `.env` local file permissions not audited.
- Rate limit distributed slow attack exposure.

**المصدر:** `backend/app/config.py` + `bot/bot.py` + sessions 2026-10-03/04.

---

**انتهى Block 2**
# §13. العمليات المالية

⚠️ **تحذير منهجي:** هذا القسم حساس. `Verification` هنا يشير إلى ما تم اختباره فعليًا، لا إلى ما هو موجود في الكود.

## §13.1 Matrix

| Operation | Decimal | Atomic | Row Lock | Idempotency | Audit Log | Verification |
|---|---|---|---|---|---|---|
| Order create | ✅ | ✅ | ✅ (order/user/product) | ✅ | ✅ | 📖 Code Verified |
| Order cancel | ✅ | ✅ | ✅ | — | ✅ | 📖 Code Verified |
| Order status change (admin) | ✅ | ✅ | ✅ (`b1dc41f`) | — | ✅ | 📖 Code Verified |
| Order bulk status | ✅ | ✅ | ✅ (`b1dc41f`) | — | ✅ | 📖 Code Verified |
| Deposit create | ✅ | ✅ | — | ✅ | — | 📖 Code Verified |
| Deposit approve | ✅ | ✅ | ✅ (`384e171`) | — | ✅ | 📖 Code Verified |
| Deposit reject | ✅ | ✅ | ✅ (`384e171`) | — | ✅ | 📖 Code Verified |
| **Balance adjust (admin)** | ✅ | ✅ | ✅ (`e8b7ee5`) | — | ✅ | ✅ **Runtime Verified** |
| KYC approve | ✅ | ✅ | ✅ (`384e171`) | — | — | 📖 Code Verified |
| KYC reject | ✅ | ✅ | ✅ (`384e171`) | — | — | 📖 Code Verified |
| Referral reward | ✅ | ✅ | ✅ | — | ✅ | 📖 Code Verified |

**الدليل Runtime الوحيد:** `admin_adjust_balance` اختُبر تحت concurrency في 2026-10-03 (طلبين متوازنين، النتيجة: A=499.01, B=499.02، لا Lost Update).

## §13.2 Decimal Handling

- كل الحقول المالية `NUMERIC(14,4)` ✅ Verified via Neon SQL 2026-10-04.
- Python: `Decimal(str(...))` + `quantize(Decimal('0.0001'), ROUND_HALF_UP)`.
- إصلاح `Decimal + float` في `admin_adjust_balance` — commit `9ef93bc` ✅ Runtime Verified.
- `orders.py:create_order` يستخدم نفس النمط (`_d()` helper).

## §13.3 Race Conditions — Fixed (P0)

| Race | الملف | Fix Commit | Runtime Test |
|---|---|---|---|
| Double Refund (admin vs cancel) | `admin.py:admin_update_order_status` | `b1dc41f` | 📖 |
| Double Refund (bulk) | `admin.py:admin_bulk_order_status` | `b1dc41f` | 📖 |
| Double Approve (deposits) | `admin.py:admin_approve_deposit` | `384e171` | 📖 |
| Double Approve (KYC) | `admin.py:admin_approve_kyc` | `384e171` | 📖 |
| **Lost Update (balance)** | `admin.py:admin_adjust_balance` | `e8b7ee5` | ✅ **Runtime Verified 2026-10-03** |

**Lock Order — ملاحظة منهجية:**

- `orders.py:cancel_order` — ترتيب فعلي: `order → user → product` (مقروء من الكود).
- إصلاحات P0 في `admin.py` (commits `b1dc41f`, `384e171`, `e8b7ee5`) تتبع **نفس ترتيب `cancel_order`** لمنع deadlock.
- ⚠️ **لا يوجد تعليق "canonical order" في الكود** — التوحيد قرار تنفيذي، وليس موثَّقًا في مصدر.
- ⚠️ **Not Tested:** لم يُختبر سلوك deadlock تحت حمل فعلي بين مسارين متزامنين.

## §13.4 Idempotency Race — P1

- `UNIQUE` constraint على `idempotency_key` في `orders` + `deposits` ✅ Verified (Neon).
- `except IntegrityError` catch → returns winning row ✅ Code Verified (commit `2754012`).
- **⚠️ Not Tested Runtime:** لم ينجح اختبار التزامن الفعلي في هذه الجلسة (قيود بيئية).

**مخاطر مُقدَّرة:** منخفضة — keys تُولَّد بـ `Date.now() + random`.

## §13.5 Audit Trail

- `FinancialAuditLog` table.
- `log_financial()` helper — يكتب IP + user-agent + balance_before/after.
- `Transaction` table — قائمة الحركات.

**الحالة:** 📖 Code Verified.
**⚠️ Not Tested:** لم يُتحقَّق Runtime من أن كل عملية مالية تُنشئ audit entry.

---

# §14. الخدمات الخارجية

| Service | Purpose | Status | Failure Impact | Recovery |
|---|---|---|---|---|
| Telegram Bot API | Bot + MiniApp | ✅ Live | Bot offline | Status page |
| Render | Backend + Bot | ✅ Live | Backend down | Rollback + restart |
| Vercel | Admin + MiniApp | ✅ Live | Frontend down | Redeploy |
| Neon PostgreSQL | Primary DB | ✅ Live | Total outage | PITR 6h + backups |
| Upstash Redis | Cache + heartbeat | ✅ Live | Degraded (fallback) | Auto-reconnect |
| Sentry | Error tracking | ✅ Active | Lost tracking | Account |
| UptimeRobot | Health monitoring | ✅ Active | Lost monitoring | Account |
| Cloudinary | Images | ✅ Active | Public fallback | Graceful |
| ImgBB | — | ❌ Unused | N/A | N/A |
| GitHub | Source + Actions | ✅ Active | Deployment halted | Local repo |

**المصدر:** Render logs + health + user + FULL_SOURCE §28.

**⚠️ Not Tested Runtime لكل خدمة:**

- Sentry: عدد الأحداث الفعلي غير معروف (يحتاج dashboard).
- UptimeRobot: النسبة الحالية غير معروفة (يحتاج dashboard).
- Neon PITR: النافذة 6h مؤكدة من Neon console، لكن لم يُنفَّذ restore drill.

---

# §15. Deployment

## §15.1 العملية

    Developer (local)
        → git push origin main
        → GitHub webhook fires
        → Render (backend) + Vercel (frontend) deploy
        → Render: pip install → python backend/run.py
        → Gunicorn: 1 worker × 4 threads
        → post_fork hook → Bot supervisor thread
        → Bot subprocess starts
        → Health: 200

## §15.2 Render Config

| البند | القيمة |
|---|---|
| Build command | `pip install -r backend/requirements.txt` |
| Start command | `python backend/run.py` |
| Runtime | `python-3.13.12` (من `backend/runtime.txt`) |
| Region | Frankfurt |
| Plan | Free |

## §15.3 Deploy Times (Verified)

| Deploy | التاريخ | المدة | Result |
|---|---|---|---|
| P1 batch (fe7e64b, e511f8a, 07ea924, 384a711, 4657e13, 2754012) | 2026-10-03/04 | ~30-40s | ✅ Live |
| Health commit field (`5bf031b`) | 2026-10-04 01:04:09 UTC | **31s** | ✅ Live |

**المصدر:** Render logs (`==> Deploying...` → `Your service is live 🎉`).

## §15.4 Auto-Deploy

✅ Enabled — كل push إلى `main` يُطلق Render + Vercel.

## §15.5 Rollback

    git revert <merge-commit-sha> -m 1 && git push origin main

Render auto-redeploys. ⏱️ ~60s من push إلى live.
**⚠️ Not Tested:** لم يُنفَّذ rollback drill فعلي.

## §15.6 Last Known-Good

`5bf031b` (HEAD الحالي، verified live 2026-10-04).
Anchor المرجعي: `9f89bf5` (v18.4.14).

## §15.7 Deploy-time Conflict

أثناء كل deploy مع bot subprocess:

    telegram.error.Conflict: terminated by other getUpdates request

**السبب:** البوت القديم لا يزال polling عند بدء البوت الجديد → Telegram يرفض أحدهما.

**التأثير:**

- ✅ لا ضرر وظيفي (البوت الجديد يستلم polling).
- 🟡 noise في Sentry مع كل deploy.

**تحديث 2026-10-04:** الحماية **موجودة فعلًا** في `error_handler` (bot/bot.py ~سطر 427):
`if "Conflict" in error_str: logger.warning(...); return` — لا Sentry capture، لا إشعارات.
الـ noise المرصود في logs `2026-10-04 01:04:12` لم يأتِ من `error_handler`، ويحتاج تحققًا من Sentry dashboard (P2-7).

**المصدر:** Render logs 2026-10-04 01:04:12.

---

# §16. Monitoring

## §16.1 Sentry

| البند | القيمة | المصدر |
|---|---|---|
| Status | ✅ Active | Render logs: Sentry initialized |
| Env var | `SENTRY_DSN` | `config.py` |
| Environment | production | `run.py` |
| Traces sample rate | 0.2 | `run.py` |
| Profiles sample rate | 0.0 | `run.py` |
| send_default_pii | False | `run.py` |

**⚠️ تحذير صريح:** `traces_sample_rate = 0.2` يعني 80% من traces لا تُسجَّل. هذا اختياري (تقليل التكلفة)، لكنه يعني فقدان أدلة على أداء Requests الفردية.

**❓ Unknown:** عدد الأخطاء الفعلية، آخر حدث، آخر أسبوع — يحتاج Sentry dashboard.

## §16.2 UptimeRobot

| البند | القيمة | المصدر |
|---|---|---|
| URL | `sanad-plus-backend.onrender.com/api/health` | user |
| Interval | 5 min | UptimeRobot pattern |
| 24h uptime | 100% (2026-09-29) | Master Ref §34 |
| 7d uptime | 99.899% | same |
| 30d uptime | 58.402% | same |

**❓ Unknown:** الحالة الحالية — يحتاج dashboard.

## §16.3 Health Endpoint — الحقول الفعلية

**Path:** `/api/health` | **Method:** GET | **Auth:** Public

**Response fields (بعد `5bf031b`):**

| Field | Type | المصدر | Example |
|---|---|---|---|
| `status` | string | code | `"ok"` |
| `version` | string | hardcoded anchor | `"v18.4.14"` |
| `commit` | string (7char) | `RENDER_GIT_COMMIT` env | `"5bf031b"` |
| `timestamp` | int (unix) | `int(time.time())` | `1791063...` |
| `checks.bot.status` | string | Redis lookup | `"ok"` |
| `checks.bot.last_heartbeat` | int | Redis | `1791063890` |
| `checks.bot.age_seconds` | int | computed | `24` |
| `checks.database.status` | string | SELECT 1 | `"ok"` |
| `checks.database.latency_ms` | float | measured | `4.63` |
| `checks.redis.status` | string | `ping()` | `"ok"` |
| `checks.redis.latency_ms` | float | measured | `1.6` |
| `total_latency_ms` | float | measured | `7.75` |

**Bot non-critical (commit `4657e13`, 2026-10-04):** Bot unavailable لا يُرجع 503. `degraded` flag يُضبط فقط عند DB/Redis failure.
**DB + Redis critical:** أي منهما معطل → 503.

**Runtime Sample (2026-10-04):**

    {
      "version": "v18.4.14",
      "commit": "5bf031b",
      "status": "ok",
      "checks": {
        "bot":      {"status": "ok", "age_seconds": 24},
        "database": {"status": "ok", "latency_ms": 4.63},
        "redis":    {"status": "ok", "latency_ms": 1.6}
      }
    }

**المصدر:** Runtime curl + `settings_public.py:health_check()`.

## §16.4 Heartbeat Threshold

- Interval: 60s (bot writer).
- TTL: 90s (Redis).
- Age threshold for ok: `< 120s`.
- Age threshold for stale: `>= 120s`.

**الحالة:** ✅ Verified — heartbeat يعمل runtime.

## §16.5 Monitoring Gaps

- ❌ DB size monitoring.
- ❌ Rate limit breach alerts.
- ❌ Disk usage (Render Free محدود).
- ❌ 500-error frequency tracking.
- ❌ Deploy-time Conflict notifications.
- ❌ Cost monitoring (Sentry + Neon + Upstash).

---

# §17. الأداء والسعة

## §17.1 أرقام Verified

| القياس | القيمة | التاريخ | المصدر |
|---|---|---|---|
| Health backend latency | 7.75ms | 2026-10-04 | curl |
| Health DB latency | 4.63ms | 2026-10-04 | curl |
| Health Redis latency | 1.6ms | 2026-10-04 | curl |
| Redis ×3 samples | 2.93 / 1.54 / 1.48ms | 2026-10-04 | loop |
| Concurrency (2 parallel) | 499.01 + 499.02 | 2026-10-03 | admin test |
| Deploy time | 31s | 2026-10-04 | Render logs |

## §17.2 Load Test — الأخير

**التاريخ:** 2026-09-24 (10 أيام قبل كتابة المرجع).
**الملف:** `loadtest_v2_results.json`.
**⚠️ لا يمثّل النسخة الحالية (HEAD `5bf031b`).**

| Metric | Value |
|---|---|
| VUs | 20 |
| Duration | 60s |
| Total requests | 1684 |
| Status 200 | 400 (23.8%) |
| Status 429 | 1284 (76.2%) |
| avg latency | 415.78 ms |
| p95 | 807.42 ms |
| p99 | 1240.56 ms |
| max | 1596.73 ms |

**⚠️ إعادة تصنيف:** 76% من الطلبات رُفضت بـ 429 — هذا اختبار Rate Limiter، ليس اختبار capacity. الأرقام تعكس صحة التحديد أكثر من قدرة الـ Backend.

## §17.3 الأرقام غير المعروفة

| السؤال | الجواب |
|---|---|
| كم مستخدم يتحمّل البوت؟ | ❓ Unknown — لا اختبار |
| على أي أساس الرقم؟ | ❌ لا يوجد |
| Load test على HEAD الحالي؟ | ❌ لا |
| Telegram API rate limits? | ❓ BotFather محدّدات |
| نقطة الانهيار؟ | ❓ Unknown |
| خطة التوسع؟ | ❌ غير موجودة |

## §17.4 تقديرات مُدعَّمة (بنية فقط)

**من الكود:**

- Gunicorn: 1 worker × 4 threads = 4 concurrent requests max (قبل التشبع).
- Flask-Limiter: 100/min per IP.
- Bot: 10/min per user.
- Redis: `socket_timeout=3`, `socket_connect_timeout=3`.

**تقدير حسابي (not measured):**

- ~30-50 req/sec قبل التشبع — ⚠️ تقدير بنيوي، ليس قياسًا.

**قيد صريح:** لا رقم "عدد مستخدمين" بدون load test حقيقي.

---

# §18. Fix History

## ملاحظة زمنية (قبل الجدول)

- `9f89bf5` = آخر commit بـ `v18.4.14` في commit message.
- **لا يوجد git tag رسمي** `v18.4.14` — الإشارة نصية فقط.
- HEAD الحالي = `5bf031b`.
- الفارق `9f89bf5 → 5bf031b` = **17 commit**.
- `v18.4.14` في `/api/health` = **anchor**، وليس آخر deploy.

| # | المشكلة | الحل | Commit | التاريخ | الملفات | Verification |
|---|---|---|---|---|---|---|
| 1 | Initial commit | — | (initial) | 2026-09-09 | — | — |
| 2 | v15 → v17 features | متعدد | (متعدد) | 2026-09-24 | — | — |
| 3 | Version mismatch (v18.4.8) | sync to v18.4.14 | (متعدد) | 2026-09-26 | — | ✅ |
| 4 | BOT_VERSION drift | v18.4.10.1 → v18.4.14 | (متعدد) | 2026-09-27 | `bot/bot.py` | ✅ |
| 5 | Notification flood | Throttling | `b0bd995` | 2026-09-28 | `bot/bot.py` | 📖 |
| 6 | Deposits filter stuck | Reset fix | `c5ec3cb` | 2026-09-29 | `admin-v16.js` | ✅ |
| 7 | Decimal → string → float | float conversion | `f0661ad` | 2026-09-29 | (متعدد) | 📖 |
| 8 | CORS/CSP warnings | Cleanup | `218b7b3` | 2026-09-29 | `admin/vercel.json` | ✅ |
| 9 | Accessibility | aria-labels | `166d1ef` | 2026-09-29 | `admin/index.html` | 📖 |
| 10 | Logger position bug | Move logger | `5cf4003` | 2026-09-29 | `bot/bot.py` | 📖 |
| 11 | Rate limit overflow | LRU eviction | `5cf4003` | 2026-09-29 | `bot/bot.py` | 📖 |
| 12 | ADMIN_PASSWORD env | Remove | (بين) | 2026-09-29 | Render env | ✅ |
| 13 | Order locks (P0) | with_for_update | `b1dc41f` | 2026-10-03 | `admin.py` | 📖 |
| 14 | Deposit + KYC locks (P0) | with_for_update | `384e171` | 2026-10-03 | `admin.py` | 📖 |
| 15 | Balance lock (P0) | with_for_update | `e8b7ee5` | 2026-10-03 | `admin.py` | ✅ Runtime |
| 16 | SECRET_KEY fail-loud (P0) | RuntimeError | `b90859a` | 2026-10-03 | `config.py` | ✅ Runtime |
| 17 | Decimal in admin_adjust_balance (P0.5) | `Decimal(str())` | `9ef93bc` | 2026-10-03 | `admin.py` | ✅ Runtime |
| 18 | Encrypted backup (P1#6) | openssl + artifact | `35ffd5c` | 2026-10-03 | `backup.yml` | ✅ Runtime |
| 19 | Backup: fail on empty dump | pipefail + size | `fe7e64b` | 2026-10-03 | same | ✅ Runtime |
| 20 | pg_dump version mismatch | full path pg_dump 18 | `e511f8a` | 2026-10-04 | same | ✅ Runtime |
| 21 | `_login_attempts` memory leak (P1#1) | dict + cap + LRU | `07ea924` | 2026-10-04 | `admin.py` | ✅ Runtime |
| 22 | CSS injection (P1#3) | safeCssUrl | `384a711` | 2026-10-04 | `app_new.js` | ✅ Runtime |
| 23 | Health 503 (P1#4) | bot non-critical | `4657e13` | 2026-10-04 | `settings_public.py` | ✅ Runtime |
| 24 | Idempotency race (P1#2) | except IntegrityError | `2754012` | 2026-10-04 | `orders.py`, `deposits.py` | 🟡 Code Verified — Not Runtime Tested |
| 25 | Health version ambiguity | commit field | `5bf031b` | 2026-10-04 | `settings_public.py` | ✅ Runtime |

**Sources:** `git log`, session commands, Render logs.
**⚠️ Not Audited:** ~290 commit إضافي لم تُراجَع diffs.

---

**انتهى Block 3**
# §19. المشاكل الحالية

## 🔴 Critical

**لا توجد مشاكل Critical معروفة.**

## 🟠 High

| # | المشكلة | الملف | التأثير | الاحتمالية | Verification | الحل المقترح |
|---|---|---|---|---|---|---|
| H1 | Idempotency race غير مختبر Runtime | `orders.py`, `deposits.py` | 500 double POST | منخفضة | 🟡 Code Verified | Test harness مُحسَّن |
| H2 | Backup restore drill غير منفّذ | `backup.yml` | فشل استرجاع غير مكتشف | متوسطة | ⚠️ Not Tested | جدولة drill شهري |
| H3 | Deploy-time Telegram Conflict | `bot/bot.py:error_handler` | 🟡 noise، لا ضرر وظيفي | مرتفعة (كل deploy) | 📖 Code Verified | Suppress Conflict + backoff |

## 🟡 Medium

| # | المشكلة | الملف | التأثير |
|---|---|---|---|
| M1 | `imgbb_service.py` — Dead code | `services/` | دَين تقني |
| M2 | `TTL_ADMIN_LISTS = 0` — deprecated stub | `cache_service.py` | ارتباك |
| M3 | `invalidate_admin()` — no-op | `cache_service.py` | ارتباك |
| M4 | Potential duplicate `requirements.txt` | `backend/` + root? | صيانة |
| M5 | `patch_*.py` (5), `fix_*.py` (4), `phase*.py` (3) في repo | repo root | فوضى |
| M6 | Load test files tracked | repo root | دَين |
| M7 | `create_test_user.py`, `reset_test_data.py` في repo إنتاجي | `backend/` | خطر تشغيل خاطئ |
| M8 | `version` field = anchor، وليس current deploy — `commit` يُغلق الغموض | `settings_public.py` | ✅ Fixed (`5bf031b`) |

## 🟢 Low

| # | المشكلة | التأثير |
|---|---|---|
| L1 | Node.js 20 deprecation في actions | noise |
| L2 | لا README للمشروع | onboarding |
| L3 | تعليقات عربية/إنجليزية مختلطة | قراءة |
| L4 | `.env.example` غير موجود | onboarding |
| L5 | Sentry `traces_sample_rate = 0.2` (80% traces مفقودة) | فقدان أدلة أداء |

---

# §20. Technical Debt

| Item | Type | Location | Status |
|---|---|---|---|
| `imgbb_service.py` | Dead code | `services/` | ✅ Unused |
| `TTL_ADMIN_LISTS = 0` | Deprecated stub | `cache_service.py` | 📖 |
| `invalidate_admin()` | No-op | `cache_service.py` | 📖 |
| `backend/requirements.txt` vs root? | Potential duplicate | ? | ❓ Not verified |
| `patch_*.py` (5 ملفات) | Temp scripts | repo root | ✅ tracked |
| `fix_*.py` (4 ملفات) | Temp scripts | repo root | ✅ tracked |
| `phase*.py` (3 ملفات) | Temp scripts | repo root | ✅ tracked |
| `loadtest*.json` (2) | Test artifacts | repo root | ✅ tracked |
| `create_test_user.py` | Dev utility | `backend/` | ✅ tracked |
| `reset_test_data.py` | Dangerous dev util | `backend/` | ✅ tracked |
| `dump_all.sh` | Utility | repo root | ✅ tracked |
| TODO/FIXME comments | ? | multiple | ❓ Not scanned |
| `.env.example` | Missing | — | ❌ Not present |
| `audit_*.txt/csv` | Untracked audit artifacts | repo root | 🟡 untracked |

**⚠️ لم يُفحَص grep لـ TODO/FIXME على كل 582 ملف.**

---

# §21. Documentation Gaps

| Gap | Severity | السبب | الدليل المطلوب | Status |
|---|---|---|---|---|
| Historical git secrets scan | High | لم يُنفَّذ | `git log -p -S` + trufflehog | ❓ Open |
| Full 582 files content review | Medium | ~40/582 فقط | Systematic audit | 🟡 ~7% |
| ~290 commit diffs unreviewed | Medium | ~10/300 | Full `git log -p` scan | 🟡 ~3% |
| Sentry recent events | Low | يحتاج dashboard | Manual check | ❓ Open |
| UptimeRobot current % | Low | يحتاج dashboard | Manual check | ❓ Open |
| Production DB full schema diff | Medium | Sample only | `\d+` + diff script | 🟡 |
| Load test current version | High | آخر اختبار 2026-09-24 | k6 run جديد | ❓ Open |
| Supervisor crash recovery test | High | Not performed | Kill bot in prod | ❓ Open |
| Redis failure runtime test | High | Not performed | Stop Redis | ❓ Open |
| Restore drill | High | Not performed | psql from backup | ❓ Open |
| Telegram API rate limits | Medium | Need BotFather | Dashboard | ❓ Open |
| Full 88 routes verification | Low | count only | List each | 🟡 |
| All models full schema | Low | sample only | Full dump | 🟡 |
| Deadlock behavior (2-way) | High | Not tested | Concurrent test | ❓ Open |
| `.env` file permissions | Low | Not audited | `ls -la` on Render | ❓ Open |
| Sentry `traces_sample_rate=0.2` impact | Medium | Not analyzed | Sentry config review | ❓ Open |

---

# §22. Master Verification Matrix

| # | Component | Claim | Status | Evidence Type | Source | Date |
|---|---|---|---|---|---|---|
| 1 | Bot process | Running | ✅ | Render PID log | Live | 2026-10-04 |
| 1b | Health version vs commit | Ambiguity resolved | ✅ | curl + git log | Runtime + Git | 2026-10-04 |
| 2 | Backend | Healthy 200 | ✅ | curl health | Live | 2026-10-04 |
| 3 | DB | Connected | ✅ | health field | Live | 2026-10-04 |
| 4 | Redis | Connected | ✅ | health field | Live | 2026-10-04 |
| 5 | Bot heartbeat | age < 120s | ✅ | health field | Live | 2026-10-04 |
| 6 | 88 routes — count | Count only | 🟡 | flask url_map | Master Ref §17 | 2026-09-29 |
| 7 | 20 tables | Count | ✅ | Neon SQL | Manual | 2026-10-04 |
| 8 | 11 NUMERIC(14,4) fields | All | ✅ | Neon SQL | Manual | 2026-10-04 |
| 9 | 10 UNIQUE constraints | All | ✅ | Neon SQL | Manual | 2026-10-04 |
| 10 | `SECRET_KEY` ≥ 32 | True | ✅ | Runtime test | Session | 2026-10-03 |
| 11 | `JWT_SECRET_KEY` ≥ 32 | True | ✅ | Runtime test | Session | 2026-10-03 |
| 12 | `RuntimeError` on weak secret | True | ✅ | Runtime test | Session | 2026-10-03 |
| 13 | Order locks (P0) | Code present | 📖 | Code review | Session | 2026-10-03 |
| 14 | Balance lock works | Concurrency test | ✅ | 2 parallel calls | Session | 2026-10-03 |
| 15 | Rate limit 5 OK / 6 blocked | Admin login | ✅ | curl loop | Session | 2026-10-04 |
| 16 | CSS `safeCssUrl` deployed | True | ✅ | Vercel fetch | Session | 2026-10-04 |
| 17 | Health non-critical bot | True | ✅ | Runtime test | Session | 2026-10-04 |
| 18 | Backup workflow runs | True | ✅ | GitHub Actions | Session | 2026-10-04 |
| 19 | Backup decryption works | True | ✅ | Local openssl | Session | 2026-10-04 |
| 20 | Backup contains 20 tables + data | True | ✅ | grep on dump | Session | 2026-10-04 |
| 21 | Idempotency race fix | Code present | 🟡 | Code review | Session | 2026-10-04 |
| 22 | Supervisor crash recovery | — | ⚠️ | Not tested | — | — |
| 23 | Redis down behavior | — | ⚠️ | Not tested | — | — |
| 24 | Load test current version | — | ⚠️ | Not tested | — | — |
| 25 | Restore drill | — | ❓ | Not performed | — | — |
| 26 | Git history secrets | — | ❓ | Not scanned | — | — |
| 27 | 582 file contents | — | 🟡 | ~40/582 | — | — |
| 28 | ~300 commit diffs | — | 🟡 | ~10/300 | — | — |
| 29 | Sentry recent state | — | ❓ | Need dashboard | — | — |
| 30 | UptimeRobot current | — | ❓ | Need dashboard | — | — |
| 31 | `.env` in git history | — | ❓ | Not scanned | — | — |
| 32 | Commit SHA in health | `5bf031b` | ✅ | Runtime curl | Live | 2026-10-04 |
| 33 | Deadlock behavior 2-way | — | ⚠️ | Not tested | — | — |
| 34 | Deploy-time Conflict | Present + documented | 📖 | Render logs | Live | 2026-10-04 |

---

# §23. Self-Audit لهذه الوثيقة

## ما تم التحقق منه بالكامل (Runtime) ✅

- 20 جدول DB (Neon SQL).
- 11 NUMERIC(14,4) fields.
- 10 UNIQUE constraints.
- 4 NOT NULL sample.
- Bot running (PID, heartbeat).
- DB/Redis/Backend health.
- `SECRET_KEY` / `JWT_SECRET_KEY` hardening.
- `admin_adjust_balance` concurrency (P0).
- Admin login rate limit.
- CSS `safeCssUrl` deployment.
- Backup encryption + decryption + content.
- Health `commit` field (`5bf031b`).
- Deploy success (Render).

## ما كان Code Verified فقط 📖

- Bot functions (14).
- Admin routes (~55).
- User routes (~6).
- Auth routes (~4).
- MiniApp JS (~2900 lines).
- CSS files.
- Migrations.
- Services.
- Error handlers.
- Cache invalidation (registered, not runtime tested).
- Order/Deposit/KYC locks (code present, not stress-tested).

## ما لم يُختبر ⚠️

- Supervisor crash recovery.
- Redis down behavior.
- Idempotency race concurrency.
- Logout-all admin runtime.
- JWT revoke-all.
- 2-way deadlock behavior.
- Restore drill.

## ما بقي Unknown ❓

- Historical git secrets.
- Sentry event log.
- UptimeRobot current %.
- Telegram rate limits (BotFather).
- Load capacity current version.
- 505 ملف غير معروض.

## ما هو ناقص في هذه الوثيقة ❌

- Live data (user/order counts).
- Production DB size / growth.
- Cost analysis (Neon, Sentry, Upstash, Cloudinary).
- Full architecture diagram (rendered image).
- Pen test / bug bounty results.
- CI/CD beyond `backup.yml`.
- Full security headers per route.
- `.env.example`.
- README.
- Full ~300 commit diffs review.

## هل الوثيقة مكتملة؟

**لا.** هي **كاملة في حدود الأدلة المتوفرة**، لكن:

- ~15-18% من المحتوى لا يزال Unknown/Not Tested.
- العمق الحقيقي يحتاج: load test, dashboards, Git history scan, restore drill.

## التوصيات لسد الفجوات

1. Load test current version — 30 min.
2. Supervisor crash test — 30 min + maintenance.
3. Restore drill — 1h + isolated env.
4. Git history scan (`trufflehog`) — 30 min.
5. Sentry + UptimeRobot dashboard review — 15 min.
6. Full file content audit — 4h+.
7. Deadlock 2-way test — 30 min.

---

# 🎯 التسليمات

## التسليم 1 — الوثيقة الرئيسية

✅ ملف `docs/SANAD_PLUS_MASTER_REFERENCE_v18.4.15.md` (Blocks 1-4).

## التسليم 2 — Master Verification Matrix

✅ §22.

## التسليم 3 — قائمة المشاكل الحالية

✅ §19 (Critical/High/Medium/Low).

## التسليم 4 — خطة الإصلاح

**P2 Plan (لا تنفيذ الآن):**

| # | المهمة | الوقت | الأولوية |
|---|---|---|---|
| 1 | Load test current version | 1h | 🔴 |
| 2 | Supervisor crash test | 1h | 🔴 |
| 3 | Redis down test | 30m | 🔴 |
| 4 | Restore drill | 2h | 🔴 |
| 5 | Deadlock 2-way test | 30m | 🔴 |
| 6 | Git history secrets scan | 30m | 🟠 |
| 7 | Sentry + UptimeRobot review | 30m | 🟠 |
| 8 | Conflict suppression in error_handler (H3) | 15m | 🟠 |
| 9 | Full 88 routes verification | 2h | 🟡 |
| 10 | Repository cleanup (patch/fix/phase files) | 1h | 🟡 |
| 11 | `.env.example` + README | 30m | 🟢 |

## التسليم 5 — Documentation Gaps

✅ §21.

## التسليم 6 — Self-Audit Report

✅ §23.

---

# ✅ إقرار المطوّر

**أُقرّ أن:**

1. **كل معلومة** تحمل مصدرًا ودرجة تحقق.
2. **الفجوات** معلنة بصراحة، غير مخفية.
3. **الأرقام** مبنية على قياسات runtime أو مصادر مؤكدة.
4. **لا تخمين** في الأقسام الحساسة — تميّز `Code Verified` عن `Runtime Verified`.
5. **الوثيقة** توفر نقطة بداية واضحة لمطوّر جديد.
6. **لا تدّعي اكتمالاً** — تعرف حدودها (§23).
7. **إقرار بانحرافات منهجية:** اختيار `rebuild` بدل `patch` (بسبب غياب ملف v18.4.14 على القرص). تم توثيقه.
8. **إقرار بتصحيحات Runtime:**
   - §8.5 — v18.4.21 leak → commit SHA.
   - §13.3 — "canonical lock order" → تأويل، ليس مقروءًا من مصدر.
   - §16.3 — v18.4.21 leak → commit SHA.
   - §18 #24 — 📖 → 🟡 (Not Runtime Tested).

**التوقيع:** مطوّر المشروع.
**التاريخ:** 2026-10-04.
**Version anchor:** `v18.4.14`.
**HEAD:** `5bf031b`.

---

**🛡️ SANAD PLUS⁺ — Documentation is Ownership.**