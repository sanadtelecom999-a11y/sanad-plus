# 📋 SANAD PLUS⁺ — CHANGELOG v18.4.11

**التاريخ:** 28 سبتمبر 2026
**Commits:** `b0bd995`, `67ff7b2`
**الحالة:** ✅ Production Live

---

## 🔴 Critical Fixes

### 1. Notify Admins DoS Protection
- **الملف:** `bot/bot.py` (~السطر 381-420)
- **المشكلة:** `notify_admins_sync` كان يُستدعى بلا حد عند كل خطأ → إغراق قناة الأدمن
- **الحل:** `_should_notify_error` — نافذة 5 دقائق، حد 3 إشعارات لكل نوع خطأ
- **الاختبار:** `test_error_throttle.py` → 4/4 نجحت
- **الأثر:** 20 خطأ متطابق → 4 إشعارات (بدل 20)

### 2. ADMIN_IDS Parse Bug (NameError)
- **الملف:** `bot/bot.py` (~السطر 58)
- **المشكلة:** `logger.warning` داخل حلقة parse IDs قبل تعريف `logger` → NameError
- **الحل:** استبدال بـ `print()` (مؤقتاً — يُحسَّن في v18.4.12 بنقل logger للأعلى)

---

## 🟢 Version Sync

| الموضع | القديم | الجديد |
|--------|--------|--------|
| `bot/bot.py:85` (BOT_VERSION) | v18.4.10.1 | **v18.4.11** |
| `settings_public.py:67` (health) | v18.4.9 | **v18.4.11** |

---

## 🛡️ Infrastructure Facts (موثَّقة)

### UptimeRobot مُفعَّل
- يستعلم `/api/health` كل ~60 ثانية
- يوفّر طبقة حماية خارجية ضد Supervisor crash
- ⚠️ **TODO:** ربطه بـ Render Deploy Hook للاسترداد التلقائي

### Redis Heartbeat
- يُكتب كل 60s من `heartbeat_loop()`
- TTL 90s — يُقرأ من `/api/health`
- `age_seconds < 120` = البوت حي

---

## 📊 Verification
