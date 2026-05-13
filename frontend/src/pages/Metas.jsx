// src/pages/Metas.jsx
import { useEffect, useState } from 'react';
import {
  Plus, Flag, Trash2, CheckCircle2,
  Plane, Home, Car, GraduationCap, Heart,
  Monitor, Shield, Briefcase, Gift, Star,
} from 'lucide-react';
import { api } from '../services/api';
import { formatCOP } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import MoneyInput from '../components/MoneyInput.jsx';
import { Loading, ErrorBox, Empty } from '../components/States';
import { useTutorial } from '../contexts/TutorialContext.jsx';

const META_ICONS = {
  plane:     { icon: Plane,         label: 'Viaje' },
  home:      { icon: Home,          label: 'Vivienda' },
  car:       { icon: Car,           label: 'Vehículo' },
  education: { icon: GraduationCap, label: 'Educación' },
  health:    { icon: Heart,         label: 'Salud' },
  tech:      { icon: Monitor,       label: 'Tecnología' },
  shield:    { icon: Shield,        label: 'Emergencia' },
  business:  { icon: Briefcase,     label: 'Negocio' },
  gift:      { icon: Gift,          label: 'Evento' },
  star:      { icon: Star,          label: 'General' },
};

const META_COLORS = [
  '#15803d', '#1d4ed8', '#7c3aed', '#b91c1c', '#c2410c',
  '#0891b2', '#a88a3a', '#0f766e', '#1f2937', '#78716c',
];

function progressColor(pct) {
  if (pct >= 100) return '#15803d';
  if (pct >= 80)  return '#a88a3a';
  return '#5a6b58';
}

