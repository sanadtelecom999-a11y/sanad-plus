import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import Spinner from '../components/ui/Spinner';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.usersList();
      setUsers(Array.isArray(res) ? res : res.items || []);
    } catch (err) { toast.error(err.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleBalance = async (user) => {
    const amount = prompt(`أدخل المبلغ المراد إضافته أو خصمه للمستخدم ${user.first_name} (مثال: 10 أو -5):`);
    if (!amount || isNaN(amount)) return;
    try {
      // نستخدم الدالة العشوائية لإنشاء idempotency_key
      const key = Math.random().toString(36).substring(2, 15);
      await api.adjustBalance(user.id, parseFloat(amount), key);
      toast.success('تم تعديل الرصيد بنجاح');
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const handleBan = async (user) => {
    if (!window.confirm(`هل أنت متأكد من ${user.is_banned ? 'إلغاء حظر' : 'حظر'} المستخدم ${user.first_name}؟`)) return;
    try {
      await api.banUser(user.id, !user.is_banned);
      toast.success(user.is_banned ? 'تم إلغاء الحظر' : 'تم حظر المستخدم');
      loadData();
    } catch (err) { toast.error(err.message); }
  };

  const filteredUsers = users.filter(u => 
    String(u.telegram_id).includes(search) || (u.first_name && u.first_name.includes(search))
  );

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">المستخدمون</h1>
        <input 
          type="text" 
          placeholder="بحث بالاسم أو ID..." 
          className="input-field max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-10"><Spinner size={40} /></div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center p-10 text-muted">لا يوجد مستخدمون مطابقون</div>
      ) : (
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-border text-muted text-sm">
              <th className="p-3">ID</th>
              <th className="p-3">تيليجرام ID</th>
              <th className="p-3">الاسم</th>
              <th className="p-3">الرصيد</th>
              <th className="p-3">الحالة</th>
              <th className="p-3">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b border-border/50 hover:bg-surface-light">
                <td className="p-3">#{user.id}</td>
                <td className="p-3 font-mono">{user.telegram_id}</td>
                <td className="p-3">{user.first_name}</td>
                <td className="p-3 font-bold text-accent">{user.balance} ل.س</td>
                <td className="p-3">
                  {user.is_banned 
                    ? <span className="text-danger text-sm bg-danger/20 px-2 py-1 rounded">محظور</span>
                    : <span className="text-success text-sm bg-success/20 px-2 py-1 rounded">نشط</span>}
                </td>
                <td className="p-3 flex gap-2">
                  <button onClick={() => handleBalance(user)} className="px-3 py-1 bg-primary/20 text-primary rounded hover:bg-primary hover:text-bg transition-colors">تعديل الرصيد</button>
                  <button onClick={() => handleBan(user)} className="px-3 py-1 bg-danger/20 text-danger rounded hover:bg-danger hover:text-bg transition-colors">
                    {user.is_banned ? 'إلغاء الحظر' : 'حظر'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
