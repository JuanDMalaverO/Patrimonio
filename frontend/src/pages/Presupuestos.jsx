// src/pages/Presupuestos.jsx
import { useEffect, useState } from 'react';
import { Plus, Target, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { formatCOP, currentPeriod, periodLabel } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorBox, Empty } from '../components/States';

const ESTADO_STYLES = {
  normal:   { color: '#5a6b58', bg: 'bg-sage',  label: 'En rango',  icon: CheckCircle2 },
  alerta:   { color: '#a88a3a', bg: 'bg-gold',  label: 'Cerca del límite', icon: AlertTriangle },
  excedido: { color: '#a8472a', bg: 'bg-rust',  label: 'Excedido',  icon: AlertTriangle },
};

export default function Presupuestos() {
  const [periodo, setPeriodo] = useState(currentPeriod());
  const [data, setData] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [modal, setModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        api.getPresupuestos(periodo),
        api.getCategorias(),
      ]);
      setData(p);
      setCategorias(c.filter(x => x.tipo === 'egreso'));
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [periodo]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    await api.deletePresupuesto(id);
    load();
  };

  return (
    <>
      <PageHeader
        eyebrow={`Sección 04 · ${periodLabel(periodo)}`}
        title="Presupuestos"
        subtitle="Define límites mensuales por categoría y monitorea cuánto has consumido."
        actions={
          <div className="flex gap-2">
            <input
              type="month"
              className="border border-ink/15 px-3 py-2 text-sm rounded-sm bg-paper focus:outline-none focus:border-ink"
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
            />
            <button onClick={() => setModal(true)} className="btn-primary">
              <Plus size={16} strokeWidth={1.5} />
              Nuevo presupuesto
            </button>
          </div>
        }
      />

      <div className="px-10 py-8 space-y-6">
        {loading && <Loading />}
        {err && <ErrorBox message={err} />}

        {data && data.presupuestos.length === 0 && !loading && (
          <Empty
            icon={Target}
            title="Sin presupuestos en este periodo"
            hint="Crea tu primer límite mensual para una categoría de egreso."
          />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {data?.presupuestos.map(p => {
            const estado = ESTADO_STYLES[p.estado];
            const EstadoIcon = estado.icon;
            const pct = Math.min(p.porcentaje, 100);
            const exceso = p.porcentaje > 100 ? p.porcentaje - 100 : 0;

            return (
              <article key={p.id} className="card-elevated p-7 group">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="w-1 h-12 rounded-sm" style={{ background: p.categoria_color }} />
                    <div>
                      <div className="eyebrow">Categoría</div>
                      <div className="font-display text-2xl tracking-tightest mt-0.5">{p.categoria_nombre}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-ink/30 hover:text-rust opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Cifras */}
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="num text-4xl tracking-tightest" style={{ color: estado.color }}>
                    {formatCOP(p.gastado)}
                  </span>
                  <span className="text-ink/50 text-sm">
                    de <span className="num">{formatCOP(p.monto_limite)}</span>
                  </span>
                </div>

                {/* Barra de progreso */}
                <div className="relative">
                  <div className="h-2 bg-ink/8 rounded-sm overflow-hidden">
                    <div
                      className="h-full transition-all duration-700 rounded-sm"
                      style={{
                        width: `${pct}%`,
                        background: estado.color,
                      }}
                    />
                  </div>
                  {exceso > 0 && (
                    <div
                      className="absolute top-0 right-0 h-2 bg-rust/40 animate-pulse"
                      style={{ width: '100%' }}
                    />
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs" style={{ color: estado.color }}>
                    <EstadoIcon size={13} strokeWidth={1.8} />
                    <span className="font-medium tracking-wide">{estado.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="num text-2xl font-medium" style={{ color: estado.color }}>
                      {p.porcentaje.toFixed(0)}
                    </span>
                    <span className="text-xs text-ink/50">% consumido</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-ink/10 flex justify-between text-xs text-ink/55">
                  <span>{p.restante >= 0 ? 'Disponible' : 'Excedido en'}</span>
                  <span className="num" style={{ color: p.restante >= 0 ? '#0a0a0a' : '#a8472a' }}>
                    {formatCOP(Math.abs(p.restante))}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <PresupuestoModal
        open={modal}
        onClose={() => setModal(false)}
        categorias={categorias}
        periodo={periodo}
        onSaved={() => { setModal(false); load(); }}
      />
    </>
  );
}

function PresupuestoModal({ open, onClose, categorias, periodo, onSaved }) {
  const [form, setForm] = useState({ categoria_id: '', monto_limite: '', periodo });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({ categoria_id: '', monto_limite: '', periodo });
      setError(null);
    }
  }, [open, periodo]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await api.createPresupuesto({
        ...form,
        monto_limite: parseFloat(form.monto_limite),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Nuevo presupuesto" title="Definir límite">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label">Categoría de egreso</label>
          <select
            required className="input"
            value={form.categoria_id}
            onChange={e => setForm({ ...form, categoria_id: e.target.value })}
          >
            <option value="">— Selecciona —</option>
            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Monto límite (COP)</label>
          <input
            type="number" step="0.01" min="1" required
            className="input num text-xl"
            value={form.monto_limite}
            onChange={e => setForm({ ...form, monto_limite: e.target.value })}
            placeholder="0"
          />
        </div>

        <div>
          <label className="label">Periodo</label>
          <input
            type="month" required
            className="input"
            value={form.periodo}
            onChange={e => setForm({ ...form, periodo: e.target.value })}
          />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
