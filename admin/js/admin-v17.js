/* ============================================================
   admin-v17.js — URL Input Support for Products
   ============================================================
   - Override openProductModal → إضافة خيار "رابط URL"
   - Override openEditProductModal → دعم تعديل منتجات URL
   - Override renderProducts → إظهار نوع URL بشارة
   - يُحمّل بعد admin-v16.js
   ============================================================ */
(function () {
    'use strict';

    /* ============================================================
       1. Helper — قائمة أنواع الحقول (مع URL)
       ============================================================ */
    function getInputTypeOptions(selectedValue) {
        const options = [
            { value: 'id',         label: 'معرف اللاعب (ID)' },
            { value: 'account_id', label: 'ID الحساب' },
            { value: 'phone',      label: 'رقم الهاتف' },
            { value: 'url',        label: '🔗 رابط URL' },
            { value: 'none',       label: 'بدون' }
        ];
        const sel = selectedValue || 'id';
        return options.map(o =>
            `<option value="${o.value}" ${o.value === sel ? 'selected' : ''}>${o.label}</option>`
        ).join('');
    }

    /* ============================================================
       2. Override openProductModal — إضافة منتج مع URL
       ============================================================ */
    window.openProductModal = function () {
        const categoriesData = (typeof window.categoriesData !== 'undefined' && Array.isArray(window.categoriesData))
            ? window.categoriesData
            : (typeof categoriesData !== 'undefined' && Array.isArray(categoriesData) ? categoriesData : []);

        if (typeof window.editingBundles !== 'undefined') {
            window.editingBundles = [];
        }
        if (typeof window.editingProductId !== 'undefined') {
            window.editingProductId = null;
        }

        const categoriesOptions = categoriesData.map(c =>
            `<option value="${c.id}">${c.name}</option>`
        ).join('');

        const body = `
            <h3 style="margin-bottom:14px;">إضافة منتج</h3>

            <div class="form-group"><label>اسم المنتج</label>
                <input type="text" id="productName">
            </div>

            <div class="form-group"><label>القسم</label>
                <select id="productCategoryId">${categoriesOptions}</select>
            </div>

            <div class="form-group">
                <label>النوع</label>
                <select id="productType" onchange="toggleProductTypeFields()">
                    <option value="quantity">كمية</option>
                    <option value="bundle">باقة (PUBG / Free Fire / إلخ)</option>
                    <option value="topup">رصيد سوري (ل.س)</option>
                </select>
            </div>

            <div class="form-group" id="unitNameField" style="display:none;">
                <label>وحدة القياس</label>
                <input type="text" id="productUnitName" value="قطعة" placeholder="مثال: UC، جوهرة، Diamond، متابع">
                <small style="color:var(--text-2);font-size:12px;display:block;margin-top:6px;">
                    💡 يظهر بجانب الكمية
                </small>
            </div>

            <div class="form-group">
                <label id="priceLabel">السعر الأساسي (دولار)</label>
                <input type="number" id="productPrice" value="0" step="0.01">
                <small id="priceHelp" style="color:var(--text-2);font-size:12px;display:none;margin-top:6px;">
                    💡 لمنتج الرصيد السوري: السعر يُحسب من سعر الصرف
                </small>
            </div>

            <div class="form-group" id="quantityField">
                <label>الكمية الأساسية</label>
                <input type="number" id="productQuantity" value="0">
            </div>

            <div class="form-group" id="bundlesField" style="display:none;">
                <label style="display:flex;justify-content:space-between;align-items:center;">
                    <span>🎁 الباقات</span>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addBundleRow('bundlesEditor')" style="font-size:12px;">
                        <span class="material-icons" style="font-size:14px;vertical-align:middle;">add</span> إضافة
                    </button>
                </label>
                <div id="bundlesEditor" class="bundles-editor" style="margin-top:10px;"></div>
            </div>

            <div class="form-group">
                <label id="maxQtyLabel">الحد الأقصى للكمية للطلب الواحد</label>
                <input type="number" id="productMaxQuantity" value="0" min="0" placeholder="0">
                <small style="color:var(--text-2);font-size:12px;display:block;margin-top:6px;">
                    💡 0 = بلا حد أقصى
                </small>
            </div>

            <div class="form-group">
                <label>نوع الحقل المخصص</label>
                <select id="productInputType" onchange="handleInputTypeChange()">
                    ${getInputTypeOptions('id')}
                </select>
                <small id="inputTypeHelp" style="color:var(--text-2);font-size:12px;display:none;margin-top:6px;">
                    💡 للخدمات (متابعين فيسبوك، تيك توك...): اختر "رابط URL" ليُطلب من المستخدم إدخال رابط
                </small>
            </div>

            <div class="form-group">
                <label>صورة المنتج</label>
                <div class="image-preview" id="productImagePreview">لا صورة</div>
                <input type="file" id="productImage" accept="image/*" onchange="previewImage(this,'productImagePreview')">
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button class="btn btn-primary" onclick="saveProduct(this)">حفظ</button>
                <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
            </div>
        `;
        window.openModal('إضافة منتج', body);
    };

    /* ============================================================
       3. Override openEditProductModal — تعديل منتج مع URL
       ============================================================ */
    window.openEditProductModal = function (productId) {
        const productsData = (typeof window.productsData !== 'undefined' && Array.isArray(window.productsData))
            ? window.productsData
            : (typeof productsData !== 'undefined' && Array.isArray(productsData) ? productsData : []);

        const categoriesData = (typeof window.categoriesData !== 'undefined' && Array.isArray(window.categoriesData))
            ? window.categoriesData
            : (typeof categoriesData !== 'undefined' && Array.isArray(categoriesData) ? categoriesData : []);

        const prod = productsData.find(p => p.id === productId);
        if (!prod) {
            window.showToast('المنتج غير موجود', 'error');
            return;
        }

        window.editingProductId = productId;
        window.editingBundles = (prod.bundles || []).map(b => ({
            id: b.id,
            name: b.name,
            quantity: b.quantity,
            price_usd: b.price_usd,
            _new: false,
            _deleted: false,
        }));

        const isTopup = prod.product_type === 'topup';
        const isBundle = prod.product_type === 'bundle';
        const currentInput = prod.input_type || 'id';

        const categoriesOptions = categoriesData.map(c =>
            `<option value="${c.id}" ${c.id === prod.category_id ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        const body = `
            <h3 style="margin-bottom:14px;">تعديل المنتج</h3>

            <div style="background:var(--primary-soft);padding:10px 14px;border-radius:12px;margin-bottom:14px;text-align:center;">
                <div style="font-weight:700;font-size:15px;">${prod.name}</div>
                <div style="color:var(--text-2);font-size:12px;">ID: ${prod.id}</div>
            </div>

            <div class="form-group"><label>اسم المنتج</label>
                <input type="text" id="editProductName" value="${(prod.name || '').replace(/"/g, '&quot;')}">
            </div>

            <div class="form-group"><label>الوصف</label>
                <textarea id="editProductDescription" rows="2">${prod.description || ''}</textarea>
            </div>

            <div class="form-group"><label>القسم</label>
                <select id="editProductCategoryId">${categoriesOptions}</select>
            </div>

            <div class="form-group">
                <label>نوع المنتج</label>
                <select id="editProductType" onchange="toggleEditProductTypeFields()">
                    <option value="quantity" ${prod.product_type === 'quantity' ? 'selected' : ''}>كمية</option>
                    <option value="bundle" ${prod.product_type === 'bundle' ? 'selected' : ''}>باقة</option>
                    <option value="topup" ${prod.product_type === 'topup' ? 'selected' : ''}>رصيد سوري</option>
                </select>
            </div>

            <div class="form-group" id="editUnitNameField" style="${isTopup ? 'display:none;' : 'display:block;'}">
                <label>وحدة القياس</label>
                <input type="text" id="editProductUnitName" value="${(prod.unit_name || 'قطعة').replace(/"/g, '&quot;')}">
            </div>

            <div id="editBundlesField" class="form-group" style="${isBundle ? 'display:block;' : 'display:none;'}">
                <label style="display:flex;justify-content:space-between;align-items:center;">
                    <span>🎁 الباقات</span>
                    <button type="button" class="btn btn-outline btn-sm" onclick="addBundleRow('editBundlesEditor')" style="font-size:12px;">
                        <span class="material-icons" style="font-size:14px;vertical-align:middle;">add</span> إضافة
                    </button>
                </label>
                <div id="editBundlesEditor" class="bundles-editor" style="margin-top:10px;"></div>
            </div>

            <div id="editNonBundleFields" style="${isBundle ? 'display:none;' : 'display:block;'}">
                ${!isTopup ? `
                    <div class="edit-modal-grid">
                        <div class="form-group">
                            <label>السعر الأساسي ($)</label>
                            <input type="number" id="editProductPrice" value="${prod.base_price || 0}" step="0.01" min="0">
                        </div>
                        <div class="form-group">
                            <label>الكمية الأساسية</label>
                            <input type="number" id="editProductQuantity" value="${prod.base_quantity || 0}" min="0">
                        </div>
                    </div>
                ` : `
                    <div class="form-group">
                        <label>السعر بالليرة السورية</label>
                        <input type="number" id="editProductPrice" value="${prod.base_price || 0}" step="1" min="0">
                        <small style="color:var(--warning);font-size:12px;display:block;margin-top:4px;">
                            💡 السعر يُدخل بالليرة السورية
                        </small>
                    </div>
                    <input type="hidden" id="editProductQuantity" value="0">
                `}
            </div>

            <div class="edit-modal-grid">
                <div class="form-group">
                    <label>${isTopup ? 'الحد الأقصى (ل.س)' : 'الحد الأقصى للطلب'}</label>
                    <input type="number" id="editProductMaxQuantity" value="${prod.max_quantity || 0}" min="0">
                    <small style="color:var(--text-2);font-size:11px;display:block;margin-top:4px;">0 = بلا حد</small>
                </div>
                <div class="form-group">
                    <label>المخزون</label>
                    <input type="number" id="editProductStock" value="${prod.stock || 0}" min="0">
                </div>
            </div>

            <div class="form-group">
                <label>نوع الحقل المخصص</label>
                <select id="editProductInputType" onchange="handleEditInputTypeChange()">
                    ${getInputTypeOptions(currentInput)}
                </select>
                <small id="editInputTypeHelp" style="color:var(--text-2);font-size:12px;${currentInput === 'url' ? '' : 'display:none;'}margin-top:6px;">
                    💡 المستخدم سيدخل رابط URL (يبدأ بـ http:// أو https://)
                </small>
            </div>

            <div class="form-group">
                <label>تغيير الصورة (اختياري)</label>
                <div class="image-preview" id="editProductImagePreview">
                    ${prod.image ? `<img src="${prod.image}" alt="${prod.name}">` : 'لا صورة'}
                </div>
                <input type="file" id="editProductImage" accept="image/*" onchange="previewImage(this,'editProductImagePreview')">
            </div>

            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
                <button class="btn btn-primary" onclick="saveEditedProduct(${productId}, this)">حفظ التعديلات</button>
                <button class="btn btn-outline" onclick="closeModal()">إلغاء</button>
            </div>
        `;
        window.openModal('تعديل المنتج', body);

        setTimeout(() => {
            if (isBundle && typeof window.renderBundleEditor === 'function') {
                window.renderBundleEditor('editBundlesEditor');
            }
        }, 100);
    };

    /* ============================================================
       4. Helpers — تغيير نوع الحقل (إظهار/إخفاء التلميح)
       ============================================================ */
    window.handleInputTypeChange = function () {
        const sel = document.getElementById('productInputType');
        const help = document.getElementById('inputTypeHelp');
        if (!sel || !help) return;
        help.style.display = sel.value === 'url' ? 'block' : 'none';
    };

    window.handleEditInputTypeChange = function () {
        const sel = document.getElementById('editProductInputType');
        const help = document.getElementById('editInputTypeHelp');
        if (!sel || !help) return;
        help.style.display = sel.value === 'url' ? 'block' : 'none';
    };

    /* ============================================================
       5. Override renderProducts — إضافة شارة نوع URL
       ============================================================ */
    const _origRenderProducts = window.renderProducts;
    window.renderProducts = function () {
        // استدعاء الدالة الأصلية أولاً
        if (typeof _origRenderProducts === 'function') {
            try { _origRenderProducts(); } catch (e) { console.warn('renderProducts error:', e); }
        }

        // ثم تعديل الـ badges للحقول المخصصة (URL / ID / phone)
        try {
            const tbody = document.getElementById('productsTableBody');
            if (!tbody) return;

            const productsData = (typeof window.productsData !== 'undefined' && Array.isArray(window.productsData))
                ? window.productsData
                : [];
            const filteredProducts = (typeof window.filteredProducts !== 'undefined' && Array.isArray(window.filteredProducts))
                ? window.filteredProducts
                : productsData;
            const products = filteredProducts.length ? filteredProducts : productsData;

            const rows = tbody.querySelectorAll('tr');
            rows.forEach((row, idx) => {
                const prod = products[idx];
                if (!prod) return;

                const nameCell = row.querySelector('td[data-label="الاسم"]');
                if (!nameCell) return;

                // هل يحتوي على badge URL بالفعل؟
                if (nameCell.querySelector('.url-badge')) return;

                if (prod.input_type === 'url') {
                    const badge = document.createElement('span');
                    badge.className = 'url-badge';
                    badge.innerHTML = '<span class="material-icons" style="font-size:12px;vertical-align:middle;">link</span> رابط';
                    badge.style.cssText = 'display:inline-block;margin-inline-start:6px;padding:2px 8px;background:linear-gradient(135deg,#8B5CF6,#A78BFA);color:white;border-radius:50px;font-size:10px;font-weight:800;vertical-align:middle;';
                    nameCell.appendChild(badge);
                }
            });
        } catch (e) {
            // silent
        }
    };

    /* ============================================================
       6. Init Log
       ============================================================ */
    console.log('✅ admin-v17.js loaded — URL input support enabled');

})();