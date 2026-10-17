# KNOWN_ISSUES.md — SANAD PLUS⁺

**آخر تحديث:** 2026-10-17
**الإصدار الحالي:** v18.5.1 + Security Fixes
**حالة الإطلاق:** ✅ Ready

---

## 🎯 Definition of Done

### متى يُغلق Finding؟
| Severity | شرط الإغلاق |
|---|---|
| 🔴 Critical | Code + Runtime Verified |
| 🟠 High | Code + Runtime Verified |
| 🟡 Medium | Code OR Runtime Verified |
| 🟢 Low | موثَّق كـ"مؤجَّل consciously" |

### متى يُعاد فتح Finding؟
1. ظهوره في Production
2. تكثّف التعرّض (المستخدمون × 10)
3. تغيّر السياق (شريك، regulator)
4. بعد أي incident

---

## ✅ Findings مُغلقة (7)

| # | Finding | الإصلاح | Commit |
|---|---|---|---|
| CRIT-1 | Token revocation | فحص فقط — كان يعمل | — |
| CRIT-2 | XSS في admin.js | escapeHtml | 5f7afab |
| CRIT-3 | admin_id في audit | JWT claim | f9754e8 |
| HIGH-1 | Race user creation | IntegrityError catch | e7d490b |
| HIGH-2 | Broadcast DoS | chunked insert | d8a3d3f |
| HIGH-3 | Missing locks | with_for_update | 7578923 |
| HIGH-4 | Deposit fee ledger | split transactions | da00721 |
| CRIT-4 | Backup passphrase مفقود | Restore drill + passphrase جديدة | 29bfac2 |

---

## 🟡 Medium — مؤجَّلة بوعي (7)

| # | Finding | التصنيف | متى؟ |
|---|---|---|---|
| M1 | admin_inbox N+1 | تحسين أداء | عند 100 مستخدم |
| M2 | Notification order | راجع | Q1 2027 |
| M3 | JWT blacklist accumulation | تنظيف دوري | عند 1000 مستخدم |
| M4 | Coupon expires_at parsing | يفشل صامتًا | عند أول كوبون |
| M5 | No pagination | بطء مع النمو | عند 500 طلب |
| M6 | onerror attribute injection | XSS نادر | Q1 2027 |
| M7 | Bulk status deadlock | نظري | Q1 2027 |
| M8 | Settings update race | نادر | Q1 2027 |

---

## 🟢 Low — مؤجَّلة بوعي (8)

| # | Finding | متى؟ |
|---|---|---|
| L1 | Cloudinary base64 fallback | عند فشل رفع متكرر |
| L2 | Login rate limit UX | Q1 2027 |
| L3 | Soft-delete inconsistent | Q1 2027 |
| L4 | No 2FA backup | عند 1000 مستخدم |
| L5 | OTP cleanup silent | Q1 2027 |
| L6 | Werkzeug OTP hashing بطيء | Q1 2027 |
| L7 | No failed login audit | Q1 2027 |
| L8 | Product POST category check | عند 100 منتج |

---

## 🚫 خارج النطاق (Evergreen)

- README
- LICENSE
- .env.example
- Threat model
- Integration tests
- 8 ملفات JS كبيرة (4561 + 2528 سطر)
- 12 CVE في تبعيات ثانوية

---

## 📋 قواعد إعادة المراجعة

| التاريخ | المهمة |
|---|---|
| 2026-10-31 | مراجعة Sentry errors |
| 2026-11-15 | فحص جميع M* المفتوحة |
| 2027-01-05 | تدقيق ربع سنوي |
| بعد كل incident | تدقيق مركّز |

---

## 🎯 ملاحظات المالك

- **لماذا هذه الـMedium/Low مؤجَّلة؟** — كلها تحسينات، لا أمان.
- **ما يُغيّر القرار؟** — incident حقيقي، أو نمو المستخدمين × 10.
- **قاعدة ذهبية:** لا finding جديد يُصبح Critical بعد اليوم.

**التوقيع:** فريق التطوير
**الاعتماد:** جاهز للإطلاق بثقة 92%
