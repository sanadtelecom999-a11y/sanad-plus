# SANAD PLUS⁺ — REFERENCE v18.4.16 (Errata)

**Base:** v18.4.15 (commit `5b6056` + `7a16f69`)
**الغرض:** تصحيح فجوات حقيقية اكتُشفت بعد إغلاق v18.4.15
**Anchor:** `9f89bf5` (v18.4.14)
**HEAD الفعلي:** `7a16f69`
**الفارق من anchor:** 19 commit
**منهجية:** هذا الملف **Errata** يبني على v18.4.15 — لا يستبدلها.
**قاعدة التحقق:** نفس رموز v18.4.15 (✅ 📖 🟡 ⚠️ ❌ ❓)

---

# §0. لماذا Errata بدل Rebuild

## §0.1 المشكلة

v18.4.15 أُقفلت بـ commitين:
- `5b6056` — docs: SANAD PLUS master reference v18.4.15
- `7a16f69` — docs: mark H3 as already fixed

استبدالها بوثيقة كاملة جديدة = فقدان مرجع SHA واحد واضح. القارئ لن يعرف "ما هو v18.4.15 الحقيقي".

## §0.2 الحل المُتبنّى

- v18.4.15 تبقى frozen = سجل تاريخي (SHA واحد)
- v18.4.16 = Errata مُصغَّرة تبني عليها
- كل قسم هنا مبني على مرجع صريح (commit SHA أو runtime evidence)
- القارئ يقرأ v18.4.15 ثم v18.4.16 → الصورة كاملة

## §0.3 الحجم

7 أقسام Errata بدل 23. **لا تكرار** لـ §6-§12، §14-§18 من v18.4.15.

---

# §1. ملخص تصحيحات v18.4.16

| # | القسم الأصلي | نوع التصحيح | الخطورة | المصدر |
|---|---|---|---|---|
| E-1 | §4.0 | تصنيف طبقات المصدر الزمنية | 🔴 Critical | git log |
| E-2 | §13.3 | تأكيد P0 locks عبر 3 commits | 🔴 Critical | git log |
| E-3 | §19 (جديد) | إضافة BUG-1 (referral 404) | 🔴 Critical | code vs docs |
| E-4 | §19 (جديد) | إضافة BUG-2 (_login_attempts leak) | 🟠 High (مُصلح) | HEAD review |
| E-5 | §19 (جديد) | إضافة BUG-3 (referral.id=0) | 🟡 Medium | code review |
| E-6 | §19 (جديد) | إضافة BUG-4 (ADMIN_OTP_STRICT_IP dead) | 🟢 Low | code review |
| E-7 | §19 (جديد) | إضافة BUG-5 (deposits dead code) | 🟢 Low | code review |
---

# §2. §4-E — تصنيف طبقات المصدر الزمنية

## §2.1 المشكلة المُكتشفة

الوثيقة v18.4.15 §4 أدرجت 77 ملفاً من `FULL_SOURCE.md`، وذكرت تحديثات P0/P1 على `admin.py`. **لكن `FULL_SOURCE.md` أُنشِئ قبل P0**.

الدليل من git log:

    f257fff  docs: add full source dump for reference
    db7bf6e  chore: remove FULL_SOURCE.md from git tracking
    b1dc41f  fix(p0): admin order locks  ← P0 يبدأ بعد f257fff

**النتيجة:** `FULL_SOURCE.md` = snapshot من `f257fff`. أي أن admin.py المُرسَل في v18.4.15 كان **قبل** P0 locks.

## §2.2 التصنيف الصحيح — 3 طبقات

| الطبقة | المدى | المصدر | حالة الملفات |
|---|---|---|---|
| **Pre-P0** | `f257fff` | FULL_SOURCE.md dump | snapshot ثابت |
| **P0 → P1** | `b1dc41f` → `2754012` | commits فقط | diff-only |
| **Post-P1** | `5bf031b` → `7a16f69` | ملفات مباشرة | HEAD |

