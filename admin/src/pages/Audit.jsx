import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import Spinner from '../components/ui/Spinner';
import { ShieldCheck, Clock } from 'lucide-react';

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api.auditLogs()
      .then(res => setLogs(Array.isArray(res) ? res : []))
      .catch(err => toast.error(err.message || 'تعذر جلب سجل التدقيق. قد تحتاج لتحديث الخادم.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center p-20"><Spinner size={50} className="text-primary" /></div>;

  return (
    <div className="card-ios">
      <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
        <ShieldCheck className="text-primary" size={28} />
        <h1 className="text-2xl font-bold">سجل التدقيق (Audit Log)</h1>
      </div>
      
      {logs.length === 0 ? (
        <div className="text-center p-10 text-muted">لا توجد سجلات حتى الآن.</div>
      ) : (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className="bg-surface-light/30 border border-white/5 p-4 rounded-xl flex justify-between items-center">
              <div>
                <div className="font-bold text-primary mb-1">{log.action}</div>
                <div className="text-sm text-muted">
                  المسؤول: #{log.admin_id} | الهدف: {log.target_type} #{log.target_id}
                </div>
                {log.details && <div className="text-xs text-muted mt-2">{log.details}</div>}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted bg-black/20 px-3 py-1.5 rounded-lg">
                <Clock size={14} /> {new Date(log.created_at).toLocaleString('ar-SY')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