export default function Metas() {
  const [metas, setMetas]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState(null);
  const [metaModal, setMetaModal] = useState(false);
  const [aportarMeta, setAportarMeta] = useState(null);
  const tutorial = useTutorial();

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getMetas();
      setMetas(data);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta meta?')) return;
    await api.deleteMeta(id);
    load();
  };

  const handleSaved = () => {
    setMetaModal(false);
    load();
    if (tutorial?.active && tutorial?.step === 4) {
      setTimeout(() => tutorial.completeStep(4), 800);
    }
  };

  const handleAportado = () => {
    setAportarMeta(null);
    load();
  };

  const activas     = metas.filter(m => m.estado !== 'completada');
  const completadas = metas.filter(m => m.estado === 'completada');

  return (
    <>
      <PageHeader
        eyebrow="Sección 05"
        title="Metas de ahorro"
        subtitle="Define objetivos concretos, rastrea tu progreso y calcula cuánto ahorrar cada mes."
        actions={
          <button
            onClick={() => setMetaModal(true)}
            className="btn-primary"
            data-tutorial="nueva-meta"
          >
            <Plus size={16} strokeWidth={1.5} />
            Nueva meta
          </button>
        }
      />

      <div className="page-body space-y-8">
        {loading && <Loading />}
        {err && <ErrorBox message={err} />}

        {!loading && !err && metas.length === 0 && (
          <Empty
            icon={Flag}
            title="Sin metas aún"
            hint="Crea tu primera meta de ahorro: el fondo de emergencia, el viaje soñado o el equipo que quieres."
          />
        )}

        {activas.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {activas.map(meta => (
              <MetaCard
                key={meta.id}
                meta={meta}
                onDelete={() => handleDelete(meta.id)}
                onAportar={() => setAportarMeta(meta)}
              />
            ))}
          </div>
        )}

        {completadas.length > 0 && (
          <div>
            <div className="eyebrow mb-4">Completadas · {completadas.length}</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 opacity-60">
              {completadas.map(meta => (
                <MetaCard
                  key={meta.id}
                  meta={meta}
                  onDelete={() => handleDelete(meta.id)}
                  onAportar={() => {}}
                  disabled
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <MetaModal
        open={metaModal}
        onClose={() => setMetaModal(false)}
        onSaved={handleSaved}
      />

      {aportarMeta && (
        <AportarModal
          meta={aportarMeta}
          onClose={() => setAportarMeta(null)}
          onSaved={handleAportado}
        />
      )}
    </>
  );
}

function MetaCard({ meta, onDelete, onAportar, disabled }) {
  const pct = Math.min(meta.porcentaje, 100);
  const color = progressColor(pct);
  const IconComp = META_ICONS[meta.icono]?.icon ?? Star;
  const alcanzada = meta.porcentaje >= 100;

  return (
    <article className="card-elevated p-7 group relative">
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0"
            style={{ background: meta.color + '22', color: meta.color }}
          >
            <IconComp size={18} strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <div className="eyebrow">{META_ICONS[meta.icono]?.label ?? 'Meta'}</div>
            <div className="font-display text-xl tracking-tightest leading-tight mt-0.5 truncate">
              {meta.nombre}
            </div>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-ink/30 hover:text-rust opacity-0 group-hover:opacity-100 transition-opacity p-1 flex-shrink-0"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="num text-3xl tracking-tightest" style={{ color }}>
          {formatCOP(meta.monto_actual)}
        </span>
        <span className="text-ink/50 text-sm">
          de <span className="num">{formatCOP(meta.monto_objetivo)}</span>
        </span>
      </div>

      <div className="h-2 bg-ink/8 rounded-sm overflow-hidden mb-3">
        <div
          className="h-full transition-all duration-700 rounded-sm"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-ink/55 mb-4">
        {alcanzada ? (
          <span className="flex items-center gap-1.5 font-medium" style={{ color: '#15803d' }}>
            <CheckCircle2 size={13} strokeWidth={2} />
            ¡Meta alcanzada!
          </span>
        ) : (
          <span>
            Falta <span className="num font-medium text-ink">{formatCOP(meta.restante)}</span>
          </span>
        )}
        <span className="num font-medium" style={{ color }}>{pct.toFixed(0)}%</span>
      </div>

      {(meta.fecha_objetivo || meta.meses_restantes) && !alcanzada && (
        <div className="pt-4 border-t border-ink/10 flex justify-between text-xs text-ink/50">
          {meta.fecha_objetivo && (
            <span>
              Fecha objetivo:{' '}
              <span className="text-ink font-medium">
                {new Date(meta.fecha_objetivo + 'T00:00:00').toLocaleDateString('es-CO', { year: 'numeric', month: 'short' })}
              </span>
            </span>
          )}
          {meta.aporte_mensual_necesario > 0 && (
            <span>
              <span className="num font-medium text-ink">{formatCOP(meta.aporte_mensual_necesario)}</span>/mes
            </span>
          )}
        </div>
      )}

      {!disabled && (
        <button
          onClick={onAportar}
          disabled={alcanzada}
          className="mt-4 w-full btn-ghost text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Aportar
        </button>
      )}
    </article>
  );
}

function MetaModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: '',
    icono: 'star',
    color: '#15803d',
    monto_objetivo: 0,
    fecha_objetivo: '',
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (open) {
      setForm({ nombre: '', icono: 'star', color: '#15803d', monto_objetivo: 0, fecha_objetivo: '' });
      setError(null);
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    if (!form.monto_objetivo || form.monto_objetivo <= 0) { setError('El monto objetivo debe ser mayor a cero'); return; }
    setSaving(true); setError(null);
    try {
      await api.createMeta({
        nombre:         form.nombre.trim(),
        icono:          form.icono,
        color:          form.color,
        monto_objetivo: form.monto_objetivo,
        fecha_objetivo: form.fecha_objetivo || null,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Nueva meta" title="Crear meta de ahorro">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label">Nombre de la meta</label>
          <input
            type="text"
            required
            className="input"
            placeholder="Ej: Fondo de emergencia"
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Icono</label>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(META_ICONS).map(([key, { icon: Icon, label }]) => (
              <button
                key={key}
                type="button"
                title={label}
                onClick={() => setForm({ ...form, icono: key })}
                className={`flex flex-col items-center gap-1 p-2.5 rounded-sm border transition-all text-xs
                  ${form.icono === key
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/15 text-ink/60 hover:border-ink/40 hover:text-ink'}`}
              >
                <Icon size={16} strokeWidth={1.5} />
                <span className="leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Color</label>
          <div className="flex gap-2 flex-wrap">
            {META_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setForm({ ...form, color: c })}
                className="w-7 h-7 rounded-sm transition-transform hover:scale-110 flex-shrink-0"
                style={{
                  background: c,
                  outline: form.color === c ? `2px solid ${c}` : 'none',
                  outlineOffset: 2,
                  boxShadow: form.color === c ? `0 0 0 1px white` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label">Monto objetivo (COP)</label>
          <MoneyInput
            required
            className="input num text-xl"
            value={form.monto_objetivo}
            onChange={val => setForm({ ...form, monto_objetivo: val })}
            allowNegative={false}
            placeholder="0"
          />
        </div>

        <div>
          <label className="label">Fecha objetivo <span className="text-ink/40 font-normal">(opcional)</span></label>
          <input
            type="date"
            className="input"
            value={form.fecha_objetivo}
            onChange={e => setForm({ ...form, fecha_objetivo: e.target.value })}
          />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Guardando…' : 'Crear meta'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AportarModal({ meta, onClose, onSaved }) {
  const [monto, setMonto]       = useState(0);
  const [saving, setSaving]     = useState(false);
  const [completada, setCompletada] = useState(false);
  const [error, setError]       = useState(null);

  const pct   = Math.min(meta.porcentaje, 100);
  const color = progressColor(pct);
  const IconComp = META_ICONS[meta.icono]?.icon ?? Star;

  const submit = async (e) => {
    e.preventDefault();
    if (!monto || monto <= 0) { setError('Ingresa un monto mayor a cero'); return; }
    setSaving(true); setError(null);
    try {
      const result = await api.aportarMeta(meta.id, monto);
      if (result.completada) {
        setCompletada(true);
        setTimeout(onSaved, 1800);
      } else {
        onSaved();
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  if (completada) {
    return (
      <Modal open onClose={onClose} eyebrow="¡Felicitaciones!" title="Meta alcanzada">
        <div className="py-6 text-center space-y-4">
          <div
            className="w-16 h-16 rounded-sm flex items-center justify-center mx-auto"
            style={{ background: meta.color + '22', color: meta.color }}
          >
            <CheckCircle2 size={32} strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-display text-2xl tracking-tightest">{meta.nombre}</p>
            <p className="text-sm text-ink/60 mt-1">¡Lograste tu meta de ahorro!</p>
          </div>
          <p className="num text-3xl tracking-tightest" style={{ color: '#15803d' }}>
            {formatCOP(meta.monto_objetivo)}
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open onClose={onClose} eyebrow="Registrar aporte" title={`Aportar a "${meta.nombre}"`}>
      <form onSubmit={submit} className="space-y-5">
        <div className="card-elevated p-4 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0"
            style={{ background: meta.color + '22', color: meta.color }}
          >
            <IconComp size={16} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs text-ink/50 mb-1">
              <span>{formatCOP(meta.monto_actual)}</span>
              <span>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-ink/8 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <div className="text-xs text-ink/50 mt-1">
              de <span className="num">{formatCOP(meta.monto_objetivo)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Monto a aportar (COP)</label>
          <MoneyInput
            required
            className="input num text-xl"
            value={monto}
            onChange={setMonto}
            allowNegative={false}
            placeholder="0"
          />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancelar</button>
          <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
            {saving ? 'Guardando…' : 'Confirmar aporte'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
