import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Spinner from '../components/ui/Spinner';
import { Users, ShoppingCart, CreditCard, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.stats().then(setStats).catch(() => {}); }, []);

  if (!stats) return <div className="flex justify-center p-20"><Spinner size={50} className="text-primary" /></div>;

  const cards = [
    { title: 'إجمالي المستخدمين', value: stats.total_users || 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { title: 'إجمالي الطلبات', value: stats.total_orders || 0, icon: ShoppingCart, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { title: 'الإيداعات المكتملة', value: stats.total_deposits || 0, icon: CreditCard, color: 'text-green-400', bg: 'bg-green-400/10' },
    { title: 'الإيرادات', value: `${stats.revenue || 0} ل.س`, icon: TrendingUp, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">نظرة عامة</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((c, i) => (
          <div key={i} className="card-ios flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${c.bg}`}><c.icon className={c.color} size={28} /></div>
            </div>
            <div>
              <h3 className="text-muted text-sm font-medium mb-1">{c.title}</h3>
              <p className="text-3xl font-extrabold">{c.value}</p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 card-ios">
        <h2 className="text-xl font-bold mb-4">مرحباً بك في لوحة التحكم</h2>
        <p className="text-muted">تم تفعيل نمط iOS والأيقونات الاحترافية. يمكنك الآن إدارة المهام من القائمة الجانبية.</p>
      </div>
    </div>
  );
}
