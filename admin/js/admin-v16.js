/* ============================================================
   admin-v16.js — v17.2 (XSS Hardened + Discounts + VIP v2)
   ============================================================
   يُحمّل بعد admin.js — يستبدل دوال العرض والتفاعل
   ============================================================ */
(function () {
    'use strict';

    const OWNER_NAME = 'أبو سند';

    /* ============================================================
       🛡️ v17.2: XSS Protection
       ============================================================ */
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function escapeAttr(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    window.escapeHtml = escapeHtml;
    window.escapeAttr = escapeAttr;

    /* ============================================================
       VIP Levels — v2
       ============================================================ */
    const VIP_LEVELS = {
        1: { name: 'برونزي',   icon: 'military_tech' },
        2: { name: 'فضي',      icon: 'star' },
        3: { name: 'ذهبي',     icon: 'emoji_events' },
        4: { name: 'بلاتيني',  icon: 'diamond' },
        5: { name: 'ماسي',     icon: 'auto_awesome' },
        6: { name: 'أسطوري',   icon: 'local_fire_department' },
        7: { name: 'الأسطورة', icon: 'workspace_premium' },
    };

    /* ============================================================
       getAdminVIPBadgeHTML
       ============================================================ */
    window.getAdminVIPBadgeHTML = function (level) {
        const lvl = parseInt(level, 10);
        if (!lvl || lvl < 1 || lvl > 7) {
            return '<span style="color:var(--text-3);">—</span>';
        }
        const c = VIP_LEVELS[lvl];
        return `<span class="vip-badge vip-${lvl}" title="VIP ${lvl} — ${c.name}">
            <span class="material-icons">${c.icon}</span>
            <span>${c.name}</span>
        </span>`;
    };

    /* ============================================================
       renderUsers — XSS protected
       ============================================================ */
    window.renderUsers = function (users) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const list = Array.isArray(users)
            ? users
            : (typeof usersData !== 'undefined' ? usersData : []);

        if (!list.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><span class="material-icons">people</span>لا يوجد مستخدمون</td></tr>';
            return;
        }

        tbody.innerHTML = list.map(user => {
            const balance = user.balance || 0;
            const balanceColor = balance < 0 ? 'var(--error)' : (balance > 0 ? 'var(--success)' : 'var(--text)');
            const negBadge = (balance < 0 && user.allow_negative_balance) ?
                '<span style="font-size:0.7rem;background:var(--error-bg);color:var(--error);padding:2px 6px;border-radius:4px;margin-right:4px;">سالب</span>' : '';

            const vipBadge = window.getAdminVIPBadgeHTML(user.vip_level || 0);

            const discountPercent = parseFloat(user.general_discount) || 0;
            const discountBadge = discountPercent > 0
                ? `<span class="discount-chip active">${discountPercent}%</span>`
                : `<span class="discount-chip">0%</span>`;

            return `
            <tr>
                <td data-label="Telegram ID">
                    <span class="ltr" style="cursor:pointer;" onclick="copyToClipboard('${escapeAttr(user.telegram_id)}')" title="اضغط للنسخ">
                        ${escapeHtml(user.telegram_id)}
                    </span>
                </td>
                <td data-label="الاسم">${escapeHtml(user.username || user.first_name || 'مستخدم')}</td>
                <td data-label="الرصيد">
                    <span style="color:${balanceColor};font-weight:800;direction:ltr;">${balance.toFixed(2)}$</span>
                    ${negBadge}
                </td>
                <td data-label="الحالة"><span class="status-badge ${user.is_banned ? 'failed' : 'completed'}">${user.is_banned ? 'محظور' : 'نشط'}</span></td>
                <td data-label="VIP">${vipBadge}</td>
                <td data-label="إجراءات" class="user-actions-cell">
                    <button class="btn-outline btn-sm" onclick="openUserDetailModal(${user.id})" title="تفاصيل المستخدم">
                        <span class="material-icons" style="font-size:14px;">visibility</span>
                    </button>
                    <button class="btn-outline btn-sm" onclick="adjustBalance(${user.id})" title="تعديل الرصيد">
                        <span class="material-icons" style="font-size:14px;">payments</span>
                    </button>
                    <button class="btn-outline btn-sm" onclick="openNegativeBalanceModal(${user.id})" title="الرصيد السالب">
                        <span class="material-icons" style="font-size:14px;">credit_card</span>
                    </button>
                    <button class="btn-outline btn-sm" onclick="openVIPModal(${user.id})" title="VIP">
                        <span class="material-icons" style="font-size:14px;">star</span>
                    </button>
                    <button class="btn-outline btn-sm discount-btn ${discountPercent > 0 ? 'active' : ''}" onclick="openDiscountModal(${user.id})" title="الخصم">
                        ${discountBadge}
                    </button>
                    <button class="btn-outline btn-sm" onclick="toggleBan(${user.id})">
                        ${user.is_banned ? 'فك الحظر' : 'حظر'}
                    </button>
                </td>
            </tr>
            `;
        }).join('');
    };

    /* ============================================================
       renderKYC — XSS protected
       ============================================================ */
    window.renderKYC = function () {
        const container = document.getElementById('kycList');
        if (!container) return;

        const data = (typeof kycData !== 'undefined' && Array.isArray(kycData)) ? kycData : [];
        let filtered = [...data];
        try {
            const tabFilter = (typeof kycTabFilter !== 'undefined') ? kycTabFilter : 'all';
            if (tabFilter === 'pending') filtered = data.filter(k => k.status === 'pending');
            else if (tabFilter === 'approved') filtered = data.filter(k => k.status === 'approved');
            else if (tabFilter === 'rejected') filtered = data.filter(k => k.status === 'rejected');
        } catch (e) { /* ignore */ }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">verified_user</span></div>
                    <h3>لا توجد طلبات توثيق</h3>
                    <p>عندما يُرسل المستخدمون طلبات KYC، ستظهر هنا.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(k => {
            const statusText = k.status === 'approved' ? 'مقبول'
                             : k.status === 'rejected' ? 'مرفوض'
                             : 'معلق';
            return `
                <div class="card-item" data-status="${escapeAttr(k.status)}">
                    <div class="card-top">
                        <div class="card-id" onclick="copyToClipboard('${escapeAttr(k.user_id)}')">#${escapeHtml(k.user_id)}</div>
                        <span class="badge-status ${escapeAttr(k.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">person</span>
                            <strong>${escapeHtml(k.full_name || 'غير محدد')}</strong>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">phone</span>
                            <span class="ltr">${escapeHtml(k.phone || '-')}</span>
                        </div>
                        ${k.address ? `
                        <div class="card-row">
                            <span class="material-icons">location_on</span>
                            <span>${escapeHtml(k.address)}</span>
                        </div>
                        ` : ''}
                        <div class="card-row">
                            <span class="material-icons">schedule</span>
                            <span>${k.submitted_at ? new Date(k.submitted_at).toLocaleString('ar') : ''}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="card-actions">
                            ${k.selfie_image ? `
                                <button class="card-action view" onclick="viewKYCImage(${k.id})">
                                    <span class="material-icons">image</span> عرض الصورة
                                </button>
                            ` : ''}
                            ${k.status === 'pending' ? `
                                <button class="card-action approve" onclick="window.handleApproveKYC(${k.id})">
                                    <span class="material-icons">check</span> قبول
                                </button>
                                <button class="card-action reject" onclick="window.handleRejectKYC(${k.id})">
                                    <span class="material-icons">close</span> رفض
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    /* ============================================================
       renderDeposits — XSS protected
       ============================================================ */
    window.renderDeposits = function (deposits) {
        const container = document.getElementById('depositsList');
        if (!container) return;

        const data = Array.isArray(deposits)
            ? deposits
            : (typeof depositsData !== 'undefined' ? depositsData : []);

        let filtered = [...data];
        try {
            const tabFilter = (typeof depositsTabFilter !== 'undefined') ? depositsTabFilter : 'all';
            if (tabFilter === 'pending') filtered = data.filter(d => d.status === 'pending');
            else if (tabFilter === 'approved') filtered = data.filter(d => d.status === 'approved');
            else if (tabFilter === 'rejected') filtered = data.filter(d => d.status === 'rejected');
        } catch (e) { /* ignore */ }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">account_balance_wallet</span></div>
                    <h3>لا توجد إيداعات</h3>
                    <p>عندما يُرسل المستخدمون إيداعات، ستظهر هنا للمراجعة.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(d => {
            const statusText = d.status === 'approved' ? 'مقبول'
                             : d.status === 'rejected' ? 'مرفوض'
                             : 'معلق';
            return `
                <div class="card-item" data-status="${escapeAttr(d.status)}">
                    <div class="card-top">
                        <div class="card-id" onclick="copyToClipboard('${escapeAttr(d.transaction_id || '')}')">${escapeHtml(d.transaction_id || '')}</div>
                        <span class="badge-status ${escapeAttr(d.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">person</span>
                            <span>${escapeHtml(d.user_name || 'مستخدم')}</span>
                            <span class="card-user-id" onclick="copyToClipboard('${escapeAttr(d.user_telegram || d.user_id)}')">#${escapeHtml(d.user_telegram || d.user_id)}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">credit_card</span>
                            <span>${escapeHtml(d.method || '-')}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">schedule</span>
                            <span>${d.created_at ? new Date(d.created_at).toLocaleString('ar') : ''}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="card-price ltr" style="color:var(--success);font-weight:900;">$${(d.amount || 0).toFixed(2)}</div>
                        <div class="card-actions">
                            <button class="card-action view" onclick="viewDepositDetails(${d.id})">
                                <span class="material-icons">visibility</span> تفاصيل
                            </button>
                            ${d.status === 'pending' ? `
                                <button class="card-action approve" onclick="approveDepositHandler(${d.id})">
                                    <span class="material-icons">check</span> قبول
                                </button>
                                <button class="card-action reject" onclick="rejectDepositHandler(${d.id})">
                                    <span class="material-icons">close</span> رفض
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    /* ============================================================
       renderServiceRequests — XSS protected
       ============================================================ */
    window.renderServiceRequests = function () {
        const container = document.getElementById('servicesList');
        if (!container) return;

        const data = (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData))
            ? serviceRequestsData
            : [];

        if (!data.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">handyman</span></div>
                    <h3>لا توجد طلبات خدمة</h3>
                    <p>عندما يطلب المستخدمون خدمات مخصصة، ستظهر هنا.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = data.map(r => {
            const statusText = r.status === 'completed' ? 'مكتمل'
                             : r.status === 'rejected' ? 'مرفوض'
                             : r.status === 'cancelled' ? 'ملغي'
                             : 'معلق';
            return `
                <div class="card-item" data-status="${escapeAttr(r.status)}">
                    <div class="card-top">
                        <div class="card-id" onclick="copyToClipboard('${escapeAttr(r.user_id)}')">#${escapeHtml(r.user_id)}</div>
                        <span class="badge-status ${escapeAttr(r.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">handyman</span>
                            <strong>${escapeHtml(r.service_name || '-')}</strong>
                        </div>
                        ${r.description ? `
                        <div class="card-row">
                            <span class="material-icons">description</span>
                            <span>${escapeHtml(r.description)}</span>
                        </div>
                        ` : ''}
                        ${r.estimated_price ? `
                        <div class="card-row">
                            <span class="material-icons">payments</span>
                            <span>${escapeHtml(r.estimated_price)}$</span>
                        </div>
                        ` : ''}
                        <div class="card-row">
                            <span class="material-icons">schedule</span>
                            <span>${r.created_at ? new Date(r.created_at).toLocaleString('ar') : ''}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="card-actions" style="margin-inline-start:auto;">
                            <button class="card-action view" onclick="viewServiceRequest(${r.id})">
                                <span class="material-icons">visibility</span> عرض
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    };

    /* ============================================================
       renderOrders — XSS protected
       ============================================================ */
    window.renderOrders = function (orders) {
        const container = document.getElementById('ordersList');
        if (!container) return;

        const data = Array.isArray(orders)
            ? orders
            : (typeof ordersData !== 'undefined' ? ordersData : []);

        let filtered = [...data];
        try {
            const tabFilter = (typeof ordersTabFilter !== 'undefined') ? ordersTabFilter : 'all';
            if (tabFilter === 'pending') filtered = data.filter(o => o.status === 'pending');
            else if (tabFilter === 'processing') filtered = data.filter(o => o.status === 'processing' || o.status === 'review');
            else if (tabFilter === 'completed') filtered = data.filter(o => o.status === 'completed');
        } catch (e) { /* ignore */ }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">receipt_long</span></div>
                    <h3>لا توجد طلبات</h3>
                    <p>الطلبات الجديدة ستظهر هنا فور إنشائها.</p>
                </div>
            `;
            return;
        }

        const selectedIds = (typeof selectedOrders !== 'undefined' && selectedOrders instanceof Set)
            ? selectedOrders
            : new Set();

        container.innerHTML = filtered.map(o => {
            const statusText = getStatusArabic(o.status);
            const isChecked = selectedIds.has(o.id);

            let qtyDisplay;
            if (o.product_type === 'topup') {
                qtyDisplay = `${(o.quantity || 0).toLocaleString('ar')} ل.س`;
            } else if (o.product_unit_name && o.product_unit_name !== 'قطعة') {
                qtyDisplay = `${(o.quantity || 0).toLocaleString('ar')} ${escapeHtml(o.product_unit_name)}`;
            } else {
                qtyDisplay = `${(o.quantity || 0).toLocaleString('ar')} قطعة`;
            }

            const isFinal = ['completed', 'cancelled', 'failed'].includes(o.status);

            return `
                <div class="card-item" data-status="${escapeAttr(o.status)}" data-swipeable="true" data-order-id="${o.id}">
                    <div class="card-top">
                        <label class="order-checkbox-wrap" onclick="event.stopPropagation();" style="display:flex;align-items:center;">
                            <input type="checkbox" class="order-checkbox" ${isChecked ? 'checked' : ''}
                                   onchange="toggleOrderSelection(${o.id}, this.checked)"
                                   style="width:20px;height:20px;accent-color:var(--primary);cursor:pointer;">
                        </label>
                        <div class="card-id" onclick="copyToClipboard('${escapeAttr(o.order_number)}')" style="flex:1;margin:0 8px;">${escapeHtml(o.order_number)}</div>
                        <span class="badge-status ${escapeAttr(o.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">person</span>
                            <span>${escapeHtml(o.user_name || 'مستخدم')}</span>
                            <span class="card-user-id" onclick="copyToClipboard('${escapeAttr(o.user_telegram || o.user_id)}')">#${escapeHtml(o.user_telegram || o.user_id)}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">inventory_2</span>
                            <span>${escapeHtml(o.product_name || '-')}</span>
                            <span class="card-user-id">${qtyDisplay}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">schedule</span>
                            <span>${o.created_at ? new Date(o.created_at).toLocaleString('ar', { dateStyle: 'short', timeStyle: 'short' }) : '-'}</span>
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="card-price ltr">${(o.total_price || 0).toFixed(2)}$</div>
                        <div class="card-actions">
                            <button class="card-action view" onclick="viewOrderDetails(${o.id})">
                                <span class="material-icons">visibility</span> تفاصيل
                            </button>
                            ${!isFinal ? `
                                <button class="card-action approve" onclick="quickApproveOrder(${o.id}, 'completed')">
                                    <span class="material-icons">check</span> إكمال
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (typeof updateSelectedOrdersBar === 'function') {
            try { updateSelectedOrdersBar(); } catch (e) {}
        }
        attachSwipeHandlers();
    };

    /* ============================================================
       renderDashboard
       ============================================================ */
    const _origRenderDashboard = window.renderDashboard;
    window.renderDashboard = function () {
        if (typeof _origRenderDashboard === 'function') {
            try { _origRenderDashboard(); } catch (e) { console.warn('renderDashboard error:', e); }
        }

        const h = new Date().getHours();
        const greeting = h < 12 ? 'صباح الخير' : 'مساء الخير';
        const el = document.getElementById('dashGreeting');
        if (el) el.textContent = `${greeting}، ${OWNER_NAME} 👋`;

        renderAttentionCard();
        renderRecentActivities();
    };

    function renderAttentionCard() {
        const container = document.getElementById('attentionList');
        if (!container) return;

        const ordersDataArr = (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) ? ordersData : [];
        const depositsDataArr = (typeof depositsData !== 'undefined' && Array.isArray(depositsData)) ? depositsData : [];
        const kycDataArr = (typeof kycData !== 'undefined' && Array.isArray(kycData)) ? kycData : [];
        const servicesDataArr = (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData)) ? serviceRequestsData : [];

        const pendingOrders = ordersDataArr.filter(o => o.status === 'pending').length;
        const pendingDeposits = depositsDataArr.filter(d => d.status === 'pending').length;
        const pendingKYC = kycDataArr.filter(k => k.status === 'pending').length;
        const pendingServices = servicesDataArr.filter(s => s.status === 'pending').length;

        const total = pendingOrders + pendingDeposits + pendingKYC + pendingServices;

        if (total === 0) {
            const card = document.getElementById('attentionCard');
            if (card) card.classList.add('empty');
            container.innerHTML = `
                <div class="attention-empty">
                    <span class="material-icons">check_circle</span>
                    كل شيء تحت السيطرة
                </div>
            `;
            return;
        }

        const card = document.getElementById('attentionCard');
        if (card) card.classList.remove('empty');

        let html = '';
        const items = [
            { count: pendingOrders, label: 'طلب بانتظار المراجعة', icon: 'receipt_long', section: 'orders' },
            { count: pendingDeposits, label: 'إيداع بانتظار المراجعة', icon: 'account_balance_wallet', section: 'deposits' },
            { count: pendingKYC, label: 'طلب توثيق معلق', icon: 'verified_user', section: 'kyc' },
            { count: pendingServices, label: 'طلب خدمة معلق', icon: 'handyman', section: 'service-requests' },
        ];

        items.forEach(item => {
            if (item.count > 0) {
                html += `
                    <button class="attention-item" onclick="switchSection('${item.section}')">
                        <div class="attention-item-icon"><span class="material-icons">${item.icon}</span></div>
                        <div class="attention-item-content">
                            <div class="attention-item-title">${item.count} ${item.label}</div>
                            <div class="attention-item-subtitle">اضغط للمراجعة</div>
                        </div>
                        <span class="attention-item-count">${item.count}</span>
                    </button>
                `;
            }
        });

        container.innerHTML = html;
    }

    function renderRecentActivities() {
        const container = document.getElementById('recentActivities');
        if (!container) return;

        const ordersDataArr = (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) ? ordersData : [];

        if (!ordersDataArr.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">history</span></div>
                    <h3>لا توجد عمليات حديثة</h3>
                    <p>عندما يبدأ المستخدمون بالتفاعل، ستظهر هنا آخر الطلبات والإيداعات.</p>
                </div>
            `;
            return;
        }

        const recent = ordersDataArr.slice(0, 5);
        container.innerHTML = `
            <div class="cards-list">
                ${recent.map(o => `
                    <div class="card-item" data-status="${escapeAttr(o.status)}" onclick="viewOrderDetails(${o.id})" style="cursor:pointer;">
                        <div class="card-top">
                            <div class="card-id">${escapeHtml(o.order_number)}</div>
                            <span class="badge-status ${escapeAttr(o.status)}">${getStatusArabic(o.status)}</span>
                        </div>
                        <div class="card-body">
                            <div class="card-row">
                                <span class="material-icons">person</span>
                                <span>${escapeHtml(o.user_name || 'مستخدم')}</span>
                            </div>
                            <div class="card-row">
                                <span class="material-icons">inventory_2</span>
                                <span>${escapeHtml(o.product_name || '-')}</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <div class="card-price ltr">${(o.total_price || 0).toFixed(2)}$</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /* ============================================================
       Greeting + Sidebar + Toast
       ============================================================ */
    function getGreeting() {
        const h = new Date().getHours();
        return h < 12 ? 'صباح الخير' : 'مساء الخير';
    }

    function updateGreeting() {
        const el = document.getElementById('dashGreeting');
        if (el) {
            el.textContent = `${getGreeting()}، ${OWNER_NAME} 👋`;
        }
        const sub = document.getElementById('dashSubtitle');
        if (sub && !sub.textContent.includes('آخر تحديث')) {
            sub.textContent = 'آخر تحديث: الآن';
        }
    }

    window.toggleSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (!sidebar) return;
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    };

    window.closeSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    };

    window.showToast = function (message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-icons">${icons[type] || 'info'}</span>
            <span>${escapeHtml(message)}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 250);
        }, duration);
    };

    /* ============================================================
       Bottom Sheet + Confirm
       ============================================================ */
    window.openBottomSheet = function (title, bodyHTML) {
        const sheet = document.getElementById('bottomSheet');
        const overlay = document.getElementById('bottomSheetOverlay');
        const titleEl = document.getElementById('sheetTitle');
        const bodyEl = document.getElementById('sheetBody');

        if (!sheet || !overlay) return;

        if (titleEl) titleEl.textContent = title || '';
        if (bodyEl) bodyEl.innerHTML = bodyHTML || '';

        overlay.classList.add('active');
        setTimeout(() => sheet.classList.add('open'), 10);
        document.body.style.overflow = 'hidden';
    };

    window.closeBottomSheet = function () {
        const sheet = document.getElementById('bottomSheet');
        const overlay = document.getElementById('bottomSheetOverlay');
        if (sheet) sheet.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    window.showConfirm = function (options) {
        return new Promise((resolve) => {
            const {
                title = 'تأكيد',
                message = 'هل أنت متأكد؟',
                confirmText = 'تأكيد',
                type = 'primary'
            } = options || {};

            const btnClass = type === 'danger' ? 'btn-danger' : 'btn-primary';

            window.openBottomSheet(title, `
                <p style="text-align:center;margin-bottom:20px;color:var(--text-2);font-size:15px;line-height:1.7;white-space:pre-line;">${escapeHtml(message)}</p>
                <div style="display:flex;gap:8px;">
                    <button class="btn ${btnClass} btn-block" id="__confirmYes">${escapeHtml(confirmText)}</button>
                    <button class="btn btn-outline btn-block" id="__confirmNo">إلغاء</button>
                </div>
            `);

            const yesBtn = document.getElementById('__confirmYes');
            const noBtn = document.getElementById('__confirmNo');

            if (yesBtn) {
                yesBtn.onclick = () => {
                    window.closeBottomSheet();
                    resolve(true);
                };
            }
            if (noBtn) {
                noBtn.onclick = () => {
                    window.closeBottomSheet();
                    resolve(false);
                };
            }
        });
    };

    /* ============================================================
       Image Lightbox
       ============================================================ */
    window.openImageLightbox = function (url) {
        const lb = document.getElementById('imageLightbox');
        const img = document.getElementById('lightboxImage');
        if (!lb || !img) return;
        img.src = url;
        lb.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeImageLightbox = function () {
        const lb = document.getElementById('imageLightbox');
        if (lb) lb.classList.remove('active');
        document.body.style.overflow = '';
    };

    /* ============================================================
       🆕 v17: DISCOUNT MODAL
       ============================================================ */
    window.openDiscountModal = async function (userId) {
        const user = (typeof usersData !== 'undefined' && Array.isArray(usersData))
            ? usersData.find(u => u.id === userId)
            : null;
        if (!user) {
            window.showToast('المستخدم غير موجود', 'error');
            return;
        }

        let discountsData = { general_discount: 0, product_discounts: [] };
        try {
            discountsData = await window.fetchUserDiscounts(userId);
        } catch (err) {
            console.warn('fetchUserDiscounts failed:', err);
        }

        const generalPercent = parseFloat(discountsData.general_discount) || 0;
        const productDiscounts = discountsData.product_discounts || [];

        const productsList = (typeof productsData !== 'undefined' && Array.isArray(productsData))
            ? productsData
            : [];

        const productsOptions = productsList.map(p =>
            `<option value="${p.id}">${escapeHtml(p.name)}</option>`
        ).join('');

        const currentDiscountsHTML = productDiscounts.length
            ? productDiscounts.map(d => `
                <div class="discount-row">
                    <div class="discount-row-info">
                        ${d.product_image ? `<img src="${escapeAttr(d.product_image)}" class="discount-row-img" alt="">` : '<span class="material-icons">inventory_2</span>'}
                        <div>
                            <div class="discount-row-name">${escapeHtml(d.product_name)}</div>
                            <div class="discount-row-percent">${parseFloat(d.discount_percent).toFixed(2)}%</div>
                        </div>
                    </div>
                    <button class="icon-action danger" onclick="deleteDiscountHandler(${userId}, ${d.id})" title="حذف">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            `).join('')
            : '<div class="empty" style="padding:20px;font-size:13px;">لا توجد خصومات على منتجات محددة</div>';

        const bodyHTML = `
            <div style="text-align:right;">
                <div class="card-id" style="margin-bottom:12px;display:inline-block;">${escapeHtml(user.username || user.first_name || 'مستخدم')} • #${escapeHtml(user.telegram_id)}</div>

                <div class="discount-section">
                    <div class="discount-section-title">
                        <span class="material-icons">public</span>
                        خصم عام (على كل المنتجات)
                    </div>
                    <div class="discount-input-row">
                        <input type="number" id="discGeneral" class="discount-input"
                               value="${generalPercent}" min="0" max="100" step="0.5"
                               placeholder="0">
                        <span class="discount-unit">%</span>
                        <button class="btn btn-primary btn-sm" onclick="saveGeneralDiscountHandler(${userId})">
                            <span class="material-icons">save</span> حفظ
                        </button>
                    </div>
                    <small style="color:var(--text-3);font-size:11px;display:block;margin-top:6px;">
                        💡 يُطبَّق تلقائياً على كل مشتريات المستخدم (يتجاوزه أي خصم مخصص لمنتج معين)
                    </small>
                </div>

                <div class="discount-section">
                    <div class="discount-section-title">
                        <span class="material-icons">inventory_2</span>
                        خصم على منتج معين
                    </div>
                    <div class="discount-input-row">
                        <select id="discProductId" class="discount-select">
                            ${productsOptions || '<option value="">لا توجد منتجات</option>'}
                        </select>
                    </div>
                    <div class="discount-input-row" style="margin-top:8px;">
                        <input type="number" id="discProductPercent" class="discount-input"
                               value="0" min="0.01" max="100" step="0.5" placeholder="0">
                        <span class="discount-unit">%</span>
                        <button class="btn btn-primary btn-sm" onclick="saveProductDiscountHandler(${userId})">
                            <span class="material-icons">add</span> إضافة
                        </button>
                    </div>
                    <small style="color:var(--text-3);font-size:11px;display:block;margin-top:6px;">
                        💡 يتجاوز الخصم العام عند شراء هذا المنتج تحديداً
                    </small>
                </div>

                <div class="discount-section">
                    <div class="discount-section-title">
                        <span class="material-icons">list</span>
                        خصومات المنتجات الحالية (${productDiscounts.length})
                    </div>
                    <div id="currentDiscountsList">
                        ${currentDiscountsHTML}
                    </div>
                </div>
            </div>
        `;

        window.openBottomSheet('💰 خصومات المستخدم', bodyHTML);
    };

    window.saveGeneralDiscountHandler = async function (userId) {
        const input = document.getElementById('discGeneral');
        if (!input) return;
        const percent = parseFloat(input.value) || 0;

        if (percent < 0 || percent > 100) {
            window.showToast('النسبة بين 0 و 100', 'warning');
            return;
        }

        try {
            await window.setGeneralDiscount(userId, percent);
            window.showToast(
                percent > 0 ? `✅ تم تعيين خصم عام ${percent}%` : '✅ تم إلغاء الخصم العام',
                'success'
            );
            await window.loadAllData();
            window.renderUsers();
            window.openDiscountModal(userId);
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.saveProductDiscountHandler = async function (userId) {
        const select = document.getElementById('discProductId');
        const input = document.getElementById('discProductPercent');
        if (!select || !input) return;

        const productId = parseInt(select.value);
        const percent = parseFloat(input.value) || 0;

        if (!productId) {
            window.showToast('اختر منتجاً', 'warning');
            return;
        }
        if (percent <= 0 || percent > 100) {
            window.showToast('النسبة بين 0.01 و 100', 'warning');
            return;
        }

        try {
            await window.setProductDiscount(userId, productId, percent);
            window.showToast(`✅ تم إضافة خصم ${percent}% على المنتج`, 'success');
            await window.loadAllData();
            window.renderUsers();
            window.openDiscountModal(userId);
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.deleteDiscountHandler = async function (userId, discountId) {
        const ok = await window.showConfirm({
            title: 'حذف الخصم',
            message: 'هل أنت متأكد من حذف هذا الخصم؟',
            confirmText: 'حذف',
            type: 'danger'
        });
        if (!ok) return;

        try {
            await window.deleteProductDiscount(userId, discountId);
            window.showToast('✅ تم حذف الخصم', 'success');
            await window.loadAllData();
            window.renderUsers();
            window.openDiscountModal(userId);
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    /* ============================================================
       VIP Modal — v2
       ============================================================ */
    window.openVIPModal = function (userId) {
        const user = (typeof usersData !== 'undefined' && Array.isArray(usersData))
            ? usersData.find(u => u.id === userId)
            : null;
        if (!user) return;

        const currentLevel = user.vip_level || 0;

        let optionsHTML = `
            <label class="vip-option ${currentLevel === 0 ? 'selected' : ''}" onclick="selectVIPOption(this, 0)">
                <input type="radio" name="vipLevel" value="0" ${currentLevel === 0 ? 'checked' : ''} style="display:none;">
                <span class="material-icons" style="color:var(--text-3);font-size:20px;">block</span>
                <div style="flex:1;">
                    <div style="font-weight:700;font-size:14px;">بدون VIP</div>
                </div>
            </label>
        `;

        for (let lvl = 1; lvl <= 7; lvl++) {
            const isSel = lvl === currentLevel;
            optionsHTML += `
                <label class="vip-option ${isSel ? 'selected' : ''}" onclick="selectVIPOption(this, ${lvl})">
                    <input type="radio" name="vipLevel" value="${lvl}" ${isSel ? 'checked' : ''} style="display:none;">
                    ${window.getAdminVIPBadgeHTML(lvl)}
                </label>
            `;
        }

        window.openBottomSheet('⭐ اختيار مستوى VIP', `
            <div style="text-align:right;">
                <div class="card-id" style="margin-bottom:12px;display:inline-block;">${escapeHtml(user.username || user.first_name || 'مستخدم')} • #${escapeHtml(user.telegram_id)}</div>
                <p style="color:var(--text-3);font-size:12px;margin-bottom:14px;">
                    ⚠️ VIP مظهر فقط (شارة على الاسم) — لا يُغيّر الأسعار أو الخصومات.
                </p>
                <div class="vip-options-list">
                    ${optionsHTML}
                </div>
                <button class="btn btn-primary btn-block" style="margin-top:16px;" onclick="saveVIPSelection(${userId})">
                    <span class="material-icons">save</span> حفظ
                </button>
            </div>
        `);
    };

    window.selectVIPOption = function (el, level) {
        document.querySelectorAll('.vip-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
        const radio = el.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    };

    window.saveVIPSelection = async function (userId) {
        const selected = document.querySelector('input[name="vipLevel"]:checked');
        if (!selected) {
            window.showToast('اختر مستوى', 'warning');
            return;
        }
        const level = parseInt(selected.value);
        try {
            await window.setUserVIP(userId, level);
            window.closeBottomSheet();
            window.showToast(level === 0 ? 'تم إلغاء VIP' : `تم تعيين ${VIP_LEVELS[level].name}`, 'success');
            await window.loadAllData();
            window.renderUsers();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    /* ============================================================
       ORDER DETAILS — Dark Card + Skip Steps + XSS
       ============================================================ */
    window.viewOrderDetails = async function (orderId) {
        try {
            const order = await window.fetchAdminOrderFull(orderId);
            const delivery = order.delivery_data || {};

            let deliveryRows = '';
            if (delivery.player_id) {
                deliveryRows += renderCopyableRow('🎮', 'ID اللاعب', delivery.player_id);
            }
            if (delivery.account_id) {
                deliveryRows += renderCopyableRow('🎮', 'ID الحساب', delivery.account_id);
            }
            if (delivery.phone) {
                deliveryRows += renderCopyableRow('📞', 'رقم الهاتف', delivery.phone);
            }
            if (delivery.url) {
                deliveryRows += renderCopyableRow('🔗', 'الرابط', delivery.url);
            }
            if (delivery.bundle_name) {
                deliveryRows += `<div class="delivery-row-info"><span class="dl">📦 الباقة</span><strong>${escapeHtml(delivery.bundle_name)}</strong></div>`;
            }
            if (delivery.syp_amount) {
                deliveryRows += `<div class="delivery-row-info"><span class="dl">💵 المبلغ</span><strong>${delivery.syp_amount.toLocaleString('ar')} ل.س</strong></div>`;
            }
            if (delivery.syp_rate) {
                deliveryRows += `<div class="delivery-row-info"><span class="dl">📊 سعر الصرف</span><strong>${escapeHtml(delivery.syp_rate)} ل.س/$</strong></div>`;
            }

            const isFinal = ['completed', 'cancelled', 'failed'].includes(order.status);

            const actionsHtml = !isFinal ? `
                <div class="order-detail-actions-v17">
                    <button class="btn btn-success btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'completed')">
                        <span class="material-icons">check_circle</span> إكمال مباشر
                    </button>
                    <button class="btn btn-danger btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'failed')">
                        <span class="material-icons">close</span> فشل
                    </button>
                    <button class="btn btn-outline btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'cancelled')">
                        <span class="material-icons">block</span> إلغاء
                    </button>
                </div>
            ` : `
                <div class="order-final-banner">
                    ✋ حالة الطلب نهائية — موجود في الأرشيف
                </div>
            `;

            window.openBottomSheet('📋 تفاصيل الطلب', `
                <div class="order-detail-v17">
                    <div class="order-dark-header">
                        <div class="order-dark-number" onclick="copyToClipboard('${escapeAttr(order.order_number)}')">
                            ${escapeHtml(order.order_number)}
                            <span class="material-icons" style="font-size:14px;vertical-align:middle;margin-inline-start:6px;opacity:.6;">content_copy</span>
                        </div>
                        <span class="badge-status ${escapeAttr(order.status)}">${escapeHtml(order.status_arabic)}</span>
                    </div>

                    <div class="order-dark-section">
                        <div class="section-mini-title">
                            <span class="material-icons">person</span>
                            العميل
                        </div>
                        <div class="order-user-line">
                            <strong>${escapeHtml((order.user && (order.user.first_name || order.user.username)) || 'مستخدم')}</strong>
                            <span class="copy-id-inline" onclick="copyToClipboard('${escapeAttr(order.user ? order.user.telegram_id : '')}')">
                                #${escapeHtml(order.user ? order.user.telegram_id : '')}
                                <span class="material-icons" style="font-size:12px;">content_copy</span>
                            </span>
                        </div>
                        <div class="order-balance-line">
                            💰 رصيد العميل: <strong style="color:${order.user && order.user.balance < 0 ? '#F87171' : '#4ADE80'};">
                                ${(order.user && order.user.balance !== null && order.user.balance !== undefined) ? order.user.balance.toFixed(2) : '0.00'}$
                            </strong>
                        </div>
                    </div>

                    <div class="order-dark-section">
                        <div class="section-mini-title">
                            <span class="material-icons">inventory_2</span>
                            المنتج
                        </div>
                        ${order.product && order.product.image ? `<img src="${escapeAttr(order.product.image)}" class="product-thumb-dark" alt="">` : ''}
                        <div class="order-product-line"><strong>${escapeHtml(order.product ? order.product.name : '-')}</strong></div>
                        <div class="order-qty-line">
                            الكمية: <strong>${order.quantity.toLocaleString('ar')} ${escapeHtml((order.product && order.product.unit_name) || 'قطعة')}</strong>
                        </div>
                    </div>

                    ${deliveryRows ? `
                    <div class="order-dark-section highlight-dark">
                        <div class="section-mini-title">
                            <span class="material-icons">vpn_key</span>
                            بيانات التسليم
                        </div>
                        ${deliveryRows}
                    </div>
                    ` : ''}

                    <div class="order-dark-section">
                        <div class="section-mini-title">
                            <span class="material-icons">receipt</span>
                            الفاتورة
                        </div>
                        ${order.discount_amount > 0 ? `
                            <div class="order-total-line">
                                <span>الخصم:</span>
                                <strong style="color:#FBBF24;">-${order.discount_amount.toFixed(2)}$</strong>
                            </div>
                        ` : ''}
                        ${order.coupon_code ? `
                            <div class="order-total-line">
                                <span>الكوبون:</span>
                                <strong>${escapeHtml(order.coupon_code)}</strong>
                            </div>
                        ` : ''}
                        <div class="order-total-line main">
                            <span>الإجمالي:</span>
                            <strong class="order-total-amount">${order.total_price.toFixed(2)}$</strong>
                        </div>
                    </div>

                    ${actionsHtml}
                </div>
            `);
        } catch (err) {
            window.showToast(`فشل التحميل: ${err.message}`, 'error');
        }
    };

    function renderCopyableRow(emoji, label, value) {
        const valueStr = String(value);
        const escapedValue = escapeHtml(valueStr);
        const escapedForAttr = escapeAttr(valueStr);
        return `
            <div class="delivery-field">
                <div class="delivery-field-label">${emoji} ${label}</div>
                <div class="delivery-field-value-wrap">
                    <div class="delivery-field-value" title="${escapedForAttr}">${escapedValue}</div>
                    <button class="delivery-copy-btn" onclick="copyToClipboard('${escapedForAttr}')" title="نسخ">
                        <span class="material-icons">content_copy</span>
                    </button>
                </div>
            </div>
        `;
    }

    /* ============================================================
       Quick Approve Order
       ============================================================ */
    window.quickApproveOrder = async function (orderId, newStatus) {
        const labels = {
            review: 'مراجعة',
            processing: 'بدء تنفيذ',
            completed: 'إكمال مباشر',
            failed: 'فشل',
            cancelled: 'إلغاء'
        };

        const confirmed = await window.showConfirm({
            title: 'تأكيد الإجراء',
            message: `هل تريد تغيير حالة الطلب إلى "${labels[newStatus] || newStatus}"؟`,
            confirmText: labels[newStatus] || 'تأكيد',
            type: (newStatus === 'failed' || newStatus === 'cancelled') ? 'danger' : 'primary'
        });

        if (!confirmed) return;

        try {
            await window.updateOrderStatus(orderId, newStatus);
            const archived = ['completed', 'failed', 'cancelled'].includes(newStatus);
            window.showToast(
                archived
                    ? `✅ ${labels[newStatus]} — نُقل إلى الأرشيف`
                    : `✅ ${labels[newStatus]} بنجاح`,
                'success'
            );

            if (typeof window.loadAllData === 'function') {
                await window.loadAllData();
            }
            if (typeof window.renderOrders === 'function') {
                window.renderOrders(window.filteredOrders || window.ordersData || []);
            }
            if (typeof window.updateNavBadges === 'function') {
                window.updateNavBadges();
            }
            if (typeof window.updateArchiveBadges === 'function') {
                window.updateArchiveBadges();
            }
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    /* ============================================================
       Swipe
       ============================================================ */
    function attachSwipeHandlers() {
        const cards = document.querySelectorAll('.card-item[data-swipeable="true"]');
        cards.forEach(card => {
            if (card.dataset.swipeAttached === '1') return;
            card.dataset.swipeAttached = '1';

            let startX = 0;
            let startY = 0;
            let currentX = 0;
            let isTracking = false;
            let isHorizontal = null;

            card.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1) return;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                currentX = startX;
                isTracking = true;
                isHorizontal = null;
                card.style.transition = 'none';
            }, { passive: true });

            card.addEventListener('touchmove', (e) => {
                if (!isTracking) return;
                currentX = e.touches[0].clientX;
                const deltaX = currentX - startX;
                const deltaY = e.touches[0].clientY - startY;

                if (isHorizontal === null) {
                    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 8) {
                        isHorizontal = true;
                    } else if (Math.abs(deltaY) > 8) {
                        isHorizontal = false;
                        isTracking = false;
                        card.style.transition = '';
                        return;
                    }
                }

                if (isHorizontal) {
                    e.preventDefault();
                    const limitedDelta = Math.max(-100, Math.min(100, deltaX));
                    card.style.transform = `translateX(${limitedDelta}px)`;
                    card.style.opacity = String(1 - Math.abs(limitedDelta) / 200);
                }
            }, { passive: false });

            card.addEventListener('touchend', () => {
                if (!isTracking) return;
                const deltaX = currentX - startX;
                card.style.transition = 'transform 200ms ease, opacity 200ms ease';
                card.style.transform = '';
                card.style.opacity = '';

                if (isHorizontal && Math.abs(deltaX) > 60) {
                    const orderId = card.dataset.orderId;
                    if (orderId) {
                        if (deltaX > 60) {
                            window.quickApproveOrder(parseInt(orderId), 'completed');
                        } else {
                            window.viewOrderDetails(parseInt(orderId));
                        }
                    }
                }

                isTracking = false;
                isHorizontal = null;
            });
        });
    }

    if (window.MutationObserver) {
        const observer = new MutationObserver(() => {
            attachSwipeHandlers();
        });
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    /* ============================================================
       Archive System
       ============================================================ */
    let archiveTab = 'orders';
    let archiveData = { orders: [], deposits: [], kyc: [], services: [] };
    let archiveCounts = { orders: 0, deposits: 0, kyc: 0, services: 0 };

    window.setArchiveTab = function (tab, btn) {
        archiveTab = tab;
        document.querySelectorAll('#archiveTabs .tab').forEach(t => t.classList.remove('active'));
        if (btn) btn.classList.add('active');
        renderArchiveList();
    };

    window.loadArchiveData = async function () {
        const container = document.getElementById('archiveList');
        if (container) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">hourglass_empty</span></div>
                    <h3>جارٍ التحميل...</h3>
                </div>
            `;
        }

        try {
            const [orders, deposits, kyc, services, counts] = await Promise.all([
                window.fetchArchivedOrders().catch(() => []),
                window.fetchArchivedDeposits().catch(() => []),
                window.fetchArchivedKYC().catch(() => []),
                window.fetchArchivedServices().catch(() => []),
                window.fetchArchiveCounts().catch(() => ({ orders: 0, deposits: 0, kyc: 0, services: 0 }))
            ]);

            archiveData = { orders, deposits, kyc, services };
            archiveCounts = counts || { orders: 0, deposits: 0, kyc: 0, services: 0 };

            const upd = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.textContent = val || 0;
            };

            upd('archiveTabOrdersCount', archiveCounts.orders);
            upd('archiveTabDepositsCount', archiveCounts.deposits);
            upd('archiveTabKycCount', archiveCounts.kyc);
            upd('archiveTabServicesCount', archiveCounts.services);

            renderArchiveList();
        } catch (err) {
            if (container) {
                container.innerHTML = `
                    <div class="empty">
                        <div class="empty-icon"><span class="material-icons">error</span></div>
                        <h3>فشل التحميل</h3>
                        <p>${escapeHtml(err.message)}</p>
                    </div>
                `;
            }
        }
    };

    window.filterArchiveItems = function () {
        renderArchiveList();
    };

    function renderArchiveList() {
        const container = document.getElementById('archiveList');
        if (!container) return;

        const searchQuery = (document.getElementById('archiveSearch')?.value || '').toLowerCase().trim();
        const items = archiveData[archiveTab] || [];

        let filtered = items;
        if (searchQuery) {
            filtered = items.filter(item => {
                const searchStr = [
                    item.order_number,
                    item.transaction_id,
                    item.full_name,
                    item.phone,
                    item.service_name,
                    item.user_telegram,
                    item.user_name,
                    item.product_name
                ].filter(Boolean).join(' ').toLowerCase();
                return searchStr.includes(searchQuery);
            });
        }

        if (!filtered.length) {
            container.innerHTML = `
                <div class="empty">
                    <div class="empty-icon"><span class="material-icons">inventory_2</span></div>
                    <h3>لا توجد عناصر مؤرشفة</h3>
                    <p>العناصر المكتملة والملغية والمرفوضة تظهر هنا تلقائياً.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(item => renderArchiveCard(item)).join('');
        attachSwipeHandlers();
    }
function getStatusArabic(status) {
        const map = {
            pending: 'قيد المعالجة',
            review: 'قيد المراجعة',
            processing: 'قيد التنفيذ',
            completed: 'مكتمل',
            failed: 'فشل',
            cancelled: 'ملغي',
            approved: 'مقبول',
            rejected: 'مرفوض'
        };
        return map[status] || status;
    }

    function renderArchiveCard(item) {
        if (archiveTab === 'orders') {
            return `
                <div class="card-item" data-status="${escapeAttr(item.status)}">
                    <div class="card-top">
                        <div class="card-id">${escapeHtml(item.order_number)}</div>
                        <span class="badge-status ${escapeAttr(item.status)}">${getStatusArabic(item.status)}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span>${escapeHtml(item.user_name || 'مستخدم')} <span class="card-user-id">#${escapeHtml(item.user_telegram || item.user_id)}</span></div>
                        <div class="card-row"><span class="material-icons">inventory_2</span>${escapeHtml(item.product_name)}</div>
                        <div class="card-row"><span class="material-icons">schedule</span>${item.created_at ? new Date(item.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-price ltr">${item.total_price.toFixed(2)}$</div>
                        <div class="card-actions">
                            <button class="card-action restore" onclick="restoreArchivedOrder(${item.id})">
                                <span class="material-icons">undo</span> استرجاع
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (archiveTab === 'deposits') {
            return `
                <div class="card-item" data-status="${escapeAttr(item.status)}">
                    <div class="card-top">
                        <div class="card-id">${escapeHtml(item.transaction_id)}</div>
                        <span class="badge-status ${escapeAttr(item.status)}">${item.status === 'approved' ? 'مقبول' : 'مرفوض'}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span>${escapeHtml(item.user_name || 'مستخدم')} <span class="card-user-id">#${escapeHtml(item.user_telegram || item.user_id)}</span></div>
                        <div class="card-row"><span class="material-icons">credit_card</span>${escapeHtml(item.method || '-')}</div>
                        <div class="card-row"><span class="material-icons">schedule</span>${item.created_at ? new Date(item.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-price ltr">$${item.amount.toFixed(2)}</div>
                        <div class="card-actions">
                            <button class="card-action restore" onclick="restoreArchivedDeposit(${item.id})">
                                <span class="material-icons">undo</span> استرجاع
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (archiveTab === 'kyc') {
            return `
                <div class="card-item" data-status="${escapeAttr(item.status)}">
                    <div class="card-top">
                        <div class="card-id">#${escapeHtml(item.user_id)}</div>
                        <span class="badge-status ${escapeAttr(item.status)}">${item.status === 'approved' ? 'مقبول' : 'مرفوض'}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span><strong>${escapeHtml(item.full_name)}</strong></div>
                        <div class="card-row"><span class="material-icons">phone</span>${escapeHtml(item.phone)}</div>
                        <div class="card-row"><span class="material-icons">schedule</span>${item.submitted_at ? new Date(item.submitted_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-actions" style="margin-inline-start:auto;">
                            <button class="card-action restore" onclick="restoreArchivedKYC(${item.id})">
                                <span class="material-icons">undo</span> استرجاع
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        if (archiveTab === 'services') {
            const statusText = item.status === 'completed' ? 'مكتمل' :
                              item.status === 'rejected' ? 'مرفوض' : 'ملغي';
            return `
                <div class="card-item" data-status="${escapeAttr(item.status)}">
                    <div class="card-top">
                        <div class="card-id">#${escapeHtml(item.id)}</div>
                        <span class="badge-status ${escapeAttr(item.status)}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">handyman</span><strong>${escapeHtml(item.service_name)}</strong></div>
                        <div class="card-row"><span class="material-icons">description</span>${escapeHtml(item.description || '-')}</div>
                        <div class="card-row"><span class="material-icons">schedule</span>${item.created_at ? new Date(item.created_at).toLocaleString('ar') : ''}</div>
                    </div>
                    <div class="card-footer">
                        <div class="card-actions" style="margin-inline-start:auto;">
                            <button class="card-action restore" onclick="restoreArchivedService(${item.id})">
                                <span class="material-icons">undo</span> استرجاع
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        return '';
    }

    /* ============================================================
       Restore Actions
       ============================================================ */
    window.restoreArchivedOrder = async function (id) {
        const ok = await window.showConfirm({
            title: 'استرجاع الطلب',
            message: 'سيُعاد الطلب إلى القائمة الرئيسية كطلب معلق. متابعة؟',
            confirmText: 'استرجاع'
        });
        if (!ok) return;
        try {
            await window.restoreOrder(id);
            window.showToast('✅ تم الاسترجاع', 'success');
            await window.loadArchiveData();
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.restoreArchivedDeposit = async function (id) {
        const ok = await window.showConfirm({
            title: 'استرجاع الإيداع',
            message: 'سيُعاد الإيداع للحالة المعلقة. متابعة؟',
            confirmText: 'استرجاع'
        });
        if (!ok) return;
        try {
            await window.restoreDeposit(id);
            window.showToast('✅ تم الاسترجاع', 'success');
            await window.loadArchiveData();
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.restoreArchivedKYC = async function (id) {
        const ok = await window.showConfirm({
            title: 'استرجاع طلب التوثيق',
            message: 'سيُعاد الطلب للحالة المعلقة. متابعة؟',
            confirmText: 'استرجاع'
        });
        if (!ok) return;
        try {
            await window.restoreKYC(id);
            window.showToast('✅ تم الاسترجاع', 'success');
            await window.loadArchiveData();
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.restoreArchivedService = async function (id) {
        const ok = await window.showConfirm({
            title: 'استرجاع طلب الخدمة',
            message: 'سيُعاد الطلب للحالة المعلقة. متابعة؟',
            confirmText: 'استرجاع'
        });
        if (!ok) return;
        try {
            await window.restoreService(id);
            window.showToast('✅ تم الاسترجاع', 'success');
            await window.loadArchiveData();
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    /* ============================================================
       Archive Badge
       ============================================================ */
    window.updateArchiveBadges = async function () {
        try {
            const counts = await window.fetchArchiveCounts();
            const total = (counts.orders || 0) + (counts.deposits || 0) + (counts.kyc || 0) + (counts.services || 0);
            const el = document.getElementById('badge-archive-total');
            if (el) {
                if (total > 0) {
                    el.textContent = total > 99 ? '99+' : total;
                    el.style.display = 'inline-flex';
                } else {
                    el.style.display = 'none';
                }
            }
        } catch (err) { /* ignore */ }
    };

    /* ============================================================
       Quick Actions FAB
       ============================================================ */
    window.openQuickActions = function () {
        window.openBottomSheet('إجراء سريع', `
            <button class="sheet-action primary" onclick="closeBottomSheet(); switchSection('orders')">
                <span class="material-icons">receipt_long</span>
                <span>عرض الطلبات</span>
            </button>
            <button class="sheet-action warning" onclick="closeBottomSheet(); switchSection('deposits')">
                <span class="material-icons">account_balance_wallet</span>
                <span>عرض الإيداعات</span>
            </button>
            <button class="sheet-action primary" onclick="closeBottomSheet(); switchSection('kyc')">
                <span class="material-icons">verified_user</span>
                <span>طلبات التوثيق</span>
            </button>
            <button class="sheet-action" onclick="closeBottomSheet(); switchSection('archive')">
                <span class="material-icons">inventory_2</span>
                <span>الأرشيف</span>
            </button>
            <button class="sheet-action primary" onclick="closeBottomSheet(); switchSection('notifications')">
                <span class="material-icons">send</span>
                <span>إرسال إشعار</span>
            </button>
        `);
    };

    /* ============================================================
       Wrap loadAllData
       ============================================================ */
    const origLoadAllData = window.loadAllData;
    if (typeof origLoadAllData === 'function') {
        window.loadAllData = async function () {
            const result = await origLoadAllData.apply(this, arguments);

            try {
                if (typeof kycData !== 'undefined' && Array.isArray(kycData)) {
                    window.renderKYC();
                }
                if (typeof depositsData !== 'undefined' && Array.isArray(depositsData)) {
                    window.renderDeposits(depositsData);
                }
                if (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData)) {
                    window.renderServiceRequests();
                }
                if (typeof ordersData !== 'undefined' && Array.isArray(ordersData)) {
                    window.renderOrders(window.filteredOrders || ordersData);
                }
                if (typeof usersData !== 'undefined' && Array.isArray(usersData)) {
                    window.renderUsers();
                }
            } catch (e) {
                console.warn('Re-render after load failed:', e);
            }

            window.updateArchiveBadges();
            return result;
        };
    }

    /* ============================================================
       Wrap switchSection
       ============================================================ */
    const origSwitchSection = window.switchSection;
    if (typeof origSwitchSection === 'function') {
        window.switchSection = function (section) {
            origSwitchSection(section);

            window.closeSidebar();

            try {
                if (section === 'dashboard' && typeof window.renderDashboard === 'function') {
                    window.renderDashboard();
                }
                if (section === 'orders' && typeof window.renderOrders === 'function') {
                    window.renderOrders(window.filteredOrders || ordersData || []);
                }
                if (section === 'deposits' && typeof window.renderDeposits === 'function') {
                    window.renderDeposits(depositsData || []);
                }
                if (section === 'kyc' && typeof window.renderKYC === 'function') {
                    window.renderKYC();
                }
                if (section === 'service-requests' && typeof window.renderServiceRequests === 'function') {
                    window.renderServiceRequests();
                }
                if (section === 'users' && typeof window.renderUsers === 'function') {
                    window.renderUsers();
                }
                if (section === 'archive' && typeof window.loadArchiveData === 'function') {
                    window.loadArchiveData();
                }
            } catch (e) {
                console.warn('Section re-render failed:', e);
            }

            if (section === 'dashboard') {
                updateGreeting();
            }
        };
    }

    /* ============================================================
       Legacy Modal Overrides
       ============================================================ */
    window.openModal = function(title, bodyHTML) {
        window.openBottomSheet(title || 'تفاصيل', bodyHTML || '');
    };

    window.closeModal = function() {
        window.closeBottomSheet();
    };

    window.viewKYCImage = function(kycId) {
        const kyc = (typeof kycData !== 'undefined' && Array.isArray(kycData))
            ? kycData.find(k => k.id === kycId)
            : null;

        if (!kyc) {
            window.showToast('الطلب غير موجود', 'error');
            return;
        }

        const statusText = kyc.status === 'approved' ? 'مقبول'
                         : kyc.status === 'rejected' ? 'مرفوض'
                         : 'معلق';

        const selfieSrc = kyc.selfie_image ? escapeAttr(kyc.selfie_image) : '';

        const bodyHtml = `
            <div style="text-align:right;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
                    <div class="card-id">#${escapeHtml(kyc.user_id)}</div>
                    <span class="badge-status ${escapeAttr(kyc.status)}">${statusText}</span>
                </div>

                <div style="background:var(--surface-2);padding:14px;border-radius:12px;margin-bottom:16px;">
                    <div class="card-row"><span class="material-icons">person</span><strong>${escapeHtml(kyc.full_name || '-')}</strong></div>
                    <div class="card-row"><span class="material-icons">phone</span><span class="ltr">${escapeHtml(kyc.phone || '-')}</span></div>
                    ${kyc.address ? `<div class="card-row"><span class="material-icons">location_on</span><span>${escapeHtml(kyc.address)}</span></div>` : ''}
                    <div class="card-row"><span class="material-icons">schedule</span><span>${kyc.submitted_at ? new Date(kyc.submitted_at).toLocaleString('ar') : ''}</span></div>
                </div>

                ${kyc.selfie_image ? `
                    <div style="margin-bottom:12px;">
                        <div style="font-weight:700;margin-bottom:8px;color:var(--text-2);font-size:13px;">صورة السيلفي:</div>
                        <div style="border-radius:12px;overflow:hidden;border:2px solid var(--border);max-height:400px;background:var(--surface-2);">
                            <img src="${selfieSrc}"
                                 onclick="openImageLightbox('${selfieSrc}')"
                                 style="width:100%;height:auto;max-height:400px;object-fit:contain;cursor:zoom-in;display:block;"
                                 alt="KYC Selfie">
                        </div>
                    </div>
                ` : `<div style="text-align:center;padding:20px;color:var(--text-3);font-size:13px;">لا توجد صورة</div>`}

                ${kyc.status === 'pending' ? `
                    <div style="display:flex;gap:8px;margin-top:16px;">
                        <button class="btn btn-success btn-block" onclick="closeBottomSheet(); window.handleApproveKYC(${kyc.id})">
                            <span class="material-icons">check</span> قبول
                        </button>
                        <button class="btn btn-danger btn-block" onclick="closeBottomSheet(); window.handleRejectKYC(${kyc.id})">
                            <span class="material-icons">close</span> رفض
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        window.openBottomSheet('تفاصيل طلب التوثيق', bodyHtml);
    };

    window.viewServiceRequest = function(reqId) {
        const data = (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData))
            ? serviceRequestsData
            : [];
        const r = data.find(x => x.id === reqId);
        if (!r) {
            window.showToast('الطلب غير موجود', 'error');
            return;
        }

        const statusText = r.status === 'completed' ? 'مكتمل'
                         : r.status === 'rejected' ? 'مرفوض'
                         : r.status === 'cancelled' ? 'ملغي'
                         : 'معلق';

        const bodyHtml = `
            <div style="text-align:right;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
                    <div class="card-id">#${escapeHtml(r.user_id)}</div>
                    <span class="badge-status ${escapeAttr(r.status)}">${statusText}</span>
                </div>

                <div style="background:var(--surface-2);padding:14px;border-radius:12px;margin-bottom:16px;">
                    <div class="card-row"><span class="material-icons">handyman</span><strong>${escapeHtml(r.service_name || '-')}</strong></div>
                    ${r.description ? `<div class="card-row"><span class="material-icons">description</span><span>${escapeHtml(r.description)}</span></div>` : ''}
                    ${r.estimated_price ? `<div class="card-row"><span class="material-icons">payments</span><span class="ltr">${escapeHtml(r.estimated_price)}$</span></div>` : ''}
                    <div class="card-row"><span class="material-icons">schedule</span><span>${r.created_at ? new Date(r.created_at).toLocaleString('ar') : ''}</span></div>
                </div>

                ${r.status === 'pending' ? `
                    <div style="display:grid;gap:8px;margin-top:16px;">
                        <button class="btn btn-success btn-block" onclick="closeBottomSheet(); updateServiceStatus(${r.id}, 'completed')">
                            <span class="material-icons">check</span> إكمال
                        </button>
                        <button class="btn btn-danger btn-block" onclick="closeBottomSheet(); updateServiceStatus(${r.id}, 'rejected')">
                            <span class="material-icons">close</span> رفض
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        window.openBottomSheet('تفاصيل طلب الخدمة', bodyHtml);
    };

    window.updateServiceStatus = async function(reqId, status) {
        try {
            await window.updateServiceRequest(reqId, { status });
            window.showToast('✅ تم التحديث', 'success');
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            window.renderServiceRequests();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.handleApproveKYC = async function(kycId) {
        const confirmed = await window.showConfirm({
            title: 'قبول التوثيق',
            message: 'هل أنت متأكد من قبول طلب التوثيق؟',
            confirmText: 'قبول',
            type: 'primary'
        });
        if (!confirmed) return;

        try {
            await window.approveKYCRequest(kycId);
            window.showToast('✅ تم قبول التوثيق — نُقل إلى الأرشيف', 'success');
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            window.renderKYC();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.handleRejectKYC = async function(kycId) {
        const confirmed = await window.showConfirm({
            title: 'رفض التوثيق',
            message: 'هل أنت متأكد من رفض طلب التوثيق؟',
            confirmText: 'رفض',
            type: 'danger'
        });
        if (!confirmed) return;

        try {
            await window.rejectKYCRequest(kycId);
            window.showToast('تم رفض التوثيق — نُقل إلى الأرشيف', 'warning');
            if (typeof window.loadAllData === 'function') await window.loadAllData();
            window.renderKYC();
            if (typeof window.updateArchiveBadges === 'function') window.updateArchiveBadges();
        } catch (err) {
            window.showToast(`فشل: ${err.message}`, 'error');
        }
    };

    window.closeConfirm = function(result) {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.style.display = 'none';
        if (window._confirmResolver) {
            window._confirmResolver(result);
            window._confirmResolver = null;
        }
    };

    /* ============================================================
       Init
       ============================================================ */
    function initV17() {
        updateGreeting();
        window.updateArchiveBadges();
        attachSwipeHandlers();

        setTimeout(() => {
            try {
                if (typeof kycData !== 'undefined' && Array.isArray(kycData)) {
                    window.renderKYC();
                }
                if (typeof depositsData !== 'undefined' && Array.isArray(depositsData)) {
                    window.renderDeposits(depositsData);
                }
                if (typeof serviceRequestsData !== 'undefined' && Array.isArray(serviceRequestsData)) {
                    window.renderServiceRequests();
                }
                if (typeof usersData !== 'undefined' && Array.isArray(usersData)) {
                    window.renderUsers();
                }
            } catch (e) {}
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initV17);
    } else {
        setTimeout(initV17, 100);
    }

    console.log('✅ admin-v16.js loaded — v17.2 XSS Hardened');

})();