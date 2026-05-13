// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

const lsKey = (id) => `patrimonio_onboarding_${id}`;

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(data => {
        const u = data.usuario;
        if (u?.id && localStorage.getItem(lsKey(u.id)) === '1') {
          u.onboarding_completado = true;
        }
        setUser(u);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    const u = data.usuario;
    if (u?.id && localStorage.getItem(lsKey(u.id)) === '1') {
      u.onboarding_completado = true;
    }
    setUser(u);
    return data;
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    setUser(data.usuario);
    return data;
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* ignorar */ }
    setUser(null);
  };

  const completeOnboarding = async () => {
    if (user?.id) localStorage.setItem(lsKey(user.id), '1');
    setUser(prev => prev ? { ...prev, onboarding_completado: true } : null);
    try { await api.completeOnboarding(); } catch { /* ignorar */ }
  };

  // Recarga el usuario desde la DB — úsalo tras un pago exitoso
  const refreshUser = useCallback(async () => {
    try {
      const data = await api.me();
      const u = data.usuario;
      if (u?.id && localStorage.getItem(lsKey(u.id)) === '1') {
        u.onboarding_completado = true;
      }
      setUser(u);
      return u;
    } catch { return null; }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout, completeOnboarding, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
