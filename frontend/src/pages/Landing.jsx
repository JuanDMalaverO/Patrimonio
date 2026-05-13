import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Sparkles } from 'lucide-react';
import {
  BarChart2, TrendingUp, Wallet, Target, Tags,
  ArrowLeftRight, ArrowRight, CheckCircle,
  Shield, Zap, ChevronRight,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Datos de contenido
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: TrendingUp, num: '01',
    title: 'Patrimonio en tiempo real',
    desc: 'Visualiza tu riqueza neta y su evolución mes a mes con gráficas precisas y sin ambigüedad.',
  },
  {
    icon: Wallet, num: '02',
    title: 'Cuentas inteligentes',
    desc: 'Balances calculados dinámicamente desde tus transacciones reales. Sin datos desactualizados.',
  },
  {
    icon: Target, num: '03',
    title: 'Presupuestos con alerta',
    desc: 'Define límites por categoría. El sistema te avisa cuando te acercas o superas el tope mensual.',
  },
  {
    icon: ArrowLeftRight, num: '04',
    title: 'Historial completo',
    desc: 'Cada ingreso, gasto y transferencia registrado y filtrable por cuenta, tipo y fecha.',
  },
  {
    icon: Tags, num: '05',
    title: 'Categorías a tu medida',
    desc: 'Crea y organiza las categorías que reflejan tu estilo de vida y tus prioridades reales.',
  },
  {
    icon: BarChart2, num: '06',
    title: 'Flujo de caja claro',
    desc: 'Entiende con exactitud cuánto entra y cuánto sale cada mes. Sin sorpresas al final del período.',
  },
];

