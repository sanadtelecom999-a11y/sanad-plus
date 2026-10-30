import { apiFetch } from '../api.js';

export async function renderAudit(container) {
  container.innerHTML = `<div class="card-glass" id="audit-list"><div class="skeleton sk-line"></div></div>`;
  try { 
    const data = await apiFetch('/api/admin/audit-logs'); 
    const logs = Array.isArray(data) ? data : [];
    const list = document.getElementById('audit-list');
    list.innerHTML = logs.length ? '' : '<p style="text-align:center;">لا توجد سجلات</p>';
    logs.forEach(l => { 
      list.innerHTML += `<div style="padding:15px 0;border-bottom:1px solid var(--border-soft);"><div style="display:flex;justify-content:space-between;margin-bottom:5px;"><strong style="color:var(--primary-500);">${l.action}</strong><span style="font-size:12px;color:var(--text-muted);">${new Date(l.created_at).toLocaleString('ar-SY')}</span></div><div style="font-size:13px;">المشرف: ${l.admin_id} | الهدف: ${l.target_type} #${l.target_id}</div></div>`; 
    });
  } catch(e){}
}
