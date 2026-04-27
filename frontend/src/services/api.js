// src/services/api.js
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
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
  // Cuentas
  getCuentas: () => request('/cuentas'),
  createCuenta: (body) => request('/cuentas', { method: 'POST', body: JSON.stringify(body) }),
  updateCuenta: (id, body) => request(`/cuentas/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCuenta: (id) => request(`/cuentas/${id}`, { method: 'DELETE' }),

  // Categorías
  getCategorias: () => request('/categorias'),
  createCategoria: (body) => request('/categorias', { method: 'POST', body: JSON.stringify(body) }),
  deleteCategoria: (id) => request(`/categorias/${id}`, { method: 'DELETE' }),

  // Transacciones
  getTransacciones: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/transacciones${qs ? `?${qs}` : ''}`);
  },
  createTransaccion: (body) => request('/transacciones', { method: 'POST', body: JSON.stringify(body) }),
  deleteTransaccion: (id) => request(`/transacciones/${id}`, { method: 'DELETE' }),

  // Presupuestos
  getPresupuestos: (periodo) => request(`/presupuestos?periodo=${periodo}`),
  createPresupuesto: (body) => request('/presupuestos', { method: 'POST', body: JSON.stringify(body) }),
  deletePresupuesto: (id) => request(`/presupuestos/${id}`, { method: 'DELETE' }),

  // Dashboard
  getDashboard: (periodo) => request(`/dashboard${periodo ? `?periodo=${periodo}` : ''}`),
};
