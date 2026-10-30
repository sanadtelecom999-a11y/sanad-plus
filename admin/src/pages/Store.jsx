import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import Spinner from '../components/ui/Spinner';

export default function Store() {
  const [activeTab, setActiveTab] = useState('products');
  const [data, setData] = useState({ products: [], categories: [], methods: [] });
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [p, c, m] = await Promise.all([
          api.productsList().catch(() => ({items: []})),
          api.categoriesList().catch(() => []),
          api.paymentMethodsList().catch(() => [])
        ]);
        setData({
          products: Array.isArray(p) ? p : p.items || [],
          categories: Array.isArray(c) ? c : [],
          methods: Array.isArray(m) ? m : []
        });
      } catch (err) { toast.error(err.message); } 
      finally { setLoading(false); }
    };
    loadAll();
  }, []);

  const renderContent = () => {
    if (loading) return <div className="flex justify-center p-10"><Spinner size={40} /></div>;
    const items = data[activeTab];
    if (items.length === 0) return <div className="text-center p-10 text-muted">لا توجد بيانات</div>;

    return (
      <table className="w-full text-right border-collapse">
        <thead>
          <tr className="border-b border-border text-muted text-sm">
            <th className="p-3">ID</th>
            <th className="p-3">الاسم</th>
            {activeTab === 'products' && <th className="p-3">السعر</th>}
            {activeTab === 'methods' && <th className="p-3">الحساب</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className="border-b border-border/50">
              <td className="p-3">#{item.id}</td>
              <td className="p-3">{item.name}</td>
              {activeTab === 'products' && <td className="p-3 text-accent">{item.price}</td>}
              {activeTab === 'methods' && <td className="p-3 font-mono">{item.account}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="bg-warning/10 border border-warning/20 text-warning p-3 rounded-lg mb-6 text-sm">
        ⚠️ هذا القسم للعرض فقط حالياً. إضافة وتعديل المنتجات يتطلب تفعيل مسارات API جديدة في الخادم.
      </div>
      <h1 className="text-2xl font-bold mb-6">المتجر والمنتجات</h1>
      <div className="flex gap-4 border-b border-border mb-4">
        {['products', 'categories', 'methods'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 px-4 font-semibold ${activeTab === tab ? 'text-primary border-b-2 border-primary' : 'text-muted'}`}>
            {tab === 'products' ? 'المنتجات' : tab === 'categories' ? 'التصنيفات' : 'طرق الدفع'}
          </button>
        ))}
      </div>
      {renderContent()}
    </div>
  );
}
