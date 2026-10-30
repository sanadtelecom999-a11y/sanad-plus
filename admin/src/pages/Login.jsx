import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/ui/Toast';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [step, setStep] = useState('password');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, verifyOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await login(username, password);
      setSessionId(res.session_id); setStep('otp'); toast.success('تم إرسال رمز OTP');
    } catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };

  const handleOtp = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await verifyOtp(sessionId, otp); navigate('/dashboard');
    } catch (err) { toast.error(err.message); setOtp(''); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md bg-surface border border-border p-8 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-primary text-center mb-6">SANAD PLUS⁺</h1>
        {step === 'password' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div><label className="block text-sm mb-1 text-muted">اسم المستخدم</label><input type="text" value={username} onChange={e=>setUsername(e.target.value)} className="input-field" /></div>
            <div><label className="block text-sm mb-1 text-muted">كلمة المرور</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="input-field" /></div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-4">{loading ? 'جاري التحقق...' : 'تسجيل الدخول'}</button>
          </form>
        ) : (
          <form onSubmit={handleOtp} className="space-y-4">
            <p className="text-sm text-center text-muted">أدخل الرمز المكون من 6 أرقام المرسل إلى تيليجرام</p>
            <input type="text" value={otp} onChange={e=>setOtp(e.target.value)} maxLength="6" className="input-field text-center tracking-widest text-2xl" required />
            <button type="submit" disabled={loading} className="btn-primary w-full mt-4">{loading ? 'جاري التحقق...' : 'تأكيد الرمز'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
