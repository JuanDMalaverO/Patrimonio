// src/services/api.js
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // Envía y recibe cookies en todas las peticiones
    ...options,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const msg = (data && data.error) || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  // ── Autenticación ──────────────────────────────────────────────────────────
  me:                  ()     => request('/auth/me'),
  sendCode:            (body) => request('/auth/send-code',   { method: 'POST', body: JSON.stringify(body) }),
  verifyCode:          (body) => request('/auth/verify-code', { method: 'POST', body: JSON.stringify(body) }),
  login:               (body) => request('/auth/login',       { method: 'POST', body: JSON.stringify(body) }),
  register:            (body) => request('/auth/register',    { method: 'POST', body: JSON.stringify(body) }),
  logout:              ()     => request('/auth/logout',      { method: 'POST' }),
  completeOnboarding:  ()     => request('/auth/onboarding',  { method: 'POST' }),

  // ── Perfil ─────────────────────────────────────────────────────────────────
  updateProfile:  (body) => request('/auth/profile',  { method: 'PUT', body: JSON.stringify(body) }),
  changePassword: (body) => request('/auth/password', { method: 'PUT', body: JSON.stringify(body) }),

  // ── Suscripción ────────────────────────────────────────────────────────────
  upgradePlan:   () => request('/subscription/upgrade',   { method: 'POST' }),
  downgradePlan: () => request('/subscription/downgrade', { method: 'POST' }),

  // ── IA ─────────────────────────────────────────────────────────────────────
  getInsights:     (periodo) => request(`/ai/insights?periodo=${periodo}`),
  refreshInsights: (periodo) => request(`/ai/refresh?periodo=${periodo}`, { method: 'POST' }),

  // ── Cuentas ────────────────────────────────────────────────────────────────
  getCuentas:    ()         => request('/cuentas'),
  createCuenta:  (body)     => request('/cuentas',     { method: 'POST',   body: JSON.stringify(body) }),
  updateCuenta:  (id, body) => request(`/cuentas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCuenta:  (id)       => request(`/cuentas/${id}`, { method: 'DELETE' }),

  // ── Categorías ─────────────────────────────────────────────────────────────
  getCategorias:    ()     => request('/categorias'),
  createCategoria:  (body) => request('/categorias',     { method: 'POST',   body: JSON.stringify(body) }),
  deleteCategoria:  (id)   => request(`/categorias/${id}`, { method: 'DELETE' }),

  // ── Transacciones ──────────────────────────────────────────────────────────
  getTransacciones: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/transacciones${qs ? `?${qs}` : ''}`);
  },
  createTransaccion: (body) => request('/transacciones',     { method: 'POST',   body: JSON.stringify(body) }),
  deleteTransaccion: (id)   => request(`/transacciones/${id}`, { method: 'DELETE' }),

  // ── Presupuestos ───────────────────────────────────────────────────────────
  getPresupuestos:    (periodo) => request(`/presupuestos?periodo=${periodo}`),
  createPresupuesto:  (body)    => request('/presupuestos',     { method: 'POST',   body: JSON.stringify(body) }),
  deletePresupuesto:  (id)      => request(`/presupuestos/${id}`, { method: 'DELETE' }),

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboard: (periodo) => request(`/dashboard${periodo ? `?periodo=${periodo}` : ''}`),
};
