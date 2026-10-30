import { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';
import { token } from './token';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token.get()) setUser({ role: 'admin' });
    setLoading(false);
    const handleUnauth = () => setUser(null);
    window.addEventListener('admin:unauthorized', handleUnauth);
    return () => window.removeEventListener('admin:unauthorized', handleUnauth);
  }, []);

  const login = async (u, p) => await api.login(u, p);
  const verifyOtp = async (sid, otp) => {
    const res = await api.verifyOtp(sid, otp);
    token.set(res.token || res.access_token);
    setUser({ role: 'admin' });
    return res;
  };
  const logout = () => { token.clear(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
