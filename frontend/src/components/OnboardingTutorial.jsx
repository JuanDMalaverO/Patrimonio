// src/components/OnboardingTutorial.jsx
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, X, Wallet, ArrowLeftRight, Target, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

// ── Visuales por paso ────────────────────────────────────────────────────────

function VisualBienvenida({ nombre }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 select-none">
      <div className="relative mb-6">
        <div
          className="font-display text-[5rem] leading-none tracking-tightest text-ink/6 absolute -top-4 -left-8 pointer-events-none select-none"
          aria-hidden
        >
          $
        </div>
        <p className="font-display text-4xl tracking-tightest leading-none relative z-10">
          Patrimonio<span className="text-rust">·</span>
        </p>
      </div>
      <div className="w-12 h-px bg-ink/15 mb-6" />
      <p className="font-display text-2xl tracking-tightest text-center leading-tight">
        Hola, <span className="text-sage">{nombre.split(' ')[0]}</span>.
      </p>
      <p className="text-sm text-ink/45 mt-2 text-center">Tu control financiero empieza aquí.</p>
    </div>
  );
}

function VisualCuentas() {
  const items = [
    { label: 'Cuenta de ahorros', valor: '$28.000.000', color: '#5a6b58', delay: 0 },
    { label: 'Tarjeta de crédito', valor: '$4.200.000',  color: '#a88a3a', delay: 80 },
    { label: 'Efectivo',          valor: '$350.000',    color: '#0a0a0a', delay: 160 },
  ];
  return (
    <div className="w-full space-y-2.5 py-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="border border-ink/10 rounded-sm px-4 py-3 flex items-center justify-between bg-paper animate-fade-up"
          style={{ animationDelay: `${item.delay}ms`, animationFillMode: 'both' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm font-medium text-ink">{item.label}</span>
          </div>
          <span className="font-display text-base tracking-tightest" style={{ color: item.color }}>
            {item.valor}
          </span>
        </div>
      ))}
      <div className="border border-ink/10 border-dashed rounded-sm px-4 py-3 flex items-center justify-center gap-2 text-ink/30 text-sm">
        <span>+ Agregar cuenta</span>
      </div>
    </div>
  );
}

function VisualMovimientos() {
  const rows = [
    { label: 'Salario julio',     cat: 'Trabajo',       monto: '+$5.800.000', tipo: 'i', delay: 0   },
    { label: 'Supermercado',      cat: 'Alimentación',  monto: '−$320.000',   tipo: 'e', delay: 80  },
    { label: 'Ahorro mensual',    cat: 'Transferencia', monto: '⇄ Ahorros',   tipo: 't', delay: 160 },
    { label: 'Netflix',           cat: 'Ocio',          monto: '−$45.900',    tipo: 'e', delay: 240 },
  ];
  const colors = { i: '#5a6b58', e: '#a8472a', t: '#a88a3a' };
  return (
    <div className="w-full border border-ink/10 rounded-sm overflow-hidden">
      {rows.map((r, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-ink/8 last:border-0 animate-fade-up bg-paper"
          style={{ animationDelay: `${r.delay}ms`, animationFillMode: 'both' }}
        >
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[r.tipo] }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink truncate">{r.label}</p>
            <p className="text-[10px] text-ink/40">{r.cat}</p>
          </div>
          <span className="text-sm font-mono font-medium" style={{ color: colors[r.tipo] }}>{r.monto}</span>
        </div>
      ))}
    </div>
  );
}

