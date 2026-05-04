// src/pages/Transacciones.jsx
import { useEffect, useMemo, useState } from 'react';
import { Plus, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Trash2, Filter, Wallet } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { formatCOP, formatDate } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import { Loading, ErrorBox, Empty } from '../components/States';

const TIPO_META = {
  ingreso:        { label: 'Ingreso',       icon: ArrowDownLeft,  color: 'sage', sign: '+' },
  egreso:         { label: 'Egreso',        icon: ArrowUpRight,   color: 'rust', sign: '−' },
  transferencia:  { label: 'Transferencia', icon: ArrowLeftRight, color: 'ink',  sign: '⇄' },
};

export default function Transacciones() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [trans, setTrans] = useState([]);
  const [cuentas, setCuentas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [filtro, setFiltro] = useState('todos');
  const [modal, setModal] = useState(false); // Se abre sólo si hay cuentas

  const load = async () => {
    setLoading(true);
    try {
      const [t, c, cat] = await Promise.all([
        api.getTransacciones(),
        api.getCuentas(),
        api.getCategorias(),
      ]);
      setTrans(t);
      setCuentas(c.cuentas);
      setCategorias(cat);
      // Abrir modal si venía con ?nuevo=1 Y hay cuentas disponibles
      if (params.get('nuevo') === '1' && c.cuentas.length > 0) setModal(true);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const sinCuentas = !loading && cuentas.length === 0;

  const abrirModal = () => {
    if (sinCuentas) return; // Doble seguro
    setModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta transacción?')) return;
    await api.deleteTransaccion(id);
    load();
  };

  const filtradas = useMemo(() => {
    if (filtro === 'todos') return trans;
    return trans.filter(t => t.tipo === filtro);
  }, [trans, filtro]);

  // Agrupar por fecha
  const grupos = useMemo(() => {
    const map = new Map();
    filtradas.forEach(t => {
      if (!map.has(t.fecha)) map.set(t.fecha, []);
      map.get(t.fecha).push(t);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtradas]);

  return (
    <>
      <PageHeader
        eyebrow="Sección 03"
        title="Movimientos"
        subtitle="Historial completo de ingresos, egresos y transferencias entre cuentas."
        actions={
          sinCuentas ? (
            <button
              onClick={() => navigate('/cuentas')}
              className="btn-primary"
            >
              <Wallet size={16} strokeWidth={1.5} />
              Crear primera cuenta
            </button>
          ) : (
            <button onClick={abrirModal} className="btn-primary">
              <Plus size={16} strokeWidth={1.5} />
              Nuevo movimiento
            </button>
          )
        }
      />

      {/* Aviso cuando no hay cuentas */}
      {sinCuentas && (
        <div className="mx-10 mt-2 mb-0">
          <div className="border border-gold/30 bg-gold/5 rounded-sm px-5 py-4 flex items-start gap-3">
            <Wallet size={16} className="text-gold mt-0.5 flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-ink">Necesitas al menos una cuenta para registrar movimientos.</p>
              <p className="text-sm text-ink/55 mt-0.5">
                Ve a{' '}
                <button onClick={() => navigate('/cuentas')} className="underline underline-offset-2 hover:text-ink transition-colors">
                  Cuentas
                </button>
                {' '}y crea tu primera cuenta antes de registrar ingresos o gastos.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="px-10 py-8 space-y-6">
        {/* Filtros */}
        <div className="flex items-center gap-1 border-b border-ink/10 pb-1">
          <Filter size={14} className="text-ink/40 mr-2" strokeWidth={1.5} />
          {[
            { v: 'todos',         l: 'Todos' },
            { v: 'ingreso',       l: 'Ingresos' },
            { v: 'egreso',        l: 'Egresos' },
            { v: 'transferencia', l: 'Transferencias' },
          ].map(f => (
            <button
              key={f.v}
              onClick={() => setFiltro(f.v)}
              className={`px-4 py-2 text-sm tracking-wide transition-colors relative
                ${filtro === f.v ? 'text-ink' : 'text-ink/50 hover:text-ink/80'}`}
            >
              {f.l}
              {filtro === f.v && <span className="absolute bottom-0 left-0 right-0 h-px bg-ink -mb-px" />}
            </button>
          ))}
        </div>

        {loading && <Loading />}
        {err && <ErrorBox message={err} />}

        {!loading && filtradas.length === 0 && (
          <Empty title="Sin movimientos" hint="Registra tu primer ingreso, egreso o transferencia." />
        )}

        {/* Listado por fecha */}
        {grupos.map(([fecha, items]) => (
          <section key={fecha}>
            <div className="flex items-center gap-3 mb-2 pl-1">
              <h3 className="font-display text-lg tracking-tightest text-ink/80">{formatDate(fecha)}</h3>
              <div className="h-px flex-1 bg-ink/10" />
              <span className="text-xs text-ink/40 num">{items.length} {items.length === 1 ? 'mov.' : 'movs.'}</span>
            </div>
            <div className="card-elevated divide-y divide-ink/10">
              {items.map(t => {
                const meta = TIPO_META[t.tipo];
                const Icon = meta.icon;
                return (
                  <div key={t.id} className="px-6 py-4 flex items-center gap-5 group hover:bg-bone/30 transition-colors">
                    <div
                      className={`w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 bg-${meta.color}/10`}
                    >
                      <Icon size={15} strokeWidth={1.5} className={`text-${meta.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink truncate">
                        {t.descripcion || (t.categoria_nombre ?? meta.label)}
                      </div>
                      <div className="text-xs text-ink/50 mt-0.5 flex items-center gap-2 flex-wrap">
                        {t.tipo === 'transferencia' ? (
                          <>
                            <span>{t.cuenta_nombre}</span>
                            <ArrowLeftRight size={10} />
                            <span>{t.cuenta_destino_nombre}</span>
                          </>
                        ) : (
                          <>
                            {t.categoria_nombre && (
                              <span className="inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.categoria_color }} />
                                {t.categoria_nombre}
                              </span>
                            )}
                            <span className="text-ink/30">·</span>
                            <span>{t.cuenta_nombre}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className={`num text-lg whitespace-nowrap text-${meta.color}`}>
                      {meta.sign === '⇄' ? '' : meta.sign}{formatCOP(t.monto)}
                    </div>

                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-ink/30 hover:text-rust opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <TransaccionModal
        open={modal}
        onClose={() => { setModal(false); params.delete('nuevo'); setParams(params); }}
        cuentas={cuentas}
        categorias={categorias}
        onSaved={() => { setModal(false); load(); }}
      />
    </>
  );
}

function TransaccionModal({ open, onClose, cuentas, categorias, onSaved }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    tipo: 'egreso', monto: '', fecha: today, descripcion: '',
    cuenta_id: '', cuenta_destino_id: '', categoria_id: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setForm({
        tipo: 'egreso', monto: '', fecha: today, descripcion: '',
        cuenta_id: cuentas[0]?.id || '', cuenta_destino_id: '', categoria_id: '',
      });
      setError(null);
    }
  }, [open]);

  const catFiltradas = categorias.filter(c => c.tipo === form.tipo);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await api.createTransaccion({
        ...form,
        monto: parseFloat(form.monto),
        cuenta_destino_id: form.tipo === 'transferencia' ? form.cuenta_destino_id : null,
        categoria_id: form.tipo === 'transferencia' ? null : form.categoria_id,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Nuevo movimiento" title="Registrar transacción" width="max-w-lg">
      <form onSubmit={submit} className="space-y-5">
        {/* Tipo */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(TIPO_META).map(([key, m]) => {
            const Icon = m.icon;
            const active = form.tipo === key;
            return (
              <button
                type="button"
                key={key}
                onClick={() => setForm({ ...form, tipo: key, categoria_id: '', cuenta_destino_id: '' })}
                className={`flex flex-col items-center gap-1.5 py-3 border rounded-sm transition-all
                  ${active ? `border-${m.color} bg-${m.color}/10 text-${m.color}` : 'border-ink/15 text-ink/60 hover:border-ink/40'}`}
              >
                <Icon size={18} strokeWidth={1.5} />
                <span className="text-xs font-medium">{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Monto (COP)</label>
            <input
              type="number" step="0.01" min="0.01" required
              className="input num text-xl"
              value={form.monto}
              onChange={e => setForm({ ...form, monto: e.target.value })}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Fecha</label>
            <input
              type="date" required
              className="input"
              value={form.fecha}
              onChange={e => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="label">{form.tipo === 'transferencia' ? 'Cuenta origen' : 'Cuenta'}</label>
          <select
            required className="input"
            value={form.cuenta_id}
            onChange={e => setForm({ ...form, cuenta_id: e.target.value })}
          >
            <option value="">— Selecciona —</option>
            {cuentas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        {form.tipo === 'transferencia' ? (
          <div>
            <label className="label">Cuenta destino</label>
            <select
              required className="input"
              value={form.cuenta_destino_id}
              onChange={e => setForm({ ...form, cuenta_destino_id: e.target.value })}
            >
              <option value="">— Selecciona —</option>
              {cuentas.filter(c => c.id != form.cuenta_id).map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="label">Categoría</label>
            <select
              required className="input"
              value={form.categoria_id}
              onChange={e => setForm({ ...form, categoria_id: e.target.value })}
            >
              <option value="">— Selecciona —</option>
              {catFiltradas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="label">Descripción (opcional)</label>
          <input
            className="input"
            value={form.descripcion}
            onChange={e => setForm({ ...form, descripcion: e.target.value })}
            placeholder="Ej. Pago de arriendo abril"
          />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Guardando…' : 'Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