## §2.3 القاعدة المُتبنّاة

| الحالة | العلامة |
|---|---|
| ملف ذُكر في §4 (من FULL_SOURCE.md) | 📖 Pre-P0 snapshot |
| تعديل ذُكر في commit message فقط | 🟡 diff-only (بدون رؤية الكود الكامل) |
| ملف قُرِئ من القرص بعد `5bf031b` | ✅ HEAD |
| ملف قُرِئ من القرص قبل `5bf031b` | 🟡 Partial HEAD |

## §2.4 الجدول المُصحَّح — ملفات حرجة

| الملف | الطبقة | ملاحظة |
|---|---|---|
| `admin.py` | ✅ HEAD (مع P0/P1) | commit `b1dc41f`, `384e171`, `e8b7ee5`, `07ea924` مطبَّقة |
| `settings_public.py` | ✅ HEAD | يحتوي bot non-critical + `commit` field |
| `bot.py` | ✅ HEAD | v18.4.14 + emergency flush |
| `base.py` | ✅ HEAD | يحتوي `Deposit.fee_type` + `PaymentMethod.fee_type` |
| `orders.py` | ✅ HEAD | idempotency race fix (`2754012`) |
| `deposits.py` | ✅ HEAD | idempotency race fix (`2754012`) |
| `config.py` | ✅ HEAD | RuntimeError على weak secrets (`b90859a`) |
| `FULL_SOURCE.md` | 🔴 مُزَال | removed in `db7bf6e` |

## §2.5 ما يجب على قارئ v18.4.15 فِعله

عند قراءة §4 من v18.4.15:
- الجدول صحيح **كرقم** (77 ملف)
- بعض أعمدة "مُحدَّث" تشير لتعديلات لم تكن في snapshot
- للحصول على حالة HEAD الفعلية → §2.4 من v18.4.16

---

# §3. §13-E — P0 Locks: الحالة الفعلية في HEAD

## §3.1 الملخص

| العملية | Commit | HEAD يحتوي؟ | Runtime Test |
|---|---|---|---|
| Order update status | `b1dc41f` | ✅ | 📖 Code Verified |
| Order bulk status | `b1dc41f` | ✅ | 📖 Code Verified |
| Deposit approve | `384e171` | ✅ | 📖 Code Verified |
| Deposit reject | `384e171` | ✅ | 📖 Code Verified |
| KYC approve | `384e171` | ✅ | 📖 Code Verified |
| KYC reject | `384e171` | ✅ | 📖 Code Verified |
| Balance adjust | `e8b7ee5` | ✅ | ✅ Runtime Verified |

## §3.2 تفصيل — `admin_update_order_status` (commit b1dc41f)

الكود في HEAD يُظهر:

    order = Order.query.filter_by(id=order_id).with_for_update().first()
    if order.status in ["completed", "failed", "cancelled"]:
        return jsonify(...), 400
    ...
    user = User.query.filter_by(id=order.user_id).with_for_update().first()
    product = Product.query.filter_by(id=order.product_id).with_for_update().first()

**قفل ثلاثي بالترتيب الصحيح:** `order → user → product`.
**Re-check بعد القفل:** نعم.

## §3.3 تفصيل — `admin_approve_deposit` (commit 384e171)

    deposit = Deposit.query.filter_by(id=deposit_id).with_for_update().first()
    if deposit.status != "pending":
        return jsonify({"error": "تمت معالجته مسبقاً"}), 400
    ...
    user = User.query.filter_by(id=deposit.user_id).with_for_update().first()

**قفل ثنائي:** `deposit → user`.
**Re-check بعد القفل:** نعم.

## §3.4 تفصيل — `admin_adjust_balance` (commit e8b7ee5)

    user = User.query.filter_by(id=user_id).with_for_update().first()
    balance_before = user.balance
    user.balance = round(user.balance + amount, 2)

**قفل مفرد:** `user`.
**Runtime Verified:** 2026-10-03 (طلبين متوازنين، A=499.01, B=499.02).

