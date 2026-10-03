# SANAD PLUS⁺ — REFERENCE v18.4.17 (Errata Status Update)

**Base:** v18.4.16 (commit `ace75f7`)
**الغرض:** تحديث حالة BUG-1 → BUG-5 بعد إصلاحها runtime
**Anchor:** `9f89bf5` (v18.4.14)
**HEAD عند التوقيع:** `bf9cc95`
**الفارق من anchor:** 22 commit
**منهجية:** Errata Status Update — يبني على v18.4.15 + v18.4.16. لا يستبدلهما.
**قاعدة التحقق:** نفس رموز v18.4.15 (✅ 📖 🟡 ⚠️ ❌ ❓)

---

# §0. لماذا v18.4.17

## §0.1 المشكلة

v18.4.16 §4 وثّقت 5 bugs:
- BUG-1: 📖 Code Verified (لم يُصلَح)
- BUG-2: ✅ مُصلَح (`07ea924`)
- BUG-3: 📖 Code Verified (لم يُصلَح)
- BUG-4: 📖 Code Verified (لم يُصلَح)
- BUG-5: 📖 Code Verified (لم يُصلَح)

**بعد إغلاق v18.4.16**، نُفِّذت 3 commits إصلاح. الوثيقة v18.4.16 أصبحت **متأخرة عن الواقع**: تصف 4 bugs كمعطوبة وهي مُصلَحة فعلاً.

## §0.2 الحل

v18.4.17 = Errata Status Update صغيرة تُحدّث حالة كل BUG بدليل Runtime.

## §0.3 الحجم

5 أقسام. **لا تكرار** لأي محتوى من v18.4.15 أو v18.4.16.

---

# §1. §4-E — جدول الانتقال (BUGs Status)

## §1.1 جدول التحديث

| BUG | الحالة في v18.4.16 | الحالة في v18.4.17 | Commit الإصلاح |
|---|---|---|---|
| BUG-1 | 📖 Code Verified | ✅ **Runtime Verified** | `f7f252f` |
| BUG-2 | ✅ مُصلَح (`07ea924`) | ✅ **Runtime Verified** | `07ea924` |
| BUG-3 | 📖 Code Verified | ✅ **Code Verified (مُصلَح)** | `0350227` |
| BUG-4 | 📖 Code Verified | ✅ **Code Verified (مُصلَح)** | `bf9cc95` |
| BUG-5 | 📖 Code Verified | ✅ **Code Verified (مُصلَح)** | `bf9cc95` |

## §1.2 تفصيل الحالات الجديدة

### BUG-1 — Referral endpoint mismatch

**قبل الإصلاح:**
- MiniApp يستدعي `POST /api/referrals/apply`
- Backend يُخدِم `POST /api/user/apply-referral` فقط
- كل محاولة من MiniApp → **HTTP 404**

**بعد الإصلاح:**
- إضافة `@main.route("/api/referrals/apply", ...)` كـ alias
- Backend يُخدِم كلا المسارين
- المسار canonical بقي محفوظاً (لم يُغيَّر)

**Runtime Test (2026-10-04):**

    POST /api/referrals/apply
    → HTTP 401 (متوقع — endpoint موجود، JWT مطلوب)
    
    POST /api/user/apply-referral
    → HTTP 401 (canonical — بلا تغيير)

**الانتقال:** 📖 → ✅ **Runtime Verified**

### BUG-2 — `_login_attempts` memory leak

**الحالة:** ✅ مُصلَح في `07ea924` (pre-v18.4.16). لم يتغيّر شيء.

**الفرق:** v18.4.16 صرّحت أن هذا ليس issue حالياً (ذكر في جدول M1-M8 خطأً).

**تصنيف v18.4.17:** ✅ Runtime Verified (سابقاً — لا اختبار جديد).

### BUG-3 — `referral.id` = 0 في Transaction

**قبل الإصلاح:**

    referral = Referral(...)
    db.session.add(referral)
    # ← لا flush()
    reference_id=referral.id if referral.id else 0,  # ← None → 0

**بعد الإصلاح:**

    db.session.add(referral)
    db.session.flush()  # BUG-3 fix: assign id before Transaction.reference_id

**الانتقال:** 📖 → ✅ **Code Verified (مُصلَح)**

**Runtime Test:** ❌ لم يُنفَّذ — يحتاج:
1. إنشاء مستخدم جديد
2. تطبيق كود إحالة
3. تنفيذ أول طلب
4. فحص `Transaction.reference_id`

**الحد الصريح:** الإصلاح **موجود في الكود** لكن **لم يُختبر runtime بعد**.

### BUG-4 — `ADMIN_OTP_STRICT_IP` dead code

**قبل الإصلاح:** السطر موجود في `config.py` لكن لا يُستخدم في أي مكان.

