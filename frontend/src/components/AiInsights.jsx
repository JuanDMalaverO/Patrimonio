// src/components/AiInsights.jsx
import { useState, useEffect } from 'react';
import {
  Sparkles, TriangleAlert, TrendingUp, Lightbulb,
  AlertCircle, RefreshCw, Lock, ArrowRight, ChevronRight,
  Flag, Shield,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCheckout } from '../contexts/CheckoutContext.jsx';
import { api } from '../services/api.js';
import { formatCOP } from '../utils/format.js';

// ── Tipo de insight ───────────────────────────────────────────────────────────
const TIPO = {
  alerta:      { icon: TriangleAlert, color: 'text-rust',  bg: 'bg-rust/8',  border: 'border-rust/20',  label: 'Alerta'      },
  riesgo:      { icon: AlertCircle,   color: 'text-ink',   bg: 'bg-ink/5',   border: 'border-ink/15',   label: 'Riesgo'      },
  positivo:    { icon: TrendingUp,    color: 'text-sage',  bg: 'bg-sage/8',  border: 'border-sage/20',  label: 'Positivo'    },
  oportunidad: { icon: Lightbulb,     color: 'text-gold',  bg: 'bg-gold/8',  border: 'border-gold/20',  label: 'Oportunidad' },
};

function scoreColor(v) {
  if (v >= 80) return '#5a6b58';
  if (v >= 60) return '#a88a3a';
  return '#a8472a';
}

