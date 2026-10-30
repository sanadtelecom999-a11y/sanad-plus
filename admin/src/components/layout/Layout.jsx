import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { LayoutDashboard, Inbox, Users, LifeBuoy, ShoppingBag, Archive, Settings, LogOut, ShieldAlert, Bell } from 'lucide-react';

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => { logout(); navigate('/login'); };
  
  const navClass = ({isActive}) => `sidebar-link ${isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'}`;

  return (
    <div className="min-h-screen flex bg-bg text-text selection:bg-primary/30">
      <aside className="w-72 bg-surface/40 backdrop-blur-2xl border-l border-white/10 flex flex-col m-4 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
            <ShieldAlert className="text-primary w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-wide">SANAD PLUS⁺</h1>
            <p className="text-xs text-muted">لوحة التحكم</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavLink to="/dashboard" className={navClass}><LayoutDashboard size={20} /> لوحة التحكم</NavLink>
          <NavLink to="/inbox" className={navClass}><Inbox size={20} /> الإرساليات</NavLink>
          <NavLink to="/users" className={navClass}><Users size={20} /> المستخدمين</NavLink>
          <NavLink to="/support" className={navClass}><LifeBuoy size={20} /> الدعم الفني</NavLink>
          <NavLink to="/store" className={navClass}><ShoppingBag size={20} /> المتجر</NavLink>
          
          <div className="my-4 border-t border-white/5"></div>
          
          <NavLink to="/audit" className={navClass}><Archive size={20} /> سجل التدقيق</NavLink>
          <NavLink to="/notifications" className={navClass}><Bell size={20} /> الإشعارات</NavLink>
          <NavLink to="/settings" className={navClass}><Settings size={20} /> الإعدادات</NavLink>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-danger hover:bg-danger/10 rounded-xl font-bold transition-all">
            <LogOut size={20} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
