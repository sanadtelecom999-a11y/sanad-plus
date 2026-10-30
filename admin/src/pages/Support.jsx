import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../components/ui/Toast';
import Spinner from '../components/ui/Spinner';

export default function Support() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [reply, setReply] = useState('');
  const toast = useToast();

  const loadTickets = async () => {
    setLoading(true);
    try {
      const res = await api.ticketsList();
      setTickets(Array.isArray(res) ? res : res.items || []);
    } catch (err) { toast.error(err.message); } 
    finally { setLoading(false); }
  };

  useEffect(() => { loadTickets(); }, []);

  const openTicket = async (ticket) => {
    setSelected(ticket);
    setLoadingMsgs(true);
    try {
      const res = await api.ticketMessages(ticket.id);
      setMessages(Array.isArray(res) ? res : res.messages || []);
    } catch (err) { toast.error(err.message); } 
    finally { setLoadingMsgs(false); }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    try {
      await api.replyTicket(selected.id, reply.trim());
      setReply('');
      await openTicket(selected); // تحديث الرسائل
      toast.success('تم إرسال الرد');
    } catch (err) { toast.error(err.message); }
  };

  const handleClose = async () => {
    if (!window.confirm('هل أنت متأكد من إغلاق هذه التذكرة؟')) return;
    try {
      await api.closeTicket(selected.id);
      toast.success('تم إغلاق التذكرة');
      setSelected(null);
      loadTickets();
    } catch (err) { toast.error(err.message); }
  };

  if (selected) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
          <div>
            <button onClick={() => setSelected(null)} className="text-muted hover:text-text text-sm mb-2 block">→ رجوع للتذاكر</button>
            <h2 className="text-xl font-bold">تذكرة #{selected.id} - {selected.user_name}</h2>
          </div>
          <button onClick={handleClose} className="px-4 py-2 bg-danger/20 text-danger rounded hover:bg-danger hover:text-bg transition-colors">إغلاق التذكرة</button>
        </div>
        
        <div className="flex-1 overflow-y-auto mb-4 space-y-4">
          {loadingMsgs ? <div className="flex justify-center p-4"><Spinner size={30} /></div> : 
            messages.map((m, i) => (
              <div key={i} className={`p-3 rounded-lg max-w-[80%] ${m.is_admin ? 'bg-primary/20 ml-auto' : 'bg-surface-light mr-auto'}`}>
                <div className="text-xs text-muted mb-1">{m.is_admin ? 'الإدارة' : m.user_name}</div>
                <div>{m.text || m.message}</div>
              </div>
            ))
          }
        </div>

        <div className="flex gap-2">
          <input type="text" value={reply} onChange={e => setReply(e.target.value)} placeholder="اكتب ردك هنا..." className="input-field flex-1" />
          <button onClick={handleReply} className="btn-primary">إرسال</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <h1 className="text-2xl font-bold mb-6">تذاكر الدعم</h1>
      {loading ? <div className="flex justify-center p-10"><Spinner size={40} /></div> : 
       tickets.length === 0 ? <div className="text-center p-10 text-muted">لا توجد تذاكر حالياً</div> :
       <div className="space-y-2">
         {tickets.map(t => (
           <div key={t.id} onClick={() => openTicket(t)} className="p-4 border border-border rounded-lg cursor-pointer hover:bg-surface-light transition-colors">
             <div className="flex justify-between font-bold mb-1"><span>#{t.id} - {t.user_name}</span> <span className="text-muted text-sm">{t.status}</span></div>
             <div className="text-sm text-muted truncate">{t.last_message || 'لا توجد رسائل'}</div>
           </div>
         ))}
       </div>
      }
    </div>
  );
}