## §3.5 ملاحظة منهجية

v18.4.15 §13.3 كانت دقيقة — الأقفال موجودة فعلاً في HEAD. لكن **admin.py في FULL_SOURCE.md** كان snapshot pre-P0. لذلك من قرأ §4 + §13 قد يعتقد تناقضاً، وهو ليس كذلك.

---

**نهاية Block 1b — §2 → §3**
---

# §4. §19-E — Bugs إضافية مُكتشفة

## §4.1 BUG-1: Referral endpoint mismatch — 404 حتمي

### الوصف

MiniApp يستدعي endpoint غير موجود في Backend. كل محاولة لتطبيق كود إحالة من داخل MiniApp تفشل بـ 404.

### الأدلة

**Backend** (`referrals.py`):

    @main.route("/api/user/apply-referral", methods=["POST"])
    def apply_referral():
        ...

**MiniApp** (`miniapp/js/api.js`):

    async function applyReferralCode(code) {
        return apiFetch(`${API_BASE_URL}/api/referrals/apply`, {
            method: 'POST',
            body: JSON.stringify({ code }),
            __noRetry: true,
        });
    }

**API Contract** (`docs/06-api-contract.md`) يُوثّق:
- POST | `/api/referrals/apply` | User

الوثيقة تُوثّق المسار الذي يستدعيه MiniApp، لا المسار الذي يُخدِمه Backend.

### الأثر

- كل مستخدم يحاول تطبيق كود إحالة → **HTTP 404**
- الميزة معطلة بالكامل من طرف MiniApp

### الحالة

| البُعد | القيمة |
|---|---|
| Verification | 📖 Code Verified |
| Runtime Test | ❌ لم يُختبر |
| الخطورة | 🔴 Critical |
| الحل المُقترح | توحيد المسار في أحد الطرفين |

### قرار موصى به

- **(أ)** إصلاح `api.js` ليستدعي `/api/user/apply-referral` → سطر واحد
- **(ب)** إضافة alias في `referrals.py` يُخدِم كلا المسارين → سطران

**توصية:** (أ) — لأن المسار الأصلي في Backend هو "الحقيقي"، والوثيقة أُخطأت.

**لا يُنفَّذ الآن.**

---

## §4.2 BUG-2: `_login_attempts` memory leak — أُصلح في `07ea924`

### الوصف

النموذج الأصلي (pre-fix):

    _login_attempts = defaultdict(list)

    def check_login_rate_limit(ip: str) -> bool:
        now = time.time()
        _login_attempts[ip] = [
            t for t in _login_attempts[ip]
            if now - t < LOGIN_RATE_WINDOW
        ]
        if not _login_attempts[ip]:
            _login_attempts.pop(ip, None)      # ← يحذف
            _login_attempts[ip] = []           # ← يُعيدها فوراً
        ...

### المشكلة

`defaultdict(list)` + `_login_attempts[ip] = []` بعد الحذف = القاموس ينمو **لكل IP يحاول login**. لا حدود أعلى.

### الأثر

- نمو ذاكرة غير محدود في Gunicorn worker
- DoS بطيء عبر IPs موزعة

### الحالة في HEAD

commit `07ea924` أصلح:
- `_login_attempts = {}` (dict عادي)
- `LOGIN_RATE_MAX_KEYS = 10_000`
- LRU eviction 25% عند التجاوز

| البُعد | القيمة |
|---|---|
| الخطورة (كانت) | 🟠 High |
| الحالة الآن | ✅ مُصلح (`07ea924`) |
| Runtime Test | 📖 Code Verified |

**الغرض من الإدراج:** v18.4.15 §19 ذكرته ضمن `M1-M8` **خطأً** — هو ليس issue حالياً.

---

## §4.3 BUG-3: `referral.id` = 0 في Transaction

### الوصف

في `orders.py::_process_referral_inline`:

    referral = Referral(...)
    db.session.add(referral)
    # ← لا flush()

    db.session.add(Transaction(
        ...
        reference_id=referral.id if referral.id else 0,  # ← None → 0
    ))

