# LAUNCH_CHECKLIST.md — SANAD PLUS+

**التاريخ:** 2026-10-17
**الهدف:** إطلاق مُقيَّد لـ 10 مستخدمين
**الوقت:** ~45 دقيقة

---

## Pre-Launch: 3 إجراءات حرجة

### [ ] 1. CORS Verification (2 دقيقة)

**الأمر:**

    curl -s -D - -H "Origin: https://sanad-plus.vercel.app" \
      https://sanad-plus-backend.onrender.com/api/health -o /dev/null \
      | grep -i "access-control"

**المتوقع:** `access-control-allow-origin: https://sanad-plus.vercel.app`

**النتيجة:** ☐ PASS  ☐ FAIL

---

### [ ] 2. Money Flow Test (30 دقيقة)

افتح MiniApp من Telegram، وافعل:

**Scenario A: Login**
- [ ] /start يعمل
- [ ] MiniApp يفتح
- [ ] تسجيل دخول ناجح
- [ ] الرصيد يظهر

**Scenario B: Order**
- [ ] تصفح categories
- [ ] فتح منتج
- [ ] زر "طلب" يعمل
- [ ] الرصيد يُخصَم
- [ ] الطلب يظهر في "طلباتي"

**Scenario C: Deposit**
- [ ] صفحة شحن
- [ ] اختيار طريقة دفع
- [ ] إدخال مبلغ
- [ ] الإيداع pending
- [ ] موافقة من الأدمن
- [ ] الرصيد يزداد

**النتيجة:** ☐ الكل PASS

---

### [ ] 3. Admin Panel Test (10 دقائق)

افتح `https://sanad-plus-admi.vercel.app`

- [ ] تسجيل دخول (مع OTP)
- [ ] Inbox يعمل
- [ ] قسم المستخدمون يعمل
- [ ] قسم الطلبات يعمل
- [ ] قسم الإيداعات يعمل
- [ ] Toast notification يعمل (بدون XSS)
- [ ] فتح modal مستخدم يعمل

**النتيجة:** ☐ PASS  ☐ FAIL

---

## Post-Launch: المراقبة

### اليوم الأول:
- [ ] Sentry: أي events جديدة؟
- [ ] UptimeRobot: Backend يعمل؟
- [ ] Telegram: شكاوى؟

### الأسبوع الأول:
- [ ] مراجعة Sentry يوميًا
- [ ] مراجعة Telegram يوميًا
- [ ] تحديث KNOWN_ISSUES

### اليوم 14:
- [ ] مراجعة KNOWN_ISSUES
- [ ] incidents جديدة؟
- [ ] قرار: v18.6 أم استمرار؟

---

## الإطلاق

### أول رسالة (10 مستخدمين)

افتح البوت: `@Sa3pls1_bot`

اختبر: /start → MiniApp → طلب تجريبي

أخبرهم:
- نسخة أولى
- مرحب بالملاحظات
- تواصل معي

---

## Definition of Success

**بعد 7 أيام:**
- [ ] Sentry events من SANAD PLUS⁺ = 0
- [ ] لا شكاوى أرصدة
- [ ] 5 مستخدمين استخدموا
- [ ] لا downtime

**بعد 14 يومًا:**
- [ ] 20 مستخدم
- [ ] 50 طلب
- [ ] تحديث KNOWN_ISSUES

**بعد 30 يومًا:**
- [ ] 100 مستخدم
- [ ] بدء إغلاق Medium

---

## قواعد الطوارئ

**إذا حدث incident:**

**1. Rollback:**

    git revert <commit> --no-edit
    git push origin main

**2. إيقاف Bot:**
Render Dashboard → sanad-plus-backend → Suspend

**3. التواصل:**
أخبر المستخدمين عبر Telegram

**4. بعد الحل:**
وثّق في KNOWN_ISSUES

---

## التوقيع

- [ ] CORS: ☐ PASS
- [ ] Money Flow: ☐ PASS
- [ ] Admin Panel: ☐ PASS

**القرار:** ☐ GO  ☐ NO-GO

**التاريخ:** _________

**الاسم:** أبو سند

---

🛡️ **SANAD PLUS⁺ — Launch with confidence.**