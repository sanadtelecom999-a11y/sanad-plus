import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import Spinner from '../components/ui/Spinner';

export default function Inbox() {
  const [activeTab, setActiveTab] = useState('orders');
  const [data, setData] = useState({ orders: [], deposits: [], kyc: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const toast = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [o, d, k] = await Promise.all([
        api.ordersList().catch(() => []),
        api.depositsList().catch(() => []),
        api.kycList().catch(() => [])
      ]);
      setData({
        orders: Array.isArray(o) ? o : o.items || [],
        deposits: Array.isArray(d) ? d : d.items || [],
        kyc: Array.isArray(k) ? k : k.items || []
      });
    } catch (err) { toast.error(err.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleAction = async (type, id, action) => {
    if (!window.confirm(`هل أنت متأكد من ${action === 'approve' ? 'قبول' : 'رفض'} هذا العنصر؟`)) return;
    setActionLoading(`${type}-${id}-${action}`);
    try {
      await api[action](type, id);
      toast.success(action === 'approve' ? 'تم القبول بنجاح' : 'تم الرفض بنجاح');
      await loadData();
    } catch (err) { toast.error(err.message); } 
    finally { setActionLoading(null); }
  };

  const renderTable = () => {
    const currentData = data[activeTab];
    if (loading) return <div className="flex justify-center p-10"><Spinner size={40} /></div>;
    if (currentData.length === 0) return <div className="text-center p-10 text-muted">لا توجد عناصر قيد الانتظار</div>;

    return (
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="border-b border-border text-muted text-sm">
            <th className="p-3">#</th>
            <th className="p-3">المستخدم / الاسم</th>
            <th className="p-3">التفاصيل / المبلغ</th>
            <th className="p-3">الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {currentData.map((item, idx) => (
            <tr key={idx} className="border-b border-border/50 hover:bg-surface-light">
              <td className="p-3">#{item.id}</td>
              <td className="p-3">{item.user_name || item.full_name || 'غير معروف'}</td>
              <td className="p-3">
                {activeTab === 'orders' && `المنتج: ${item.product_name} | المبلغ: ${item.total_price}`}
                {activeTab === 'deposits' && `المبلغ: ${item.amount} | المرجع: ${item.transaction_id}`}
                {activeTab === 'kyc' && `الهاتف: ${item.phone}`}
              </td>
              <td className="p-3 flex gap-2">
                <button 
                  onClick={() => handleAction(activeTab, item.id, 'approve')} 
                  disabled={actionLoading === `${activeTab}-${item.id}-approve`}
                  className="px-3 py-1 bg-success/20 text-success rounded hover:bg-success hover:text-bg transition-colors"
                >قبول</button>
                <button 
                  onClick={() => handleAction(activeTab, item.id, 'reject')}
                  disabled={actionLoading === `${activeTab}-${item.id}-reject`}
                  className="px-3 py-1 bg-danger/20 text-danger rounded hover:bg-danger hover:text-bg transition-colors"
                >رفض</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">الإرساليات</h1>
        <button onClick={loadData} className="btn-primary py-1 px-4 text-sm">تحديث</button>
      </div>
      
      <div className="flex gap-4 border-b border-border mb-4">
        {['orders', 'deposits', 'kyc'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-4 font-semibold transition-colors ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-text'}`}
          >
            {tab === 'orders' ? 'الطلبات' : tab === 'deposits' ? 'الإيداعات' : 'التوثيق (KYC)'}
          </button>
        ))}
      </div>

      {renderTable()}
    </div>
  );
}