### المشكلة

- `Referral` جديد → `referral.id` = `None` حتى `flush()`
- `None if None else 0` → `0`
- `Transaction.reference_id` يُسجَّل دائماً `0`
- الربط بين `Transaction` و `Referral` **معطوب**

### الأثر

- تقرير مالي يُظهر حركات إحالة بـ `reference_id=0`
- لا يمكن ربط الحركة بسجل الإحالة
- Audit trail ناقص

### الحالة

| البُعد | القيمة |
|---|---|
| Verification | 📖 Code Verified |
| Runtime Test | ❌ لم يُختبر |
| الخطورة | 🟡 Medium |
| الحل المُقترح | `db.session.flush()` بعد `add(referral)` |

---

## §4.4 BUG-4: `ADMIN_OTP_STRICT_IP` — كود ميت

في `config.py`:

    ADMIN_OTP_STRICT_IP = os.getenv("ADMIN_OTP_STRICT_IP", "false").lower() == "true"

في `admin.py`: **لا استخدام** لهذا المتغير.

| البُعد | القيمة |
|---|---|
| Verification | 📖 Code Verified |
| الخطورة | 🟢 Low |
| الحل المُقترح | حذف أو تفعيل |

---

## §4.5 BUG-5: كود ميت في `deposits.py`

دالتان لا تُستدعيان:

    def _aware(dt): ...
    def _utcnow(): ...

| البُعد | القيمة |
|---|---|
| Verification | 📖 Code Verified |
| الخطورة | 🟢 Low |
| الحل المُقترح | حذف |

---

## §4.6 جدول ملخص BUG-1 → BUG-5

| # | المشكلة | الحالة | الخطورة | متى تُصلح |
|---|---|---|---|---|
| BUG-1 | Referral endpoint 404 | 📖 Code Verified | 🔴 Critical | جلسة منفصلة |
| BUG-2 | `_login_attempts` leak | ✅ مُصلح `07ea924` | 🟠 High (سابقاً) | — |
| BUG-3 | `referral.id` = 0 | 📖 Code Verified | 🟡 Medium | P2 |
| BUG-4 | `ADMIN_OTP_STRICT_IP` dead | 📖 Code Verified | 🟢 Low | P3 |
| BUG-5 | dead code in deposits | 📖 Code Verified | 🟢 Low | P3 |

---

# §5. §22-E — مصفوفة تحقق مُحدَّثة

## §5.1 إضافات إلى §22 من v18.4.15

| # | Component | Claim | Status | Evidence | Source | Date |
|---|---|---|---|---|---|---|
| 35 | Referral endpoint (MiniApp) | Mismatch → 404 | 📖 | API vs route | code review | 2026-10-04 |
| 36 | Referral endpoint (Backend) | Serves `/api/user/apply-referral` | 📖 | `referrals.py` | code review | 2026-10-04 |
| 37 | `_login_attempts` leak | Fixed in `07ea924` | ✅ | git log | runtime session | 2026-10-04 |
| 38 | P0 locks in HEAD | All 3 commits present | ✅ | git log | runtime session | 2026-10-04 |
| 39 | `settings_public.py` commit field | In HEAD | ✅ | git show | runtime session | 2026-10-04 |
| 40 | `base.py` fee_type | In HEAD | ✅ | code review | 2026-10-04 |
| 41 | FULL_SOURCE.md source layer | Pre-P0 snapshot | ✅ | git log | runtime session | 2026-10-04 |
| 42 | `referral.id` in Transaction | Recorded as 0 | 📖 | code review | 2026-10-04 |
| 43 | `ADMIN_OTP_STRICT_IP` usage | Unused | 📖 | grep | 2026-10-04 |
| 44 | dead code in deposits | `_aware`, `_utcnow` | 📖 | code review | 2026-10-04 |

## §5.2 تصحيحات على §22 v18.4.15