const STEPS = [
  {
    num: '1',
    title: 'Configura tus cuentas',
    desc: 'Agrega tus cuentas de ahorro, efectivo, tarjeta de crédito e inversiones. La base de tu patrimonio.',
  },
  {
    num: '2',
    title: 'Registra tus movimientos',
    desc: 'Ingresa ingresos, gastos y transferencias entre cuentas. Rápido y sin fricción.',
  },
  {
    num: '3',
    title: 'Analiza y presupuesta',
    desc: 'Descubre tus patrones de gasto, controla categorías con límites y observa crecer tu patrimonio.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Mockup visual del dashboard (sin imágenes)
// ─────────────────────────────────────────────────────────────────────────────

function MockDashboard() {
  const bars = [38, 52, 44, 68, 58, 74, 63, 85, 72, 80, 88, 100];

  return (
    <div className="relative w-full select-none pointer-events-none">
      {/* Tarjeta principal — patrimonio neto */}
      <div className="bg-paper border border-ink/10 rounded-sm shadow-[0_12px_48px_rgba(10,10,10,0.10),0_2px_8px_rgba(10,10,10,0.06)] p-6">
        <p className="eyebrow mb-3">Patrimonio neto</p>
        <p className="font-display text-[2.4rem] tracking-tightest text-ink leading-none">
          $48.720.000
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <TrendingUp size={12} className="text-sage" />
          <span className="text-xs text-sage font-medium">+12.4% vs año anterior</span>
        </div>

        {/* Mini gráfica de barras */}
        <div className="mt-5 flex items-end gap-[3px] h-12">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                backgroundColor: i === bars.length - 1 ? '#5a6b58' : 'rgba(10,10,10,0.08)',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-ink/30">Ene</span>
          <span className="text-[9px] text-ink/30">Dic</span>
        </div>

        {/* Flujo mensual */}
        <div className="mt-4 pt-4 border-t border-ink/10 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-ink/40 mb-1">Ingresos · Abr</p>
            <p className="font-display text-xl tracking-tightest text-sage">$5.800.000</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.18em] text-ink/40 mb-1">Gastos · Abr</p>
            <p className="font-display text-xl tracking-tightest text-rust">$2.340.000</p>
          </div>
        </div>
      </div>

      {/* Tarjeta — últimas transacciones */}
      <div className="mt-3 bg-paper border border-ink/10 rounded-sm shadow-[0_4px_16px_rgba(10,10,10,0.06)] p-4">
        <p className="eyebrow mb-3">Últimos movimientos</p>
        <div className="space-y-2.5">
          {[
            { label: 'Salario', sub: 'Trabajo', amt: '+$5.800.000', t: 'i' },
            { label: 'Supermercado', sub: 'Alimentación', amt: '-$320.000', t: 'e' },
            { label: 'Netflix', sub: 'Ocio', amt: '-$45.900', t: 'e' },
            { label: 'Ahorro mensual', sub: 'Transferencia', amt: '→ Ahorros', t: 't' },
          ].map((tx, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: tx.t === 'i' ? '#5a6b58' : tx.t === 'e' ? '#a8472a' : '#a88a3a' }}
                />
                <div>
                  <p className="text-[11px] font-medium text-ink leading-none">{tx.label}</p>
                  <p className="text-[9px] text-ink/40 mt-0.5">{tx.sub}</p>
                </div>
              </div>
              <span
                className="text-[11px] font-medium font-mono"
                style={{ color: tx.t === 'i' ? '#5a6b58' : tx.t === 'e' ? '#a8472a' : '#a88a3a' }}
              >
                {tx.amt}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tarjeta — presupuestos */}
      <div className="mt-3 bg-paper border border-ink/10 rounded-sm shadow-[0_4px_16px_rgba(10,10,10,0.06)] p-4">
        <p className="eyebrow mb-3">Presupuesto · Abril</p>
        <div className="space-y-2.5">
          {[
            { label: 'Alimentación', pct: 72, color: '#5a6b58' },
            { label: 'Transporte', pct: 48, color: '#a88a3a' },
            { label: 'Ocio', pct: 94, color: '#a8472a' },
          ].map((b, i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <span className="text-[10px] text-ink/70">{b.label}</span>
                <span className="text-[10px] text-ink/40">{b.pct}%</span>
              </div>
              <div className="h-1 bg-ink/10 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${b.pct}%`, backgroundColor: b.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { user, loading } = useAuth();

  // Spinner mientras verifica sesión (evita flash del landing para usuarios ya logueados)
  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-ink/20 border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  // Usuario con sesión activa → directo al dashboard
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">

      {/* ── NAV ────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-ink/10 bg-paper/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-display text-xl tracking-tightest leading-none">
            Patrimonio<span className="text-rust">·</span>
          </span>

          <nav className="hidden md:flex items-center gap-7">
            <a href="#caracteristicas" className="text-sm text-ink/55 hover:text-ink transition-colors tracking-wide">
              Características
            </a>
            <a href="#como-funciona" className="text-sm text-ink/55 hover:text-ink transition-colors tracking-wide">
              Cómo funciona
            </a>
            <a href="#suscripciones" className="text-sm text-ink/55 hover:text-ink transition-colors tracking-wide flex items-center gap-1">
              <Sparkles size={11} className="text-gold" strokeWidth={2} />
              Precios
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost text-sm">
              Iniciar sesión
            </Link>
            <Link to="/register" className="btn-primary text-sm">
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-28 grid md:grid-cols-2 gap-16 items-center">
        <div className="animate-fade-up">
          <div className="eyebrow mb-5">Finanzas personales</div>
          <h1 className="font-display text-5xl md:text-[3.5rem] tracking-tightest leading-[1.04] mb-6">
            El control financiero<br />
            que siempre<br />
            <span className="text-rust">quisiste tener.</span>
          </h1>
          <p className="text-ink/55 text-lg leading-relaxed mb-9 max-w-md">
            Registra tus cuentas, controla tus gastos y visualiza el crecimiento
            de tu patrimonio. Todo en un solo lugar, sin complejidad.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/register" className="btn-primary px-5 py-3 text-sm gap-2">
              Empieza gratis <ArrowRight size={15} />
            </Link>
            <a href="#como-funciona" className="btn-ghost px-4 py-3 text-sm">
              Cómo funciona
            </a>
          </div>
        </div>

        <div className="hidden md:block">
          <MockDashboard />
        </div>
      </section>

      {/* ── BARRA DE CONFIANZA ─────────────────────────────────────────────── */}
      <div className="border-y border-ink/10 bg-bone/40">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-center gap-10 flex-wrap">
          {[
            { icon: Shield,       text: 'Tus datos, tu servidor' },
            { icon: Zap,          text: 'Sin suscripciones ocultas' },
            { icon: CheckCircle,  text: 'Código abierto' },
          ].map(({ icon: Icon, text }, i) => (
            <div key={i} className="flex items-center gap-2 text-ink/45">
              <Icon size={14} strokeWidth={1.5} />
              <span className="text-sm">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CARACTERÍSTICAS ────────────────────────────────────────────────── */}
      <section id="caracteristicas" className="max-w-6xl mx-auto px-6 py-24">
        <div className="mb-14">
          <div className="eyebrow mb-3">Características</div>
          <h2 className="font-display text-4xl tracking-tightest max-w-lg leading-[1.08]">
            Todo lo que necesitas para entender tu dinero.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-px bg-ink/8 border border-ink/10 rounded-sm overflow-hidden">
          {FEATURES.map(({ icon: Icon, num, title, desc }) => (
            <div
              key={num}
              className="bg-paper p-7 hover:bg-bone/50 transition-colors group cursor-default"
            >
              <div className="flex items-start justify-between mb-5">
                <Icon size={19} strokeWidth={1.5} className="text-ink/45 group-hover:text-ink transition-colors" />
                <span className="font-mono text-[10px] text-ink/25">{num}</span>
              </div>
              <h3 className="font-semibold text-sm mb-2 tracking-wide">{title}</h3>
              <p className="text-sm text-ink/50 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────────────────────────── */}
      <section id="como-funciona" className="bg-ink text-paper">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-16">
            <div className="text-[10px] uppercase tracking-[0.22em] text-paper/35 font-medium mb-3">
              Cómo funciona
            </div>
            <h2 className="font-display text-4xl tracking-tightest text-paper max-w-xl leading-[1.08]">
              Tres pasos para tener claridad financiera.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {STEPS.map(({ num, title, desc }, i) => (
              <div key={num} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-full w-12 h-px bg-paper/10 -translate-x-6" />
                )}
                <div className="font-display text-7xl tracking-tightest text-paper/8 leading-none mb-5 select-none">
                  {num}
                </div>
                <h3 className="font-semibold text-paper mb-2.5">{title}</h3>
                <p className="text-sm text-paper/50 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SPOTLIGHT: PRESUPUESTOS ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-28 grid md:grid-cols-2 gap-20 items-center">
        {/* Visual */}
        <div className="order-2 md:order-1">
          <div className="card p-6 max-w-sm shadow-[0_8px_32px_rgba(10,10,10,0.08)]">
            <p className="eyebrow mb-5">Presupuesto · Abril 2026</p>
            <div className="space-y-5">
              {[
                { label: 'Alimentación',    spent: '$540.000',  limit: '$750.000', pct: 72,  state: 'normal'   },
                { label: 'Transporte',      spent: '$180.000',  limit: '$400.000', pct: 45,  state: 'normal'   },
                { label: 'Entretenimiento', spent: '$282.000',  limit: '$300.000', pct: 94,  state: 'alerta'   },
                { label: 'Ropa',            spent: '$195.000',  limit: '$150.000', pct: 130, state: 'excedido' },
              ].map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between items-baseline mb-1.5">
                    <span className="text-sm font-medium text-ink">{b.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-ink/35 font-mono">
                        {b.spent} / {b.limit}
                      </span>
                      {b.state === 'alerta' && (
                        <span className="text-[9px] uppercase tracking-wider text-gold font-semibold">
                          Alerta
                        </span>
                      )}
                      {b.state === 'excedido' && (
                        <span className="text-[9px] uppercase tracking-wider text-rust font-semibold">
                          Excedido
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 bg-ink/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(b.pct, 100)}%`,
                        backgroundColor:
                          b.state === 'excedido' ? '#a8472a'
                          : b.state === 'alerta'   ? '#a88a3a'
                          : '#5a6b58',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Texto */}
        <div className="order-1 md:order-2">
          <div className="eyebrow mb-4">Presupuestos</div>
          <h2 className="font-display text-4xl tracking-tightest mb-6 leading-[1.08]">
            Gasta con intención.{' '}
            <span className="text-sage">No con sorpresas.</span>
          </h2>
          <p className="text-ink/55 leading-relaxed mb-7">
            Define cuánto quieres gastar en cada categoría cada mes. Patrimonio hace el
            seguimiento automáticamente y te muestra con exactitud cuándo estás llegando
            al límite, antes de que lo superes.
          </p>
          <ul className="space-y-3">
            {[
              'Límites personalizados por categoría',
              'Tres estados: normal, alerta y excedido',
              'Cálculo automático desde tus transacciones',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-ink/65">
                <ChevronRight size={13} className="text-sage flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── PRECIOS ────────────────────────────────────────────────────────── */}
      <section id="suscripciones" className="border-t border-ink/10">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="mb-14 text-center">
            <div className="eyebrow mb-3">Precios</div>
            <h2 className="font-display text-4xl tracking-tightest max-w-lg mx-auto leading-[1.08]">
              Empieza gratis. Escala cuando lo necesites.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto items-start">

            {/* FREE */}
            <div className="card p-8 flex flex-col">
              <div className="mb-6">
                <div className="eyebrow mb-2">Free</div>
                <div className="font-display text-5xl tracking-tightest leading-none">$0</div>
                <p className="text-sm text-ink/45 mt-1">Para siempre</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-8">
                {[
                  'Patrimonio neto en tiempo real',
                  'Cuentas con saldo dinámico',
                  'Movimientos ilimitados',
                  'Presupuestos por categoría',
                  'Metas de ahorro',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-ink/70">
                    <span className="w-1 h-1 rounded-full bg-sage flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn-ghost w-full justify-center py-2.5">
                Comenzar gratis
              </Link>
            </div>

            {/* PREMIUM MENSUAL */}
            <div className="card p-8 flex flex-col">
              <div className="mb-6">
                <div className="eyebrow mb-2">Premium Mensual</div>
                <div className="font-display text-5xl tracking-tightest leading-none">$19.900</div>
                <p className="text-sm text-ink/45 mt-1">COP / mes</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-8">
                <li className="text-xs text-ink/40 uppercase tracking-wider font-medium">Todo lo de Free, más:</li>
                {[
                  'Score de salud financiera',
                  'Insights con cifras reales',
                  'Proyección de tus metas con IA',
                  'Análisis mensual personalizado',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-ink/70">
                    <Sparkles size={10} className="text-gold flex-shrink-0" strokeWidth={2} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link to="/register" className="btn-ghost w-full justify-center py-2.5">
                Empezar — luego activa
              </Link>
            </div>

            {/* PREMIUM ANUAL — destacado */}
            <div className="bg-ink text-paper rounded-sm p-8 flex flex-col relative overflow-hidden">
              <div className="absolute -top-px left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold to-gold/0" />
              <div className="absolute -right-4 -bottom-8 font-display text-[120px] leading-none text-paper/[0.03] select-none pointer-events-none" aria-hidden>✦</div>

              <div className="relative mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-paper/40 font-medium">Premium Anual</div>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-gold text-paper px-2 py-0.5 rounded-sm">
                    Más popular
                  </span>
                </div>
                <div className="font-display text-5xl tracking-tightest leading-none text-paper">$149.000</div>
                <p className="text-sm text-paper/40 mt-1">COP / año · $12.417/mes</p>
                <div className="mt-2 inline-flex items-center gap-1.5 bg-gold/15 border border-gold/30 rounded-sm px-2.5 py-1">
                  <Sparkles size={10} className="text-gold" strokeWidth={2} />
                  <span className="text-[11px] font-semibold text-gold">Ahorras $89.800 · 4 meses gratis</span>
                </div>
              </div>

              <div className="w-full h-px bg-paper/10 mb-6" />

              <ul className="space-y-2.5 flex-1 mb-8">
                <li className="text-xs text-paper/35 uppercase tracking-wider font-medium">Todo lo de Free, más:</li>
                {[
                  'Score de salud financiera',
                  'Insights con cifras reales',
                  'Proyección de tus metas con IA',
                  'Análisis mensual personalizado',
                  'Ahorro vs plan mensual: $89.800',
                ].map(item => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-paper/80">
                    <Sparkles size={10} className="text-gold flex-shrink-0" strokeWidth={2} />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-paper text-ink px-4 py-2.5 text-sm font-medium tracking-wide hover:bg-bone transition-colors rounded-sm"
              >
                <Sparkles size={13} className="text-gold" />
                Crear cuenta y activar
              </Link>
            </div>
          </div>

          <p className="text-center text-xs text-ink/35 mt-8">
            Pagos procesados de forma segura por <strong>Wompi · Bancolombia</strong>.
            PSE, tarjetas, Nequi y Daviplata.
          </p>
        </div>
      </section>

      {/* ── CTA FINAL ──────────────────────────────────────────────────────── */}
      <section className="border-t border-ink/10">
        <div className="max-w-6xl mx-auto px-6 py-28 text-center">
          <div className="eyebrow mb-6">Empieza hoy</div>
          <h2 className="font-display text-5xl md:text-[3.5rem] tracking-tightest mb-6 max-w-2xl mx-auto leading-[1.04]">
            Construye tu patrimonio con claridad.
          </h2>
          <p className="text-ink/50 text-lg mb-10 max-w-sm mx-auto leading-relaxed">
            Toma el control real de tus finanzas personales desde hoy mismo.
          </p>
          <Link to="/register" className="btn-primary px-6 py-3 text-base gap-2">
            Crear cuenta gratis <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-ink/10">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <div>
            <p className="font-display text-lg tracking-tightest leading-none">
              Patrimonio<span className="text-rust">·</span>
            </p>
            <p className="text-xs text-ink/35 mt-1">Finanzas personales · 2026</p>
          </div>
          <p className="text-xs text-ink/30">Construido con cuidado.</p>
        </div>
      </footer>

    </div>
  );
}