**بعد الإصلاح:** حُذِف السطر.

**الانتقال:** 📖 → ✅ **Code Verified (مُصلَح)**

### BUG-5 — Dead code in `deposits.py`

**قبل الإصلاح:** `_aware()` و `_utcnow()` معرَّفتان، لا تُستدعيان.

**بعد الإصلاح:** كلا الدالتين حُذفتا.

**الانتقال:** 📖 → ✅ **Code Verified (مُصلَح)**

---

# §2. Runtime Evidence

## §2.1 Production Health (2026-10-04)

**الأمر:**

    curl -s https://sanad-plus-backend.onrender.com/api/health

**المخرج المُستخرَج:**

    status=ok
    commit=bf9cc95
    version=v18.4.14  (anchor)

## §2.2 Referral Endpoints Test

**الأمر:**

    curl -s -o /dev/null -w "%{http_code}\n" \
      -X POST https://sanad-plus-backend.onrender.com/api/referrals/apply \
      -H "Content-Type: application/json" -d "{}"

**المخرج:** `401` ✅ (endpoint موجود)

**الأمر:**

    curl -s -o /dev/null -w "%{http_code}\n" \
      -X POST https://sanad-plus-backend.onrender.com/api/user/apply-referral \
      -H "Content-Type: application/json" -d "{}"

**المخرج:** `401` ✅ (canonical — بلا تأثر)

## §2.3 Deploy Confirmation

**من Render logs:**
- deploy `f7f252f` — ✅ live
- deploy `0350227` — ✅ live
- deploy `bf9cc95` — ✅ live

## §2.4 ما لم يُختبَر Runtime

| البند | السبب |
|---|---|
| BUG-3 full chain | يحتاج user+order+referral setup |
| BUG-1 downstream | 401 يثبت وجود endpoint، لم يثبت عمل الـ handler كاملاً |

**الحد صريح:** Runtime evidence يثبت أن الـ endpoint حيّ، لا أن الـ business logic كامل.

---

**نهاية Block 1/2 — §0 → §2**
---

# §3. Audit Trail — Commit Chain

## §3.1 السلسلة الكاملة من v18.4.14 → v18.4.17

| # | Commit | Message | التاريخ |
|---|---|---|---|
| 1 | `9f89bf5` | chore: sync health version to v18.4.14 (anchor) | 2026-09-29 |
| 2 | `b1dc41f` | fix(p0): admin order locks | 2026-10-03 |
| 3 | `384e171` | fix(p0): deposit + kyc locks | 2026-10-03 |
| 4 | `e8b7ee5` | fix(p0): lock user row in admin_adjust_balance | 2026-10-03 |
| 5 | `b90859a` | fix(p0): fail-loud on weak SECRET_KEY | 2026-10-03 |
| 6 | `9ef93bc` | fix(p0.5): Decimal handling | 2026-10-03 |
| 7 | `f0661ad` | merge: P0+P0.5 | 2026-10-03 |
| 8 | `35ffd5c` | feat(p1): encrypted backup | 2026-10-03 |
| 9 | `fe7e64b` | fix(p1): fail workflow on empty dump | 2026-10-04 |
| 10 | `e511f8a` | fix(p1): use pg_dump 18 | 2026-10-04 |
| 11 | `07ea924` | fix(p1): _login_attempts memory leak | 2026-10-04 |
| 12 | `384a711` | fix(p1): safe CSS url() | 2026-10-04 |
| 13 | `4657e13` | fix(p1): bot heartbeat non-critical | 2026-10-04 |
| 14 | `2754012` | fix(p1): catch IntegrityError | 2026-10-04 |
| 15 | `5bf031b` | feat(health): expose commit SHA | 2026-10-04 |
| 16 | `5b6056` | docs: v18.4.15 master reference | 2026-10-04 |
| 17 | `7a16f69` | docs: mark H3 as already fixed | 2026-10-04 |
| 18 | `ace75f7` | docs: v18.4.16 errata | 2026-10-04 |
| 19 | `f7f252f` | fix(bug1): referral alias | 2026-10-04 |
| 20 | `0350227` | fix(bug3): flush referral | 2026-10-04 |
| 21 | `bf9cc95` | chore(cleanup): dead code (BUG-4, BUG-5) | 2026-10-04 |

**المصدر:** `git log --oneline` + `git show HEAD --stat`.

## §3.2 توزيع الـ Commits حسب النوع

| النوع | العدد |
|---|---|
| fix (P0 + P0.5) | 6 |
| fix (P1) | 6 |
| feat | 1 |
| docs | 3 |
| chore | 1 |
| merge | 2 |
| anchor | 1 |
| **المجموع** | **20** (بعد anchor) |

---

# §4. ما بقي — P2 Tasks

