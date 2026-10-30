import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import Spinner from '../components/ui/Spinner';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.settings().then(setSettings).catch(err => toast.error(err.message));
  }, []);

  if (!settings) return <div className="flex justify-center p-10"><Spinner size={40} /></div>;

  return (
    <div className="bg-surface border border-border rounded-xl p-6 max-w-2xl">
      <div className="bg-warning/10 border border-warning/20 text-warning p-3 rounded-lg mb-6 text-sm">
        ⚠️ حفظ الإعدادات غير مدعوم في الخادم الحالي (يتطلب PUT endpoint).
      </div>
      <h1 className="text-2xl font-bold mb-6">الإعدادات العامة</h1>
      <div className="space-y-4">
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span className="text-muted">اسم المتجر</span>
          <span className="font-bold">{settings.store_name || 'غير محدد'}</span>
        </div>
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span className="text-muted">سعر الصرف</span>
          <span className="font-bold text-primary">{settings.exchange_rate || '1'}</span>
        </div>
        <div className="flex justify-between border-b border-border/50 pb-2">
          <span className="text-muted">وضع الصيانة</span>
          <span className={`font-bold ${settings.maintenance_mode ? 'text-danger' : 'text-success'}`}>
            {settings.maintenance_mode ? 'مفعّل' : 'معطّل'}
          </span>
        </div>
      </div>
    </div>
  );
}
