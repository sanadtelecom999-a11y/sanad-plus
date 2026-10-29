export function renderReferral() {
  const container = document.getElementById('page-referral');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
      <button class="back-btn" style="background:none; border:none; color:white; font-size:24px; cursor:pointer;">&rarr;</button>
      <h1 style="font-size:20px; font-weight:800; margin:0;">الإحالة</h1>
    </div>
    
    <div class="sp-card" style="padding:20px; text-align:center; margin-bottom:20px;">
      <h3 style="margin-top:0;">ادعُ أصدقاءك عبر رابطك الشخصي</h3>
      <p style="color:var(--sp-text-muted); font-size:13px; margin-bottom:20px;">سيتم تفعيل نظام المكافآت قريباً</p>
      
      <div style="display:flex; background:var(--sp-bg); border-radius:12px; padding:8px; border:1px solid var(--sp-border); margin-bottom:16px;">
        <input type="text" value="https://t.me/Sa3pls1_bot?start=ref" readonly style="flex:1; background:none; border:none; color:var(--sp-text-muted); padding:8px; outline:none; font-family:monospace; direction:ltr;">
        <button onclick="navigator.clipboard.writeText('https://t.me/Sa3pls1_bot?start=ref'); alert('تم النسخ!');" style="background:var(--sp-primary); color:#000; border:none; border-radius:8px; padding:0 16px; font-weight:bold; cursor:pointer;">نسخ</button>
      </div>
      
      <button style="width:100%; padding:14px; border-radius:12px; border:1px solid var(--sp-primary); background:transparent; color:var(--sp-primary); font-weight:bold; cursor:pointer;" onclick="alert('سيتم تفعيل المشاركة قريباً')">مشاركة الرابط</button>
    </div>
    
    <div class="sp-stats">
      <div class="sp-stat-card"><div class="sp-stat-label">عدد المسجلين</div><div class="sp-stat-value">0</div></div>
      <div class="sp-stat-card"><div class="sp-stat-label">الدعوات المكتملة</div><div class="sp-stat-value">0</div></div>
    </div>
  `;

  container.querySelector('.back-btn').onclick = () => {
    import('../core/router.js').then(m => m.navigateTo('account'));
  };
}