function tiempoRelativo(s) {
  if (!s) return '';
  const m = (Date.now() - new Date(s).getTime()) / 60000;
  if (m < 2)  return 'Ahora mismo';
  if (m < 60) return `Hace ${Math.floor(m)} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

// ── Score desglosado ──────────────────────────────────────────────────────────
function ScoreSection({ score }) {
  const color = scoreColor(score.valor);
  return (
    <div className="space-y-4">
      {/* Score global */}
      <div className="flex items-center gap-5 p-5 bg-ink text-paper rounded-sm">
        <div className="flex-shrink-0 text-center w-16">
          <div className="font-display text-5xl tracking-tightest leading-none" style={{ color: '#f5f3ee' }}>
            {score.valor}
          </div>
          <div className="text-[10px] text-paper/40 mt-1">/ 100</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-2 flex-1 bg-paper/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${score.valor}%`, background: color }}
              />
            </div>
            <span className="text-sm font-bold flex-shrink-0" style={{ color }}>
              {score.etiqueta}
            </span>
          </div>
          <p className="text-xs text-paper/55 leading-relaxed">{score.razon}</p>
        </div>
      </div>

      {/* Componentes 2×2 */}
      {score.componentes?.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {score.componentes.map((c, i) => {
            const pct  = (c.puntaje / c.max) * 100;
            const col  = scoreColor(pct);
            return (
              <div key={i} className="border border-ink/10 rounded-sm p-4 bg-bone/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-ink/45 font-medium leading-tight">
                    {c.nombre}
                  </span>
                  <span className="font-display text-lg leading-none" style={{ color: col }}>
                    {c.puntaje}
                    <span className="text-[10px] text-ink/30 font-sans">/{c.max}</span>
                  </span>
                </div>
                <div className="h-1 bg-ink/8 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} />
                </div>
                <p className="text-[11px] text-ink/55 leading-relaxed">{c.detalle}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Card de insight ───────────────────────────────────────────────────────────
function InsightCard({ insight }) {
  const t    = TIPO[insight.tipo] || TIPO.riesgo;
  const Icon = t.icon;
  return (
    <div className={`rounded-sm border ${t.border} ${t.bg} p-4`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${t.color}`}>
          <Icon size={14} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[9px] uppercase tracking-[0.18em] font-semibold ${t.color} mb-1`}>
            {t.label}
          </div>
          <p className="text-sm font-semibold text-ink leading-tight mb-1.5">{insight.titulo}</p>
          <p className="text-sm text-ink/65 leading-relaxed">{insight.descripcion}</p>
          {insight.accion && (
            <div className="mt-2.5 flex items-start gap-1.5">
              <ChevronRight size={11} className="text-ink/40 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-ink/70 leading-relaxed">{insight.accion}</p>
            </div>
          )}
          {insight.impacto && (
            <div className="mt-1.5 flex items-start gap-1.5">
              <ArrowRight size={11} className="text-ink/30 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <p className="text-xs text-ink/45 italic leading-relaxed">{insight.impacto}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Proyección de metas ───────────────────────────────────────────────────────
function MetasProyeccion({ metas }) {
  if (!metas?.length) return null;
  return (
    <div className="space-y-3">
      <div className="eyebrow">Proyección de metas</div>
      {metas.map((m, i) => (
        <div key={i} className="border border-gold/20 bg-gold/5 rounded-sm p-4 flex items-start gap-3">
          <Flag size={14} className="text-gold flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink mb-1">{m.nombre}</p>
            <p className="text-sm text-ink/65 leading-relaxed">{m.comentario}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Carga ─────────────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="py-12 flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-10 h-10 border-2 border-ink/10 border-t-ink rounded-full animate-spin" />
        <Sparkles size={14} className="absolute inset-0 m-auto text-ink/40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-ink">Analizando tus finanzas…</p>
        <p className="text-xs text-ink/40 mt-1">Puede tomar unos segundos</p>
      </div>
    </div>
  );
}

// ── Teaser free ───────────────────────────────────────────────────────────────
function LockedCard() {
  const { openCheckout } = useCheckout();
  return (
    <section className="card-elevated overflow-hidden">
      <div className="px-8 py-5 border-b border-ink/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-gold" strokeWidth={1.5} />
          <span className="eyebrow">Análisis financiero con IA</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold border border-gold/30 px-2 py-0.5 rounded-sm">
          Premium
        </span>
      </div>

      <div className="relative">
        {/* Mock borroso */}
        <div className="p-8 space-y-4 blur-sm pointer-events-none select-none opacity-40" aria-hidden>
          <div className="h-20 bg-ink/90 rounded-sm" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-ink/8 rounded-sm border border-ink/10" />
            <div className="h-20 bg-sage/8 rounded-sm border border-sage/15" />
            <div className="h-20 bg-rust/8 rounded-sm border border-rust/15" />
            <div className="h-20 bg-gold/8 rounded-sm border border-gold/15" />
          </div>
          <div className="space-y-3">
            <div className="h-16 bg-rust/8 rounded-sm border border-rust/15" />
            <div className="h-16 bg-gold/8 rounded-sm border border-gold/15" />
          </div>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-paper/85 backdrop-blur-[3px]">
          <div className="text-center max-w-sm px-4">
            <div className="w-12 h-12 rounded-sm bg-gold/10 flex items-center justify-center mx-auto mb-4">
              <Lock size={20} strokeWidth={1.5} className="text-gold" />
            </div>
            <p className="font-display text-xl tracking-tightest mb-2">Análisis con IA</p>
            <p className="text-sm text-ink/55 leading-relaxed">
              Score desglosado, insights con tus números reales y proyección de metas.
              Desde <strong>$19.900/mes</strong> o <strong>$149.000/año</strong>.
            </p>
          </div>
          <button onClick={() => openCheckout('annual')} className="btn-primary gap-2">
            <Sparkles size={14} strokeWidth={1.5} />
            Activar Premium
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AiInsights({ periodo }) {
  const { user } = useAuth();
  const isPremium = user?.plan === 'premium';

  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  useEffect(() => {
    if (!isPremium) return;
    setLoading(true);
    setError(null);
    api.getInsights(periodo)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [periodo, isPremium]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      setData(await api.refreshInsights(periodo));
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  if (!isPremium) return <LockedCard />;

  return (
    <section className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-ink/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles size={15} className="text-gold" strokeWidth={1.5} />
          <span className="eyebrow">Análisis financiero con IA</span>
          {data?._meta && (
            <span className="text-[10px] text-ink/35 ml-1">
              · {tiempoRelativo(data._meta.generado_at)}
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="btn-ghost py-1.5 px-2.5 text-xs gap-1.5 disabled:opacity-40"
          title="Regenerar análisis"
        >
          <RefreshCw size={12} strokeWidth={1.5} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Analizando…' : 'Actualizar'}
        </button>
      </div>

      {/* Cuerpo */}
      <div className="p-6 md:p-8">
        {(loading || refreshing) && !data && <LoadingState />}

        {error && (
          <div className="text-sm text-rust border border-rust/20 bg-rust/5 px-4 py-3 rounded-sm leading-relaxed">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="space-y-7">
            {/* 1. Score desglosado */}
            {data.score && <ScoreSection score={data.score} />}

            {/* 2. Insights */}
            {data.insights?.length > 0 && (
              <div className="space-y-3">
                <div className="eyebrow">Insights detectados</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {data.insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                </div>
              </div>
            )}

            {/* 3. Proyección de metas */}
            {data.metas_proyeccion?.length > 0 && (
              <MetasProyeccion metas={data.metas_proyeccion} />
            )}
          </div>
        )}

        {refreshing && data && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-1.5 text-xs text-ink/40">
              <RefreshCw size={11} className="animate-spin" />
              Regenerando con datos actualizados…
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