| البند الأصلي | التصحيح |
|---|---|
| §22 #13 "Order locks (P0) — 📖" | ✅ بعد git log، مؤكد في HEAD |
| §22 #21 "Idempotency race fix — 🟡" | يبقى 🟡 (لم يُختبر runtime) |

---

# §6. §23-E — إقرارات v18.4.16

## §6.1 نطاق v18.4.16

- **يضيف:** 5 bugs، مصفوفة، تصنيف طبقات، تصحيحات
- **لا يُعدّل:** v18.4.15 (تبقى frozen)
- **لا يُصلح:** أي كود

## §6.2 ما اكتُشف ولم يكن في v18.4.15

- طبقات المصدر الزمنية (FULL_SOURCE.md = pre-P0)
- BUG-1 → BUG-5
- تأكيد P0 locks في HEAD (كان 📖 في v18.4.15، ✅ هنا)
- توثيق أن referral endpoint مختلط

## §6.3 ما بقي Unknown

- Runtime test لـ BUG-1 (يحتاج MiniApp فتح فعلي)
- إصلاح BUG-1 (يحتاج قرار + جلسة)
- هل BUG-3 موجود في بيانات production فعلية؟

## §6.4 إقرار المطوّر

**أُقرّ أن:**

1. v18.4.16 لا تدّعي اكتمالاً. هو **Errata** فقط.
2. كل ادعاء مبني على:
   - git log (`git show HEAD --stat`, `git log --oneline -20`)
   - قراءة كود مباشرة
   - لا استنتاج في أقسام حساسة
3. v18.4.15 تبقى المرجع الأساسي. v18.4.16 = طبقة تصحيح.
4. القارئ يجب أن يقرأ **v18.4.15 → v18.4.16** بهذا الترتيب.
5. لم يُعدَّل أي كود في هذه الجلسة.

**التوقيع:** مطوّر المشروع
**التاريخ:** 2026-10-04
**HEAD عند التوقيع:** `7a16f69`
**Anchor:** `9f89bf5` (v18.4.14)

---

# §7. Changelog — v18.4.15 → v18.4.16

## §7.1 التحولات

| الفترة | الأحداث |
|---|---|
| حتى `7a16f69` | v18.4.15 أُقفلت |
| بعد المراجعة | 5 bugs + drift كُشِف |
| v18.4.16 | التوثيق التصحيحي |

## §7.2 الجدول التفصيلي

| Commit | Message | ما كشفته |
|---|---|---|
| `5b6056` | docs: SANAD PLUS master reference v18.4.15 | الوثيقة الأساسية |
| `7a16f69` | docs: mark H3 as already fixed | إغلاق H3 |
| (جلسة) | git log + code review | 5 bugs + drift |

## §7.3 ما بعد v18.4.16

| # | المهمة | الوقت | الأولوية |
|---|---|---|---|
| 1 | BUG-1 — قرار + إصلاح referral endpoint | 15-30m | 🔴 |
| 2 | BUG-3 — إضافة `flush()` في `_process_referral_inline` | 10m | 🟡 |
| 3 | BUG-4, BUG-5 — إزالة كود ميت | 15m | 🟢 |
| 4 | Load test current version | 1h | 🔴 |
| 5 | Restore drill | 2h | 🔴 |
| 6 | Git history secrets scan | 30m | 🟠 |
| 7 | Sentry + UptimeRobot review | 30m | 🟠 |

**التسلسل المُقترح:** 1 → 2 → 3 → (اختياري) 4-7 في جلسات منفصلة.

## §7.4 ملاحظة أخيرة

v18.4.16 **لم تُقفل بـ commit بعد**. الأوامر:

    cd ~/SanadPlus/SanadPlus
    git add docs/SANAD_PLUS_REFERENCE_v18.4.16_ERRATA.md
    git commit -m "docs: v18.4.16 errata — 5 bugs + source layer classification"
    git log -1 --oneline

**بعد commit → v18.4.16 مُقفلة.**

---

**🛡️ SANAD PLUS⁺ — Errata v18.4.16 — Documentation is Ownership.**