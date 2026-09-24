/* ============================================================
   admin-v16.js — Mobile-First + Archive + Render Overrides
   ============================================================
   يُحمّل بعد admin.js (يستبدل الدوال التي تكتب في عناصر v14)
   ============================================================ */
(function () {
    'use strict';

    const OWNER_NAME = 'أبو سند';

    /* ============================================================
       0. OVERRIDE: Render Functions — تكتب في عناصر v16
       ============================================================ */

    /* ------------------------------------------------------------
       0.1 renderKYC → #kycList
       ------------------------------------------------------------ */
    window.renderKYC = function () {
        const container = document.getElementById('kycList');
        if (!container) return;

        const data = (typeof kycData !== 'undefined' && Array.isArray(kycData)) ? kycData : [];

        // فلترة حسب tab (إن وُجد)
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
                <div class="card-item" data-status="${k.status}">
                    <div class="card-top">
                        <div class="card-id" onclick="copyToClipboard('${k.user_id}')">#${k.user_id}</div>
                        <span class="badge-status ${k.status}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">person</span>
                            <strong>${k.full_name || 'غير محدد'}</strong>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">phone</span>
                            <span class="ltr">${k.phone || '-'}</span>
                        </div>
                        ${k.address ? `
                        <div class="card-row">
                            <span class="material-icons">location_on</span>
                            <span>${k.address}</span>
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

    /* ------------------------------------------------------------
       0.2 renderDeposits → #depositsList
       ------------------------------------------------------------ */
    window.renderDeposits = function (deposits) {
        const container = document.getElementById('depositsList');
        if (!container) return;

        const data = Array.isArray(deposits)
            ? deposits
            : (typeof depositsData !== 'undefined' ? depositsData : []);

        // فلترة حسب tab
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
                <div class="card-item" data-status="${d.status}">
                    <div class="card-top">
                        <div class="card-id" onclick="copyToClipboard('${d.transaction_id || ''}')">${d.transaction_id || ''}</div>
                        <span class="badge-status ${d.status}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">person</span>
                            <span>${d.user_name || 'مستخدم'}</span>
                            <span class="card-user-id" onclick="copyToClipboard('${d.user_telegram || d.user_id}')">#${d.user_telegram || d.user_id}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">credit_card</span>
                            <span>${d.method || '-'}</span>
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

    /* ------------------------------------------------------------
       0.3 renderServiceRequests → #servicesList
       ------------------------------------------------------------ */
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
                <div class="card-item" data-status="${r.status}">
                    <div class="card-top">
                        <div class="card-id" onclick="copyToClipboard('${r.user_id}')">#${r.user_id}</div>
                        <span class="badge-status ${r.status}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">handyman</span>
                            <strong>${r.service_name || '-'}</strong>
                        </div>
                        ${r.description ? `
                        <div class="card-row">
                            <span class="material-icons">description</span>
                            <span>${r.description}</span>
                        </div>
                        ` : ''}
                        ${r.estimated_price ? `
                        <div class="card-row">
                            <span class="material-icons">payments</span>
                            <span>${r.estimated_price}$</span>
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

    /* ------------------------------------------------------------
       0.4 renderOrders → #ordersList (بطاقات v16)
       ------------------------------------------------------------ */
    window.renderOrders = function (orders) {
        const container = document.getElementById('ordersList');
        if (!container) return;

        const data = Array.isArray(orders)
            ? orders
            : (typeof ordersData !== 'undefined' ? ordersData : []);

        // فلترة حسب tab
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
                qtyDisplay = `${(o.quantity || 0).toLocaleString('ar')} ${o.product_unit_name}`;
            } else {
                qtyDisplay = `${(o.quantity || 0).toLocaleString('ar')} قطعة`;
            }

            const isFinal = ['completed', 'cancelled', 'failed'].includes(o.status);

            return `
                <div class="card-item" data-status="${o.status}" data-swipeable="true" data-order-id="${o.id}">
                    <div class="card-top">
                        <label class="order-checkbox-wrap" onclick="event.stopPropagation();" style="display:flex;align-items:center;">
                            <input type="checkbox" class="order-checkbox" ${isChecked ? 'checked' : ''}
                                   onchange="toggleOrderSelection(${o.id}, this.checked)"
                                   style="width:20px;height:20px;accent-color:var(--primary);cursor:pointer;">
                        </label>
                        <div class="card-id" onclick="copyToClipboard('${o.order_number}')" style="flex:1;margin:0 8px;">${o.order_number}</div>
                        <span class="badge-status ${o.status}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row">
                            <span class="material-icons">person</span>
                            <span>${o.user_name || 'مستخدم'}</span>
                            <span class="card-user-id" onclick="copyToClipboard('${o.user_telegram || o.user_id}')">#${o.user_telegram || o.user_id}</span>
                        </div>
                        <div class="card-row">
                            <span class="material-icons">inventory_2</span>
                            <span>${o.product_name || '-'}</span>
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
                            ${!isFinal && o.status === 'pending' ? `
                                <button class="card-action approve" onclick="quickApproveOrder(${o.id}, 'review')">
                                    <span class="material-icons">play_arrow</span> مراجعة
                                </button>
                            ` : ''}
                            ${!isFinal && o.status === 'processing' ? `
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

    /* ------------------------------------------------------------
       0.5 renderDashboard — override (يضمن أن يعمل على v16)
       ------------------------------------------------------------ */
    const _origRenderDashboard = window.renderDashboard;
    window.renderDashboard = function () {
        if (typeof _origRenderDashboard === 'function') {
            try { _origRenderDashboard(); } catch (e) { console.warn('renderDashboard error:', e); }
        }

        // Greeting
        const h = new Date().getHours();
        const greeting = h < 12 ? 'صباح الخير' : 'مساء الخير';
        const el = document.getElementById('dashGreeting');
        if (el) el.textContent = `${greeting}، ${OWNER_NAME} 👋`;

        // Attention Card
        renderAttentionCard();

        // Recent activities
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
                    <div class="card-item" data-status="${o.status}" onclick="viewOrderDetails(${o.id})" style="cursor:pointer;">
                        <div class="card-top">
                            <div class="card-id">${o.order_number}</div>
                            <span class="badge-status ${o.status}">${getStatusArabic(o.status)}</span>
                        </div>
                        <div class="card-body">
                            <div class="card-row">
                                <span class="material-icons">person</span>
                                <span>${o.user_name || 'مستخدم'}</span>
                            </div>
                            <div class="card-row">
                                <span class="material-icons">inventory_2</span>
                                <span>${o.product_name || '-'}</span>
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
       1. Greeting
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

    /* ============================================================
       2. Sidebar
       ============================================================ */
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

    /* ============================================================
       3. Toast
       ============================================================ */
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
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 250);
        }, duration);
    };

    /* ============================================================
       4. Bottom Sheet
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

    /* ============================================================
       5. Confirm
       ============================================================ */
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
                <p style="text-align:center;margin-bottom:20px;color:var(--text-2);font-size:15px;line-height:1.7;white-space:pre-line;">${message}</p>
                <div style="display:flex;gap:8px;">
                    <button class="btn ${btnClass} btn-block" id="__confirmYes">${confirmText}</button>
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
       6. Lightbox
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
       7. Order Details — Bottom Sheet
       ============================================================ */
    window.viewOrderDetails = async function (orderId) {
        try {
            const order = await window.fetchAdminOrderFull(orderId);
            const delivery = order.delivery_data || {};

            let deliveryRows = '';
            if (delivery.player_id) deliveryRows += `<div class="card-row"><span class="material-icons">person_pin</span>ID اللاعب: <strong class="ltr">${delivery.player_id}</strong></div>`;
            if (delivery.account_id) deliveryRows += `<div class="card-row"><span class="material-icons">badge</span>ID الحساب: <strong class="ltr">${delivery.account_id}</strong></div>`;
            if (delivery.phone) deliveryRows += `<div class="card-row"><span class="material-icons">phone</span>الهاتف: <strong class="ltr">${delivery.phone}</strong></div>`;
            if (delivery.bundle_name) deliveryRows += `<div class="card-row"><span class="material-icons">redeem</span>الباقة: <strong>${delivery.bundle_name}</strong></div>`;
            if (delivery.syp_amount) deliveryRows += `<div class="card-row"><span class="material-icons">payments</span>المبلغ: <strong>${delivery.syp_amount.toLocaleString('ar')} ل.س</strong></div>`;

            const isFinal = ['completed', 'cancelled', 'failed'].includes(order.status);

            const actionsHtml = !isFinal ? `
                <div style="display:grid;gap:8px;margin-top:16px;">
                    ${order.status === 'pending' ? `
                        <button class="btn btn-primary btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'review')">
                            <span class="material-icons">visibility</span> مراجعة
                        </button>
                    ` : ''}
                    ${order.status === 'review' ? `
                        <button class="btn btn-primary btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'processing')">
                            <span class="material-icons">play_arrow</span> بدء التنفيذ
                        </button>
                    ` : ''}
                    ${order.status === 'processing' ? `
                        <button class="btn btn-success btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'completed')">
                            <span class="material-icons">check</span> إكمال
                        </button>
                    ` : ''}
                    <button class="btn btn-danger btn-block" onclick="closeBottomSheet(); quickApproveOrder(${orderId}, 'failed')">
                        <span class="material-icons">close</span> فشل
                    </button>
                </div>
            ` : `
                <div style="text-align:center;padding:16px;background:var(--surface-2);border-radius:12px;font-size:13px;color:var(--text-2);margin-top:16px;">
                    حالة الطلب نهائية — موجود في الأرشيف
                </div>
            `;

            window.openBottomSheet('تفاصيل الطلب', `
                <div style="text-align:right;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:8px;">
                        <div class="card-id">${order.order_number}</div>
                        <span class="badge-status ${order.status}">${order.status_arabic}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span>${(order.user && (order.user.first_name || order.user.username)) || 'مستخدم'} <span class="card-user-id">#${order.user ? order.user.telegram_id : ''}</span></div>
                        <div class="card-row"><span class="material-icons">inventory_2</span>${order.product ? order.product.name : '-'}</div>
                        <div class="card-row"><span class="material-icons">shopping_cart</span>الكمية: <strong>${order.quantity} ${(order.product && order.product.unit_name) || 'قطعة'}</strong></div>
                        ${deliveryRows}
                        <div class="card-row" style="border-top:1px solid var(--border);padding-top:10px;margin-top:6px;">
                            <span class="material-icons">payments</span>الإجمالي: <strong class="ltr" style="font-size:18px;color:var(--primary);">${order.total_price.toFixed(2)}$</strong>
                        </div>
                    </div>
                    ${actionsHtml}
                </div>
            `);
        } catch (err) {
            window.showToast(`فشل التحميل: ${err.message}`, 'error');
        }
    };

    /* ============================================================
       8. Quick Approve
       ============================================================ */
    window.quickApproveOrder = async function (orderId, newStatus) {
        const labels = {
            review: 'مراجعة',
            processing: 'بدء تنفيذ',
            completed: 'إكمال',
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
       9. Swipe
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
                            window.quickApproveOrder(parseInt(orderId), 'review');
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
       10. Archive System
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
                        <p>${err.message}</p>
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
                <div class="card-item" data-status="${item.status}">
                    <div class="card-top">
                        <div class="card-id">${item.order_number}</div>
                        <span class="badge-status ${item.status}">${getStatusArabic(item.status)}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span>${item.user_name || 'مستخدم'} <span class="card-user-id">#${item.user_telegram || item.user_id}</span></div>
                        <div class="card-row"><span class="material-icons">inventory_2</span>${item.product_name}</div>
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
                <div class="card-item" data-status="${item.status}">
                    <div class="card-top">
                        <div class="card-id">${item.transaction_id}</div>
                        <span class="badge-status ${item.status}">${item.status === 'approved' ? 'مقبول' : 'مرفوض'}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span>${item.user_name || 'مستخدم'} <span class="card-user-id">#${item.user_telegram || item.user_id}</span></div>
                        <div class="card-row"><span class="material-icons">credit_card</span>${item.method || '-'}</div>
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
                <div class="card-item" data-status="${item.status}">
                    <div class="card-top">
                        <div class="card-id">#${item.user_id}</div>
                        <span class="badge-status ${item.status}">${item.status === 'approved' ? 'مقبول' : 'مرفوض'}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">person</span><strong>${item.full_name}</strong></div>
                        <div class="card-row"><span class="material-icons">phone</span>${item.phone}</div>
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
                <div class="card-item" data-status="${item.status}">
                    <div class="card-top">
                        <div class="card-id">#${item.id}</div>
                        <span class="badge-status ${item.status}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <div class="card-row"><span class="material-icons">handyman</span><strong>${item.service_name}</strong></div>
                        <div class="card-row"><span class="material-icons">description</span>${item.description || '-'}</div>
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
       11. Restore
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
       12. Archive Badge
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
        } catch (err) {
            // ignore
        }
    };

    /* ============================================================
       13. Quick Actions FAB
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
       14. Wrap loadAllData — إعادة رسم بعد كل تحميل
       ============================================================ */
    const origLoadAllData = window.loadAllData;
    if (typeof origLoadAllData === 'function') {
        window.loadAllData = async function () {
            const result = await origLoadAllData.apply(this, arguments);

            // إعادة رسم الأقسام المخفية (في حال كانت مفتوحة)
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
            } catch (e) {
                console.warn('Re-render after load failed:', e);
            }

            window.updateArchiveBadges();
            return result;
        };
    }

    /* ============================================================
       15. Wrap switchSection — إجبار إعادة الرسم عند التنقل
       ============================================================ */
    const origSwitchSection = window.switchSection;
    if (typeof origSwitchSection === 'function') {
        window.switchSection = function (section) {
            origSwitchSection(section);

            window.closeSidebar();

            // إعادة رسم فورية لكل قسم عند التنقل
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
       16. Init
       ============================================================ */
    function initV16() {
        updateGreeting();
        window.updateArchiveBadges();
        attachSwipeHandlers();

        // إعادة رسم KYC/Deposits/Services إذا كانت بيانات موجودة
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
            } catch (e) {}
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initV16);
    } else {
        setTimeout(initV16, 100);
    }

    console.log('✅ admin-v16.js loaded — Full Overrides Active');

})();