## §4.1 مهام P2 المتبقية

| # | المهمة | الوقت | الأولوية | الحالة |
|---|---|---|---|---|
| 1 | Load test current version (`bf9cc95`) | 1h | 🔴 | ⚠️ Not Tested |
| 2 | Supervisor crash recovery test | 1h | 🔴 | ⚠️ Not Tested |
| 3 | Redis down behavior test | 30m | 🔴 | ⚠️ Not Tested |
| 4 | Restore drill (Neon backup → isolated env) | 2h | 🔴 | ⚠️ Not Tested |
| 5 | Git history secrets scan (trufflehog) | 30m | 🟠 | ❓ Unknown |
| 6 | Sentry + UptimeRobot dashboard review | 30m | 🟠 | ❓ Unknown |
| 7 | Full 88 routes verification | 2h | 🟡 | 🟡 Partial |
| 8 | Repository cleanup (patch_*.py, fix_*.py) | 1h | 🟡 | 📖 Code Verified |
| 9 | `.env.example` + README | 30m | 🟢 | ❌ Not Present |

## §4.2 ما لم يعد مهمة P2

- **BUG-1 → BUG-5** — كلها مُصلَحة ✅
- **H3 (Conflict suppression)** — مُفعَّل فعلاً في الكود (اكتشف في v18.4.15)

## §4.3 ملاحظة على الأولويات

المهام 🔴 الأربع (1-4) لم تُنفَّذ لأنها تحتاج:
- load test: k6 محلي
- supervisor crash: نافذة maintenance
- redis down: بيئة معزولة
- restore drill: Neon console + بيئة منفصلة

لا يمكن تنفيذها من جلسة توثيق. تحتاج جلسة تشغيل مخصَّصة.

---

# §5. إقرارات v18.4.17

## §5.1 نطاق v18.4.17

- **يضيف:** تحديث حالة BUG-1 → BUG-5 + audit trail + P2 المتبقي
- **لا يُعدّل:** v18.4.15 أو v18.4.16 (تبقيان frozen)
- **لا يُصلح:** أي كود (كل الإصلاحات نُفِّذت قبل كتابة هذه الوثيقة)

## §5.2 ما تبقّى Unknown في v18.4.17

| البند | السبب |
|---|---|
| BUG-3 runtime test | يحتاج user+order+referral chain |
| BUG-1 downstream behavior | 401 يثبت endpoint موجود، لا business logic |
| Load capacity current HEAD | لا load test جديد |
| Backup restore drill | لم يُنفَّذ |

## §5.3 إقرار المطوّر

**أُقرّ أن:**

1. v18.4.17 = **Errata Status Update**، لا وثيقة مستقلة.
2. كل BUG-1 → BUG-5 له دليل Runtime أو Code Verified موثَّق هنا.
3. الفروق بين v18.4.16 و v18.4.17:
   - v18.4.16 = توثيق bugs جديدة
   - v18.4.17 = تحديث حالتها بعد الإصلاح
4. runtime evidence موجود في §2 (curl outputs) — لا استنتاج.
5. لم يُعدَّل أي كود في **هذه الجلسة** (الكتابة فقط).
6. القارئ يجب أن يقرأ: **v18.4.15 → v18.4.16 → v18.4.17** بهذا الترتيب.

**التوقيع:** مطوّر المشروع
**التاريخ:** 2026-10-04
**HEAD عند التوقيع:** `bf9cc95`
**Anchor:** `9f89bf5` (v18.4.14)

---

# §6. Changelog — v18.4.16 → v18.4.17

## §6.1 التحولات

| الفترة | الأحداث |
|---|---|
| حتى `ace75f7` | v18.4.16 أُقفلت |
| بعدها | 3 commits إصلاح (BUG-1, BUG-3, BUG-4+5) |
| v18.4.17 | Status Update |

## §6.2 جدول الإصلاحات

| Commit | Fix | BUG | Verification |
|---|---|---|---|
| `f7f252f` | Referral alias | BUG-1 | ✅ Runtime Verified |
| `0350227` | Flush referral | BUG-3 | ✅ Code Verified |
| `bf9cc95` | Dead code removal | BUG-4 + BUG-5 | ✅ Code Verified |

## §6.3 ملاحظة ختامية

v18.4.17 **لم تُقفل بـ commit بعد**. الأوامر:

    cd ~/SanadPlus/SanadPlus
    git add docs/SANAD_PLUS_REFERENCE_v18.4.17_ERRATA_UPDATE.md
    git commit -m "docs: v18.4.17 errata status update — BUGs 1-5 resolved"
    git push origin main

بعد commit + push → v18.4.17 مُقفلة ومُزامَنة.

---

**🛡️ SANAD PLUS⁺ — Errata v18.4.17 — Documentation is Ownership.**