// src/utils/format.js

export const formatCOP = (n, opts = {}) => {
  const { compact = false, sign = false } = opts;
  if (n === null || n === undefined || isNaN(n)) return '—';
  const num = Number(n);
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  });
  const formatted = formatter.format(Math.abs(num));
  if (sign && num !== 0) return num > 0 ? `+${formatted}` : `−${formatted}`;
  if (num < 0) return `−${formatted}`;
  return formatted;
};

export const formatDate = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateShort = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
};

export const currentPeriod = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const periodLabel = (periodo) => {
  if (!periodo) return '';
  const [y, m] = periodo.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
};
