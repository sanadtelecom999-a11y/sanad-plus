// ============================================================
// admin/js/security-patch.js — v18.6 Security Fix
// Fixes CRIT-2: XSS in showToast + renderUsers + openUserDetailModal
// Loaded AFTER admin.js
// ============================================================
(function () {
    'use strict';

    // ============================================================
    // Private: escape HTML entities
    // ============================================================
    function _esc(text) {
        if (text == null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ============================================================
    // PATCH 1: showToast — يستخدم textContent بدل innerHTML
    // ============================================================
    window.showToast = function (message, type, duration) {
        type = type || 'info';
        duration = duration || 3500;
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const toast = document.createElement('div');
        toast.className = 'toast ' + type;

        const iconSpan = document.createElement('span');
        iconSpan.className = 'material-icons';
        iconSpan.textContent = icons[type] || 'info';

        const msgSpan = document.createElement('span');
        msgSpan.textContent = String(message);
        msgSpan.style.wordBreak = 'break-word';

        toast.appendChild(iconSpan);
        toast.appendChild(msgSpan);

        toast.onclick = function () {
            toast.classList.add('hiding');
            setTimeout(function () { toast.remove(); }, 200);
        };

        container.appendChild(toast);
        setTimeout(function () {
            toast.classList.add('hiding');
            setTimeout(function () { toast.remove(); }, 200);
        }, duration);
    };

    // ============================================================
    // PATCH 2: renderUsers — escape user data
    // ============================================================
    window.renderUsers = function (users) {
        users = users || (typeof usersData !== 'undefined' ? usersData : []);
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">' +
                '<span class="material-icons">people</span>لا يوجد مستخدمون</td></tr>';
            return;
        }

        const VIP_LEVELS = (typeof window.VIP_LEVELS !== 'undefined') ? window.VIP_LEVELS : {
            1: { name: 'مستخدم جديد', icon: 'person', color: '#CD7F32' },
            2: { name: 'مبتدئ', icon: 'school', color: '#C0C0C0' },
            3: { name: 'محترف', icon: 'workspace_premium', color: '#FFD700' },
            4: { name: 'أسطورة', icon: 'military_tech', color: '#E5E4E2' },
            5: { name: 'نجم', icon: 'star', color: '#B9F2FF' },
            6: { name: 'شريك', icon: 'handshake', color: '#9333EA' },
            7: { name: 'أسطوري', icon: 'auto_awesome', color: '#DC2626' }
        };

        const rows = users.map(function (user) {
            const balance = user.balance || 0;
            const balanceColor = balance < 0
                ? 'var(--error)'
                : (balance > 0 ? 'var(--success)' : 'var(--text)');

            const negBadge = (balance < 0 && user.allow_negative_balance)
                ? '<span style="font-size:0.7rem;background:var(--error-bg);color:var(--error);padding:2px 6px;border-radius:4px;margin-right:4px;">سالب</span>'
                : '';

            const vipLevel = user.vip_level || 0;
            const vipConfig = VIP_LEVELS[vipLevel];
            const vipBadge = vipConfig
                ? '<span class="vip-badge" style="background:' + vipConfig.color + ';color:#000;" title="' + _esc(vipConfig.name) + '">' +
                  '<span class="material-icons" style="font-size:14px;vertical-align:middle;">' + vipConfig.icon + '</span>' +
                  vipLevel + '</span>'
                : '<span style="color:var(--text-secondary);">—</span>';

            const displayName = _esc(user.username || user.first_name || 'مستخدم');

            return '<tr>' +
                '<td data-label="Telegram ID">' +
                    '<span class="ltr" style="cursor:pointer;" onclick="copyToClipboard(\'' + _esc(user.telegram_id) + '\')" title="اضغط للنسخ">' +
                        _esc(user.telegram_id) +
                    '</span>' +
                '</td>' +
                '<td data-label="الاسم">' + displayName + '</td>' +
                '<td data-label="الرصيد">' +
                    '<span style="color:' + balanceColor + ';font-weight:800;direction:ltr;">' + balance.toFixed(2) + '$</span>' +
                    negBadge +
                '</td>' +
                '<td data-label="الحالة">' +
                    '<span class="status-badge ' + (user.is_banned ? 'failed' : 'completed') + '">' +
                        (user.is_banned ? 'محظور' : 'نشط') +
                    '</span>' +
                '</td>' +
                '<td data-label="VIP">' + vipBadge + '</td>' +
                '<td data-label="إجراءات">' +
                    '<button class="btn-outline btn-sm" onclick="openUserDetailModal(' + user.id + ')" title="تفاصيل المستخدم">' +
                        '<span class="material-icons" style="font-size:14px;vertical-align:middle;">visibility</span>' +
                    '</button>' +
                    '<button class="btn-outline btn-sm" onclick="adjustBalance(' + user.id + ')">رصيد</button>' +
                    '<button class="btn-outline btn-sm" onclick="openNegativeBalanceModal(' + user.id + ')" title="الرصيد السالب">💳</button>' +
                    '<button class="btn-outline btn-sm" onclick="openVIPModal(' + user.id + ')" title="VIP">⭐</button>' +
                    '<button class="btn-outline btn-sm" onclick="toggleBan(' + user.id + ')">' +
                        (user.is_banned ? 'فك الحظر' : 'حظر') +
                    '</button>' +
                '</td>' +
            '</tr>';
        }).join('');

        tbody.innerHTML = rows;
    };

    // ============================================================
    // PATCH 3: openUserDetailModal — escape user data
    // ============================================================
    window.openUserDetailModal = async function (userId) {
        try {
            const user = await fetchAdminUserDetail(userId);
            const balanceColor = user.balance < 0
                ? 'var(--error)'
                : (user.balance > 0 ? 'var(--success)' : 'var(--text)');

            const kycBadge = user.kyc_status === 'verified'
                ? '<span class="status-badge completed">موثق ✓</span>'
                : (user.kyc_status === 'pending'
                    ? '<span class="status-badge pending">قيد المراجعة</span>'
                    : '<span class="status-badge unverified">غير موثق</span>');

            const safeFirst = _esc(user.first_name || 'مستخدم');
            const safeLast = _esc(user.last_name || '');
            const safeUsername = user.username ? _esc(user.username) : '';
            const firstChar = _esc((user.first_name || user.username || 'م')[0]);
            const safeReferral = _esc(user.referral_code || '-');

            const body =
                '<div style="text-align:right;">' +
                '<h3 style="margin-bottom:16px;">تفاصيل المستخدم</h3>' +
                '<div style="background:var(--primary-light);padding:16px;border-radius:12px;margin-bottom:16px;">' +
                    '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                        '<div style="width:56px;height:56px;border-radius:50%;background:var(--primary);color:white;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;">' +
                            firstChar +
                        '</div>' +
                        '<div style="flex:1;">' +
                            '<div style="font-weight:800;font-size:1.1rem;">' + safeFirst + ' ' + safeLast + '</div>' +
                            (safeUsername ? '<div style="color:var(--text-secondary);font-size:0.85rem;">@' + safeUsername + '</div>' : '') +
                        '</div>' +
                    '</div>' +
                    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:0.85rem;">' +
                        '<div>' +
                            '<span style="color:var(--text-secondary);">Telegram ID:</span>' +
                            '<div style="font-weight:700;cursor:pointer;" class="ltr" onclick="copyToClipboard(\'' + _esc(user.telegram_id) + '\')">' +
                                _esc(user.telegram_id) +
                                ' <span class="material-icons" style="font-size:12px;vertical-align:middle;color:var(--primary);">content_copy</span>' +
                            '</div>' +
                        '</div>' +
                        '<div>' +
                            '<span style="color:var(--text-secondary);">الدور:</span>' +
                            '<div style="font-weight:700;">' + (user.role === 'admin' ? 'أدمن' : 'مستخدم') + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
                    '<div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">' +
                        '<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الرصيد</div>' +
                        '<div style="font-size:1.4rem;font-weight:800;color:' + balanceColor + ';" class="ltr">' +
                            parseFloat(user.balance).toFixed(2) + '$' +
                        '</div>' +
                    '</div>' +
                    '<div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">' +
                        '<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الحالة</div>' +
                        '<div style="margin-top:4px;">' +
                            (user.is_banned ? '<span class="status-badge failed">محظور</span>' : '<span class="status-badge completed">نشط</span>') +
                        '</div>' +
                    '</div>' +
                    '<div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">' +
                        '<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الطلبات</div>' +
                        '<div style="font-size:1.4rem;font-weight:800;">' + (user.orders_count || 0) + '</div>' +
                    '</div>' +
                    '<div style="background:var(--background);padding:12px;border-radius:12px;text-align:center;">' +
                        '<div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:4px;">الإيداعات</div>' +
                        '<div style="font-size:1.4rem;font-weight:800;">' + (user.deposits_count || 0) + '</div>' +
                    '</div>' +
                '</div>' +
                '<div style="background:var(--background);padding:12px;border-radius:12px;margin-bottom:16px;">' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
                        '<span style="color:var(--text-secondary);font-size:0.85rem;">KYC:</span>' + kycBadge +
                    '</div>' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
                        '<span style="color:var(--text-secondary);font-size:0.85rem;">VIP Level:</span>' +
                        '<span style="font-weight:700;">' + (user.vip_level > 0 ? 'VIP' + user.vip_level : 'بدون') + '</span>' +
                    '</div>' +
                    '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
                        '<span style="color:var(--text-secondary);font-size:0.85rem;">كود الإحالة:</span>' +
                        '<span style="font-weight:700;cursor:pointer;" class="ltr" onclick="copyToClipboard(\'' + safeReferral + '\')">' +
                            safeReferral +
                        '</span>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                    '<button class="btn-primary" style="flex:1;" onclick="closeModal(); adjustBalance(' + user.id + ')">' +
                        '<span class="material-icons" style="font-size:16px;">edit</span> تعديل الرصيد' +
                    '</button>' +
                    '<button class="btn-outline" style="flex:1;" onclick="closeModal()">إغلاق</button>' +
                '</div>' +
                '</div>';

            openModal('', body);
        } catch (error) {
            showToast('فشل تحميل التفاصيل', 'error');
        }
    };

    console.log('✅ Security patch v18.6 loaded — XSS fixed');
})();