// src/pages/Cuentas.jsx
import { useEffect, useState } from 'react';
import { Plus, Wallet, Banknote, CreditCard, TrendingUp, Trash2, Percent } from 'lucide-react';
import { api } from '../services/api';
import { formatCOP } from '../utils/format';
import PageHeader from '../components/PageHeader';
import Modal from '../components/Modal';
import TutorialGuide from '../components/TutorialGuide.jsx';
import { Loading, ErrorBox, Empty } from '../components/States';
import { useTutorial } from '../contexts/TutorialContext.jsx';

const TIPOS = [
  { value: 'ahorros',   label: 'Ahorros',   icon: Wallet,     color: '#1f2937' },
  { value: 'efectivo',  label: 'Efectivo',  icon: Banknote,   color: '#78716c' },
  { value: 'tarjeta',   label: 'Tarjeta',   icon: CreditCard, color: '#7c2d12' },
  { value: 'inversion', label: 'Inversión', icon: TrendingUp, color: '#15803d' },
  { value: 'otro',      label: 'Otro',      icon: Wallet,     color: '#525252' },
];
const tipoMeta = (t) => TIPOS.find(x => x.value === t) || TIPOS[4];

// ── Cálculo de rendimiento por TEA ────────────────────────────────────────────
// Formula: rendimiento = saldo × ((1 + TEA/100)^(días/365) - 1)
function calcRendimiento(saldoActual, teaAnual, fechaCreacion) {
  if (!teaAnual || !fechaCreacion || saldoActual <= 0) return 0;
  const dias = Math.max(0, (Date.now() - new Date(fechaCreacion).getTime()) / 86_400_000);
  return saldoActual * (Math.pow(1 + teaAnual / 100, dias / 365) - 1);
}

