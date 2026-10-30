import { createContext, useContext, useState } from 'react';
const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const show = (message, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };
  return (
    <ToastContext.Provider value={{ success: (m) => show(m, 'success'), error: (m) => show(m, 'error') }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-6 py-3 rounded-lg text-white font-bold shadow-lg ${t.type === 'error' ? 'bg-danger' : 'bg-success'}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);