function VisualPresupuestos() {
  const items = [
    { label: 'Alimentación', pct: 68, color: '#5a6b58', delay: 0   },
    { label: 'Transporte',   pct: 45, color: '#a88a3a', delay: 80  },
    { label: 'Ocio',         pct: 94, color: '#a8472a', delay: 160 },
    { label: 'Ropa',         pct: 30, color: '#5a6b58', delay: 240 },
  ];
  return (
    <div className="w-full space-y-4 py-2">
      {items.map((b, i) => (
        <div
          key={i}
          className="animate-fade-up"
          style={{ animationDelay: `${b.delay}ms`, animationFillMode: 'both' }}
        >
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-sm font-medium text-ink">{b.label}</span>
            <span className="text-xs font-mono text-ink/40">{b.pct}%</span>
          </div>
          <div className="h-1.5 bg-ink/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${b.pct}%`, backgroundColor: b.color, transitionDelay: `${b.delay + 200}ms` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function VisualListo() {
  return (
    <div className="flex flex-col items-center py-6 select-none">
      <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mb-5 animate-fade-up">
        <TrendingUp size={28} strokeWidth={1.5} className="text-sage" />
      </div>
      <div className="grid grid-cols-3 gap-3 w-full">
        {[
          { icon: Wallet,          label: 'Cuentas',      color: 'bg-sage/10 text-sage' },
          { icon: ArrowLeftRight,  label: 'Movimientos',  color: 'bg-gold/10 text-gold' },
          { icon: Target,          label: 'Presupuestos', color: 'bg-rust/10 text-rust' },
        ].map(({ icon: Icon, label, color }, i) => (
          <div
            key={i}
            className="border border-ink/10 rounded-sm p-3 flex flex-col items-center gap-2 animate-fade-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
          >
            <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${color}`}>
              <Icon size={15} strokeWidth={1.5} />
            </div>
            <span className="text-[11px] text-ink/60">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Datos de los pasos ────────────────────────────────────────────────────────

const STEPS = [
  {
    eyebrow: '01 de 05',
    title:   (n) => `Bienvenido/a, ${n.split(' ')[0]}.`,
    body:    'Patrimonio es tu espacio para entender y hacer crecer tu dinero. En menos de dos minutos te mostramos todo lo que necesitas saber.',
    Visual:  VisualBienvenida,
    cta:     'Empezar el recorrido',
  },
  {
    eyebrow: '02 de 05',
    title:   () => 'Todo empieza con tus cuentas.',
    body:    'Una cuenta es cualquier lugar donde tienes dinero: banco, efectivo, tarjeta de crédito, inversiones. Crea todas las que necesites.',
    Visual:  VisualCuentas,
    cta:     'Siguiente',
  },
  {
    eyebrow: '03 de 05',
    title:   () => 'Registra cada movimiento.',
    body:    'Ingresos, egresos y transferencias entre cuentas. Patrimonio calcula tu saldo actual en tiempo real a partir de tus transacciones.',
    Visual:  VisualMovimientos,
    cta:     'Siguiente',
  },
  {
    eyebrow: '04 de 05',
    title:   () => 'Controla tus gastos con presupuestos.',
    body:    'Define un límite mensual por categoría. Patrimonio te avisa cuando llegas al 80% y cuando lo superas. Sin sorpresas al cerrar el mes.',
    Visual:  VisualPresupuestos,
    cta:     'Siguiente',
  },
  {
    eyebrow: '05 de 05',
    title:   () => 'Todo listo para empezar.',
    body:    'Crea tu primera cuenta y comienza a construir tu patrimonio desde hoy.',
    Visual:  VisualListo,
    cta:     'Crear mi primera cuenta',
    secondary: 'Explorar el dashboard',
  },
];

// ── Componente principal ──────────────────────────────────────────────────────

export default function OnboardingTutorial() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [animKey, setAnimKey] = useState(0); // fuerza re-animación al cambiar paso

  const current = STEPS[step];
  const isLast  = step === STEPS.length - 1;
  const isFirst = step === 0;

  const goTo = useCallback((n) => {
    setStep(n);
    setAnimKey(k => k + 1);
  }, []);

  const next = () => {
    if (!isLast) goTo(step + 1);
  };
  const prev = () => {
    if (!isFirst) goTo(step - 1);
  };

  // Navegar por teclado
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft')                        prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step]);

  const finish = async (goToCuentas = false) => {
    await completeOnboarding();
    if (goToCuentas) navigate('/cuentas');
  };

  const Visual = current.Visual;
  const title  = current.title(user?.nombre_completo ?? '');

  const modal = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink/55 backdrop-blur-[3px] p-4">
      <div className="relative w-full max-w-md bg-paper rounded-sm shadow-[0_32px_96px_rgba(10,10,10,0.35),0_4px_16px_rgba(10,10,10,0.15)] overflow-hidden">

        {/* Barra de progreso superior */}
        <div className="h-0.5 bg-ink/8 w-full">
          <div
            className="h-full bg-ink transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Cabecera */}
        <div className="flex items-center justify-between px-7 pt-6 pb-0">
          <span className="eyebrow">{current.eyebrow}</span>
          <button
            onClick={() => finish(false)}
            className="text-ink/30 hover:text-ink/60 transition-colors p-1 -mr-1"
            title="Saltar tutorial"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Cuerpo animado — key fuerza remount y re-animación */}
        <div key={animKey} className="px-7 pt-5 pb-6 animate-fade-up">

          {/* Visual */}
          <div className="mb-6">
            <Visual nombre={user?.nombre_completo ?? ''} />
          </div>

          {/* Texto */}
          <h2 className="font-display text-2xl tracking-tightest leading-[1.1] mb-3">
            {title}
          </h2>
          <p className="text-sm text-ink/55 leading-relaxed">
            {current.body}
          </p>

        </div>

        {/* Footer */}
        <div className="px-7 pb-7 pt-1">
          {/* Puntos indicadores */}
          <div className="flex justify-center gap-1.5 mb-5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === step
                    ? 'w-5 h-1.5 bg-ink'
                    : i < step
                      ? 'w-1.5 h-1.5 bg-ink/30'
                      : 'w-1.5 h-1.5 bg-ink/12'
                }`}
              />
            ))}
          </div>

          {/* Botones de navegación */}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="btn-ghost px-3 py-2.5 flex-shrink-0"
              >
                <ArrowLeft size={15} strokeWidth={1.5} />
              </button>
            )}

            {isLast ? (
              <div className="flex-1 flex flex-col gap-2">
                <button
                  onClick={() => finish(true)}
                  className="btn-primary w-full justify-center py-2.5 gap-2"
                >
                  {current.cta} <ArrowRight size={15} />
                </button>
                <button
                  onClick={() => finish(false)}
                  className="text-sm text-ink/45 hover:text-ink/70 text-center transition-colors py-1"
                >
                  {current.secondary}
                </button>
              </div>
            ) : (
              <button
                onClick={next}
                className="btn-primary flex-1 justify-center py-2.5 gap-2"
              >
                {current.cta} <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  // Portal: renderiza directamente en document.body para escapar el
  // stacking context del Layout (animate-fade-up aplica transform, lo que
  // convierte al padre en containing block y rompe position:fixed).
  return createPortal(modal, document.body);
}
