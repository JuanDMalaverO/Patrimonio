// src/pages/Cuentas.jsx
import { useEffect, useState } from 'react';
import { Plus, Wallet, Banknote, CreditCard, TrendingUp, Trash2, MoreHorizontal } from 'lucide-react';
import { api } from '../services/api';
import { formatCOP } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorBox, Empty } from '../components/States';

const TIPOS = [
  { value: 'ahorros',   label: 'Ahorros',     icon: Wallet,     color: '#1f2937' },
  { value: 'efectivo',  label: 'Efectivo',    icon: Banknote,   color: '#78716c' },
  { value: 'tarjeta',   label: 'Tarjeta',     icon: CreditCard, color: '#7c2d12' },
  { value: 'inversion', label: 'Inversión',   icon: TrendingUp, color: '#15803d' },
  { value: 'otro',      label: 'Otro',        icon: Wallet,     color: '#525252' },
];
const tipoMeta = (t) => TIPOS.find(x => x.value === t) || TIPOS[4];

export default function Cuentas() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);

  const load = () => {
    setLoading(true);
    api.getCuentas()
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Archivar esta cuenta? El histórico se conservará.')) return;
    await api.deleteCuenta(id);
    load();
  };

  return (
    <>
      <PageHeader
        eyebrow="Sección 02"
        title="Cuentas"
        subtitle="Cada billetera, cuenta bancaria, tarjeta o inversión que conforma tu patrimonio."
        actions={
          <button onClick={() => setModal(true)} className="btn-primary">
            <Plus size={16} strokeWidth={1.5} />
            Nueva cuenta
          </button>
        }
      />

      <div className="px-10 py-8 space-y-8">
        {loading && <Loading />}
        {err && <ErrorBox message={err} />}

        {data && (
          <>
            {/* Patrimonio total */}
            <div className="border border-ink/10 bg-bone/40 rounded-sm p-8 flex items-end justify-between flex-wrap gap-4">
              <div>
                <div className="eyebrow mb-2">Patrimonio neto consolidado</div>
                <div className="num text-5xl tracking-tightest leading-none">
                  {formatCOP(data.patrimonio_neto)}
                </div>
              </div>
              <div className="text-right">
                <div className="eyebrow mb-1">Cuentas activas</div>
                <div className="num text-3xl tracking-tightest">{String(data.total_cuentas).padStart(2, '0')}</div>
              </div>
            </div>

            {/* Lista de cuentas */}
            {data.cuentas.length === 0 ? (
              <Empty
                icon={Wallet}
                title="Aún no tienes cuentas"
                hint="Crea tu primera billetera para comenzar a registrar movimientos."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {data.cuentas.map((c) => {
                  const meta = tipoMeta(c.tipo);
                  const Icon = meta.icon;
                  const negativa = c.saldo_actual < 0;
                  return (
                    <article
                      key={c.id}
                      className="card-elevated p-7 group relative overflow-hidden"
                      style={{ borderTopColor: c.color, borderTopWidth: '3px' }}
                    >
                      <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-sm flex items-center justify-center" style={{ background: `${c.color}15` }}>
                            <Icon size={16} strokeWidth={1.5} style={{ color: c.color }} />
                          </div>
                          <div>
                            <div className="eyebrow">{meta.label}</div>
                            <div className="font-medium text-ink mt-0.5">{c.nombre}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="text-ink/30 hover:text-rust opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Archivar"
                        >
                          <Trash2 size={14} strokeWidth={1.5} />
                        </button>
                      </div>

                      <div className="eyebrow mb-1">Saldo actual</div>
                      <div className={`num text-3xl tracking-tightest ${negativa ? 'text-rust' : 'text-ink'}`}>
                        {formatCOP(c.saldo_actual)}
                      </div>

                      <div className="mt-4 pt-4 border-t border-ink/10 flex justify-between text-xs text-ink/55">
                        <span>Saldo inicial</span>
                        <span className="num">{formatCOP(c.saldo_inicial)}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <CuentaModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={() => { setModal(false); load(); }}
      />
    </>
  );
}

function CuentaModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', tipo: 'ahorros', saldo_inicial: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) { setForm({ nombre: '', tipo: 'ahorros', saldo_inicial: 0 }); setError(null); }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const meta = tipoMeta(form.tipo);
      await api.createCuenta({ ...form, color: meta.color, icono: 'wallet' });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Nueva cuenta" title="Crear billetera">
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej. Bancolombia ahorros"
            required
          />
        </div>

        <div>
          <label className="label">Tipo</label>
          <div className="grid grid-cols-5 gap-2">
            {TIPOS.map(t => {
              const Icon = t.icon;
              const active = form.tipo === t.value;
              return (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setForm({ ...form, tipo: t.value })}
                  className={`flex flex-col items-center gap-1.5 py-3 border rounded-sm transition-all
                    ${active ? 'border-ink bg-ink text-paper' : 'border-ink/15 text-ink/70 hover:border-ink/40'}`}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-wide">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">Saldo inicial (COP)</label>
          <input
            className="input num"
            type="number"
            step="0.01"
            value={form.saldo_inicial}
            onChange={e => setForm({ ...form, saldo_inicial: e.target.value })}
          />
          <p className="text-xs text-ink/45 mt-1.5">Para tarjetas de crédito usa valores negativos.</p>
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Guardando…' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
