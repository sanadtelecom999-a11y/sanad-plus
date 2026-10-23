# 📘 SANAD_PLUS_MASTER_HANDOVER_REPORT_2026-10-23.md

**التقرير الهندسي الشامل (Master Handover)**
**الإصدار:** v1.1.0 (Final)
**التاريخ:** 2026-10-23
**الحالة:** 🔴 مستقر مع 3 ثغرات أمنية حرجة (يجب معالجتها).

---

## §0. الغرض من التقرير
توثيق الحالة الواقعية 100% لمنظومة SANAD PLUS⁺. التقرير مبني على أدلة رقمية مستخرجة مباشرة من الكود في تاريخ 2026-10-23.

---

## §1. البوت (Telegram Bot)

### 1.1. الهوية والحالة
*   **الإصدار على main:** v18.5.3-SRE (مؤكد عبر grep BOT_VERSION).
*   **الحالة الحالية:** 🟢 يعمل (Live).

### 1.2. دورة الحياة (Lifecycle)
*   **الإقلاع:** يُدار عبر backend/run.py (336 سطراً) -> دالة _bot_supervisor().
*   **الإيقاف الآمن (SIGTERM):** يتم استدعاء _shutdown_event للخروج الآمن.

### 1.3. شجرة الملفات
| الملف | الأسطر | الوصف |
|---|---|---|
| bot/bot.py | 340 | Handlers، Rate Limit، Heartbeat. |
| backend/bot_main.py | 87 | نقطة الدخول، Startup Validation. |
| backend/run.py | 336 | إدارة Subprocess. |

### 1.4. الأوامر (Commands)
*   **/start:** يعمل. يتحقق من وضع الصيانة. يرسل زر WebApp.
*   **/me:** يعمل. [🔴 DEBT-1: يحتوي على Markdown Injection Risk].
*   **/admin_info:** يعمل. يتحقق من TELEGRAM_ADMIN_IDS.

### 1.5. الحماية (Security Audit)
*   **الثغرات المؤكدة:** 
    *   bot.py (الأسطر 219, 254, 276): استخدام parse_mode="Markdown" مع first_name (قابل للحقن).

---

## §2. واجهة المستخدم (MiniApp)
*   **الرابط:** https://sanad-plus.vercel.app
*   **المصادقة (Authentication) - خطير:** [🔴 DEBT-4]: غياب التحقق الإجباري من initData في مسارات API. أي شخص يعرف ID يمكنه انتحال شخصية مستخدم آخر.

---

## §3. لوحة التحكم (Admin Panel)
*   **الرابط:** https://sanad-plus-admi.vercel.app
*   **XSS (خطير جداً):** [🔴 DEBT-3]: admin_token في localStorage، و escapeHtml غير مستخدم في 10 أسطر تستخدم innerHTML.

---

## §4. البيئة والنشر
*   **Render:** خطة مدفوعة (0.5c-512mb).
*   **Vercel:** خطة Hobby.
*   **قاعدة البيانات:** Neon PostgreSQL.

---

## §5. الديون التقنية (Technical Debt Register)
| المعرف | البند | الأولوية | الحالة |
|---|---|---|---|
| DEBT-1 | Bot: Markdown Injection في /me | 🔴 حرجة | نشطة |
| DEBT-3 | Admin: admin_token + innerHTML (XSS) | 🔴 حرجة | نشطة |
| DEBT-4 | MiniApp: غياب التحقق من initData | 🔴 حرجة | نشطة |
| DEBT-6 | Vercel Rate Limit (100/day) | 🟠 عالية | مشكلة حالية |

---

## §6. جهات الاتصال والوصول
| الخدمة | المالك | 2FA | قناة طوارئ |
|---|---|---|---|
| Render (Backend/Bot) | أبو سند | ☐ | Telegram |
| Vercel (Admin/MiniApp)| أبو سند | ☐ | Telegram |
| Neon (PostgreSQL) | أبو سند | ☐ | Telegram |
| GitHub Repo | أبو سند | ☐ | Telegram |

*   **صاحب قرار Rollback النهائي:** أبو سند.

---
**نهاية التقرير v1.1.0 (Final).**
