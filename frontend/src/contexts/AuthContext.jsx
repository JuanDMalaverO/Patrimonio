// src/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';

const AuthContext = createContext(null);

// localStorage key por usuario: permite múltiples usuarios en el mismo navegador
const lsKey = (id) => `patrimonio_onboarding_${id}`;

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me()
      .then(data => {
        const u = data.usuario;
        // Si el localStorage ya marcó el onboarding como hecho (fallback
        // ante fallos de red en completeOnboarding), sobreescribir aquí.
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
    try { await api.logout(); } catch { /* ignorar errores de red */ }
    setUser(null);
  };

  const completeOnboarding = async () => {
    // 1. Persistir en localStorage de inmediato (no depende de la red)
    if (user?.id) localStorage.setItem(lsKey(user.id), '1');
    // 2. Actualizar estado local
    setUser(prev => prev ? { ...prev, onboarding_completado: true } : null);
    // 3. Persistir en DB (best-effort, el me() ya lee fresco de DB de todos modos)
    try { await api.completeOnboarding(); } catch { /* ignorar */ }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, completeOnboarding }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