// ── Componente de card de cuenta ──────────────────────────────────────────────
function CuentaCard({ c, onDelete }) {
  const meta     = tipoMeta(c.tipo);
  const Icon     = meta.icon;
  const negativa = c.saldo_actual < 0;
  const tieneTEA = c.tea_anual != null && c.tea_anual > 0;

  const rend         = tieneTEA ? calcRendimiento(c.saldo_actual, c.tea_anual, c.fecha_creacion) : 0;
  const saldoConRend = c.saldo_actual + rend;

  return (
    <article
      className="card-elevated p-7 group relative overflow-hidden flex flex-col"
      style={{ borderTopColor: c.color, borderTopWidth: '3px' }}
    >
      {/* Cabecera: tipo + nombre + delete */}
      <div className="flex items-start justify-between mb-6">
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
          onClick={() => onDelete(c.id)}
          className="text-ink/30 hover:text-rust opacity-0 group-hover:opacity-100 transition-opacity p-1"
          title="Archivar"
        >
          <Trash2 size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Saldo principal */}
      <div className="flex-1">
        <div className="eyebrow mb-1">{tieneTEA ? 'Saldo con rendimiento' : 'Saldo actual'}</div>
        <div className={`num text-3xl tracking-tightest ${negativa ? 'text-rust' : 'text-ink'}`}>
          {formatCOP(tieneTEA ? saldoConRend : c.saldo_actual)}
        </div>

        {/* Indicador de rendimiento acumulado */}
        {tieneTEA && rend > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <TrendingUp size={12} className="text-sage flex-shrink-0" strokeWidth={2} />
            <span className="text-xs text-sage font-medium">
              +{formatCOP(rend)} en intereses
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-ink/10 space-y-2">
        <div className="flex justify-between text-xs text-ink/55">
          <span>Saldo base</span>
          <span className="num">{formatCOP(c.saldo_actual)}</span>
        </div>
        {tieneTEA && (
          <div className="flex justify-between text-xs text-ink/55">
            <span className="flex items-center gap-1">
              <Percent size={10} strokeWidth={2} />
              TEA anual
            </span>
            <span className="num font-medium text-sage">{c.tea_anual}%</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-ink/55">
          <span>Saldo inicial</span>
          <span className="num">{formatCOP(c.saldo_inicial)}</span>
        </div>
      </div>
    </article>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Cuentas() {
  const [data, setData]     = useState(null);
  const [err, setErr]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState(false);
  const tutorial            = useTutorial();

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

  // Cuando se crea una cuenta en modo tutorial → avanzar al siguiente paso
  const handleSaved = () => {
    setModal(false);
    load();
    if (tutorial?.active && tutorial?.step === 0) {
      setTimeout(() => tutorial.completeStep(0), 800);
    }
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

      {/* ── Guía interactiva (solo visible en paso 0 del tutorial) ────────── */}
      <TutorialGuide
        stepIndex={0}
        title="Crea tu primera cuenta bancaria"
        description="Una cuenta es cualquier lugar donde guardas dinero: banco, efectivo en billetera, tarjeta de crédito o inversión. Crea una cuenta por cada lugar donde tienes plata."
        tips={[
          '<b>Nombre:</b> algo que reconozcas fácilmente. Ej: "Bancolombia nómina", "Nequi", "Efectivo billetera"',
          '<b>Tipo:</b> Ahorros → banco | Efectivo → billetera física | Tarjeta → crédito (puede ser negativo) | Inversión → CDT, fondos, acciones',
          '<b>Saldo inicial:</b> ¿cuánto tienes exactamente ahora mismo en esa cuenta? No el cupo, el saldo real.',
        ]}
        action={
          <button onClick={() => setModal(true)} className="btn-primary gap-2">
            <Plus size={15} strokeWidth={2} /> Crear mi primera cuenta
          </button>
        }
      />

      <div className="page-body space-y-6 md:space-y-8">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {data.cuentas.map((c) => (
                  <CuentaCard key={c.id} c={c} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <CuentaModal
        open={modal}
        onClose={() => setModal(false)}
        onSaved={handleSaved}
      />
    </>
  );
}

// ── Modal de creación ─────────────────────────────────────────────────────────
function CuentaModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    nombre: '', tipo: 'ahorros', saldo_inicial: 0,
    tiene_tea: false, tea_anual: '',
  });
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const { active, step }      = useTutorial();
  const isTutorial            = active && step === 0; // mostrar pistas en paso 0

  useEffect(() => {
    if (open) {
      setForm({ nombre: '', tipo: 'ahorros', saldo_inicial: 0, tiene_tea: false, tea_anual: '' });
      setError(null);
    }
  }, [open]);

  // Preview del rendimiento proyectado a 1 año (para el campo TEA)
  const saldoBase   = parseFloat(form.saldo_inicial) || 0;
  const teaVal      = parseFloat(form.tea_anual) || 0;
  const proyeccion1a = form.tiene_tea && saldoBase > 0 && teaVal > 0
    ? saldoBase * Math.pow(1 + teaVal / 100, 1) - saldoBase
    : null;

  const submit = async (e) => {
    e.preventDefault();
    if (form.tiene_tea && (teaVal <= 0 || teaVal > 999)) {
      setError('La tasa debe estar entre 0.01% y 999%');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const meta = tipoMeta(form.tipo);
      await api.createCuenta({
        nombre:        form.nombre,
        tipo:          form.tipo,
        saldo_inicial: parseFloat(form.saldo_inicial) || 0,
        color:         meta.color,
        icono:         'wallet',
        tea_anual:     form.tiene_tea && teaVal > 0 ? teaVal : null,
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} eyebrow="Nueva cuenta" title="Crear billetera">
      <form onSubmit={submit} className="space-y-6">

        {/* Nombre */}
        <div>
          <label className="label">Nombre</label>
          <input
            className="input"
            value={form.nombre}
            onChange={e => setForm({ ...form, nombre: e.target.value })}
            placeholder="Ej. Bancolombia ahorros"
            autoFocus
            required
          />
          {isTutorial && (
            <p className="text-[11px] text-gold/80 mt-1.5">
              💡 Algo reconocible: "Bancolombia nómina", "Nequi", "Efectivo billetera", "Tarjeta Falabella"
            </p>
          )}
        </div>

        {/* Tipo */}
        <div>
          <label className="label">Tipo</label>
          <div className="grid grid-cols-5 gap-2">
            {TIPOS.map(t => {
              const Icon    = t.icon;
              const isActive = form.tipo === t.value;
              return (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setForm({ ...form, tipo: t.value })}
                  className={`flex flex-col items-center gap-1.5 py-3 border rounded-sm transition-all
                    ${isActive ? 'border-ink bg-ink text-paper' : 'border-ink/15 text-ink/70 hover:border-ink/40'}`}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-wide">{t.label}</span>
                </button>
              );
            })}
          </div>
          {isTutorial && (
            <p className="text-[11px] text-gold/80 mt-1.5">
              💡 <b>Ahorros</b> = banco · <b>Efectivo</b> = billetera física · <b>Tarjeta</b> = crédito (puede ser negativo) · <b>Inversión</b> = CDT, fondos
            </p>
          )}
        </div>

        {/* Saldo inicial */}
        <div>
          <label className="label">Saldo inicial (COP)</label>
          <input
            className="input num"
            type="number"
            step="0.01"
            value={form.saldo_inicial}
            onChange={e => setForm({ ...form, saldo_inicial: e.target.value })}
          />
          {isTutorial && (
            <p className="text-[11px] text-gold/80 mt-1.5">
              💡 ¿Cuánto tienes exactamente ahí <b>HOY</b>? Para tarjetas de crédito, ingresa el valor <b>negativo</b> de tu deuda actual.
            </p>
          )}
          <p className="text-xs text-ink/45 mt-1.5">Para tarjetas de crédito usa valores negativos.</p>
        </div>

        {/* Toggle TEA */}
        <div className="border border-ink/10 rounded-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">¿Esta cuenta genera rendimiento?</p>
              <p className="text-xs text-ink/45 mt-0.5">CDTs, cuentas de ahorro con tasa pactada, etc.</p>
            </div>
            {/* Toggle switch */}
            <button
              type="button"
              onClick={() => setForm({ ...form, tiene_tea: !form.tiene_tea, tea_anual: '' })}
              className={`relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0 ${
                form.tiene_tea ? 'bg-ink' : 'bg-ink/20'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-paper rounded-full shadow-sm transition-transform duration-200 ${
                  form.tiene_tea ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Campo TEA — visible solo si el toggle está activo */}
          {form.tiene_tea && (
            <div className="animate-fade-up">
              <label className="label">Tasa Efectiva Anual (% E.A.)</label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <input
                    className="input num pr-8"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="999"
                    placeholder="Ej. 6.5"
                    value={form.tea_anual}
                    onChange={e => setForm({ ...form, tea_anual: e.target.value })}
                    autoFocus
                  />
                  <span className="absolute right-0 bottom-2.5 text-xs text-ink/40 font-medium">% E.A.</span>
                </div>
              </div>

              {/* Preview de proyección a 1 año */}
              {proyeccion1a !== null && (
                <div className="mt-3 flex items-center gap-2 text-xs text-sage">
                  <TrendingUp size={12} strokeWidth={2} />
                  <span>
                    En 1 año generaría aprox.{' '}
                    <strong className="font-semibold">{formatCOP(proyeccion1a)}</strong>
                    {' '}en intereses sobre el saldo inicial.
                  </span>
                </div>
              )}
            </div>
          )}
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
