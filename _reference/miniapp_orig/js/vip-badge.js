/* ============================================================
   vip-badge.js — SANAD+ VIP Badge Renderer
   ============================================================ */

(function() {
    'use strict';

    const VIP_CONFIG = {
        1: { text: 'برونزي',  icon: 'military_tech' },
        2: { text: 'فضي',     icon: 'workspace_premium' },
        3: { text: 'ذهبي',    icon: 'emoji_events' },
        4: { text: 'بلاتيني', icon: 'diamond' },
        5: { text: 'ماسي',    icon: 'auto_awesome' },
        6: { text: 'أسطوري',  icon: 'local_fire_department' },
        7: { text: 'الأسطورة', icon: 'workspace_premium' }
    };

    /**
     * يُنتج HTML لشارة VIP
     * @param {number} level - مستوى VIP (0-7)
     * @returns {string} HTML
     */
    function getVIPBadgeHTML(level) {
        const lvl = parseInt(level, 10);
        if (!lvl || lvl < 1 || lvl > 7) return '';
        const c = VIP_CONFIG[lvl];
        if (!c) return '';

        return `<span class="vip-badge vip-${lvl}" title="VIP ${lvl} — ${c.text}">
            <span class="material-icons">${c.icon}</span>
            <span>${c.text}</span>
        </span>`;
    }

    /**
     * يُنتج HTML لصف الاسم + VIP
     * @param {string} name - اسم المستخدم
     * @param {number} vipLevel - مستوى VIP
     * @returns {string} HTML
     */
    function getVIPNameRowHTML(name, vipLevel) {
        const badge = getVIPBadgeHTML(vipLevel);
        if (!badge) return `<span class="name">${name}</span>`;
        return `<span class="name">${name}</span>${badge}`;
    }

    // Expose globally
    window.getVIPBadgeHTML = getVIPBadgeHTML;
    window.getVIPNameRowHTML = getVIPNameRowHTML;

    console.log('✅ vip-badge.js loaded');
})();