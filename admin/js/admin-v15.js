/* ============================================================
   admin-v15.js — Enhancements Layer
   ============================================================
   يُحمّل بعد admin.js — يضيف تحسينات دون تعديل الملف الأصلي
   ============================================================ */
(function() {
    'use strict';

    /* ============================================================
       1. التحية الديناميكية — صباح/مساء + اسم المالك
       ============================================================ */
    const OWNER_NAME = 'أبو سند';

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'صباح الخير';
        if (hour < 17) return 'مساء الخير';
        return 'مساء الخير';
    }

    function updateGreeting() {
        const el = document.getElementById('dashGreeting');
        if (el) {
            el.textContent = `${getGreeting()}، ${OWNER_NAME} 👋`;
        }
    }

    /* ============================================================
       2. Breadcrumbs — تحديث تلقائي حسب القسم
       ============================================================ */
    const SECTION_LABELS = {
        'dashboard': 'لوحة التحكم',
        'users': 'المستخدمون',
        'categories': 'الأقسام',
        'products': 'المنتجات',
        'payment-methods': 'طرق الدفع',
        'orders': 'الطلبات',
        'deposits': 'الإيداعات',
        'kyc': 'طلبات التوثيق',
        'service-requests': 'طلبات الخدمة',
        'coupons': 'كودات الخصم',
        'referrals': 'الإحالات',
        'archive': 'الأرشيف',
        'activities': 'سجل النشاطات',
        'audit-log': 'التدقيق المالي',
        'notifications': 'إرسال إشعار',
        'settings': 'الإعدادات'
    };

    const SECTION_GROUPS = {
        'users': 'المستخدمون',
        'categories': 'المتجر',
        'products': 'المتجر',
        'payment-methods': 'المتجر',
        'orders': 'العمليات',
        'deposits': 'العمليات',
        'kyc': 'العمليات',
        'service-requests': 'العمليات',
        'coupons': 'التسويق',
        'referrals': 'التسويق',
        'notifications': 'التسويق',
        'archive': 'النظام',
        'activities': 'النظام',
        'audit-log': 'النظام',
        'settings': 'النظام'
    };

    function updateBreadcrumbs(section) {
        const bc = document.getElementById('breadcrumbs');
        if (!bc) return;

        const label = SECTION_LABELS[section] || section;
        const group = SECTION_GROUPS[section];

        if (section === 'dashboard') {
            bc.innerHTML = `
                <span class="material-icons">home</span>
                <span class="current">${label}</span>
            `;
        } else if (group) {
            bc.innerHTML = `
                <span class="material-icons">home</span>
                <a href="#" onclick="switchSection('dashboard'); return false;">الرئيسية</a>
                <span class="material-icons">chevron_left</span>
                <a href="#">${group}</a>
                <span class="material-icons">chevron_left</span>
                <span class="current">${label}</span>
            `;
        } else {
            bc.innerHTML = `
                <span class="material-icons">home</span>
                <a href="#" onclick="switchSection('dashboard'); return false;">الرئيسية</a>
                <span class="material-icons">chevron_left</span>
                <span class="current">${label}</span>
            `;
        }
    }

    /* ============================================================
       3. مؤشر آخر تحديث
       ============================================================ */
    let lastUpdateTime = Date.now();

    function updateLastUpdateIndicator() {
        const el = document.getElementById('dashSubtitle');
        if (!el) return;

        const diff = Math.floor((Date.now() - lastUpdateTime) / 60000);
        if (diff < 1) {
            el.textContent = 'آخر تحديث: الآن';
        } else if (diff < 60) {
            el.textContent = `آخر تحديث: قبل ${diff} دقيقة`;
        } else {
            const hours = Math.floor(diff / 60);
            el.textContent = `آخر تحديث: قبل ${hours} ساعة`;
        }
    }

    // تحديث كل دقيقة
    setInterval(updateLastUpdateTime, 60000);

    function updateLastUpdateTime() {
        lastUpdateTime = Date.now();
        updateLastUpdateIndicator();
    }

    // تعريض الدالة العالمية (تُستدعى من admin.js عند loadAllData)
    window.markDataUpdated = updateLastUpdateTime;

    // تحديث المؤشر كل 30 ثانية
    setInterval(updateLastUpdateIndicator, 30000);

    /* ============================================================
       4. Wrap switchSection — إضافة تحديث Breadcrumbs + إخفاء Bulk Bar
       ============================================================ */
    const originalSwitchSection = window.switchSection;

    window.switchSection = function(sectionId) {
        // استدعاء الدالة الأصلية
        if (typeof originalSwitchSection === 'function') {
            originalSwitchSection(sectionId);
        }

        // تحديث Breadcrumbs
        updateBreadcrumbs(sectionId);

        // إخفاء Bulk Bar عند مغادرة الطلبات
        if (sectionId !== 'orders') {
            const bulkBar = document.getElementById('bulkOrdersBar');
            if (bulkBar) bulkBar.classList.remove('active');

            // إلغاء التحديد
            if (typeof selectedOrders !== 'undefined' && selectedOrders instanceof Set) {
                selectedOrders.clear();
            }
            document.querySelectorAll('.order-checkbox').forEach(cb => cb.checked = false);
        }

        // تحديث التحية عند فتح Dashboard
        if (sectionId === 'dashboard') {
            updateGreeting();
            updateLastUpdateIndicator();
        }
    };

    /* ============================================================
       5. Wrap loadAllData — تحديث وقت آخر تحديث
       ============================================================ */
    const originalLoadAllData = window.loadAllData;

    if (typeof originalLoadAllData === 'function') {
        window.loadAllData = async function() {
            const result = await originalLoadAllData.apply(this, arguments);
            updateLastUpdateTime();
            updateGreeting();
            return result;
        };
    }

    /* ============================================================
       6. تحسين Bulk Bar — ملاحظة: معالج CSS
       ============================================================ */
    // ملاحظة: إخفاء/إظهار Bulk Bar يعمل الآن عبر CSS (.active + opacity/visibility)
    // updateSelectedOrdersBar() من admin.js يُضيف/يزيل .active
    // CSS يتولى إخفاءه بشكل نظيف (opacity: 0 + visibility: hidden)

    // لكن نضيف حماية: إذا كان هناك تحديد وهو 0 → أخف Bar
    const originalUpdateSelectedOrdersBar = window.updateSelectedOrdersBar;

    if (typeof originalUpdateSelectedOrdersBar === 'function') {
        window.updateSelectedOrdersBar = function() {
            originalUpdateSelectedOrdersBar.apply(this, arguments);

            const bar = document.getElementById('bulkOrdersBar');
            if (!bar) return;

            // احصل على العدد الحالي
            const countEl = bar.querySelector('.bulk-count-num') || bar.querySelector('.bulk-count');
            const count = countEl ? parseInt(countEl.textContent || '0', 10) : 0;

            if (count > 0) {
                bar.classList.add('active');
            } else {
                bar.classList.remove('active');
            }
        };
    }

    /* ============================================================
       7. تحميل أولي
       ============================================================ */
    document.addEventListener('DOMContentLoaded', () => {
        updateGreeting();
        updateBreadcrumbs('dashboard');
        updateLastUpdateIndicator();
    });

    // إذا كانت الصفحة محمّلة مسبقاً
    if (document.readyState !== 'loading') {
        setTimeout(() => {
            updateGreeting();
            updateBreadcrumbs(
                (document.querySelector('.admin-section.active')?.id || 'section-dashboard')
                    .replace('section-', '')
            );
        }, 100);
    }

    console.log('✅ admin-v15.js loaded — SANAD Admin v15');
})();