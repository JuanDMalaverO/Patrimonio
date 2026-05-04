// src/components/AiInsights.jsx
import { useState, useEffect } from 'react';
import {
  Sparkles, TriangleAlert, TrendingUp, Lightbulb,
  AlertCircle, RefreshCw, Lock, ArrowRight, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../services/api.js';

// ── Config visual por tipo de insight ────────────────────────────────────────
const TIPO_META = {
  alerta:       { icon: TriangleAlert, color: 'text-rust',  bg: 'bg-rust/8',  border: 'border-rust/20',  label: 'Alerta'      },
  riesgo:       { icon: AlertCircle,   color: 'text-ink',   bg: 'bg-ink/5',   border: 'border-ink/15',   label: 'Riesgo'      },
  positivo:     { icon: TrendingUp,    color: 'text-sage',  bg: 'bg-sage/8',  border: 'border-sage/20',  label: 'Positivo'    },
  oportunidad:  { icon: Lightbulb,     color: 'text-gold',  bg: 'bg-gold/8',  border: 'border-gold/20',  label: 'Oportunidad' },
};

// ── Score config ──────────────────────────────────────────────────────────────
function scoreColor(valor) {
  if (valor >= 90) return '#5a6b58';
  if (valor >= 75) return '#5a6b58';
  if (valor >= 60) return '#a88a3a';
  if (valor >= 40) return '#a88a3a';
  return '#a8472a';
}

// ── Tiempo relativo ───────────────────────────────────────────────────────────
function tiempoRelativo(fechaStr) {
  if (!fechaStr) return '';
  const diff = (Date.now() - new Date(fechaStr).getTime()) / 60000;
  if (diff < 2)  return 'Ahora mismo';
  if (diff < 60) return `Hace ${Math.floor(diff)} min`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

// ── Card de insight individual ────────────────────────────────────────────────
function InsightCard({ insight }) {
  const meta = TIPO_META[insight.tipo] || TIPO_META.riesgo;
  const Icon = meta.icon;

  return (
    <div className={`rounded-sm border ${meta.border} ${meta.bg} p-5`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 mt-0.5 ${meta.color}`}>
          <Icon size={15} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`text-[9px] uppercase tracking-[0.18em] font-semibold ${meta.color}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-ink leading-tight mb-1.5">
            {insight.titulo}
          </p>
          <p className="text-sm text-ink/65 leading-relaxed">
            {insight.descripcion}
          </p>
          {insight.accion && (
            <div className="mt-3 flex items-start gap-1.5">
              <ChevronRight size={12} className="text-ink/40 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-ink/70 leading-relaxed">{insight.accion}</p>
            </div>
          )}
          {insight.impacto && (
            <div className="mt-1.5 flex items-start gap-1.5">
              <ArrowRight size={12} className="text-ink/30 mt-0.5 flex-shrink-0" strokeWidth={1.5} />
              <p className="text-xs text-ink/50 italic leading-relaxed">{insight.impacto}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Card de score ─────────────────────────────────────────────────────────────
function ScoreCard({ score }) {
  const color = scoreColor(score.valor);
  return (
    <div className="flex items-center gap-5 p-5 border border-ink/10 rounded-sm bg-paper">
      <div className="flex-shrink-0 text-center">
        <div className="font-display text-5xl tracking-tightest leading-none" style={{ color }}>
          {score.valor}
        </div>
        <div className="text-[10px] text-ink/40 mt-1">/ 100</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1.5 flex-1 bg-ink/8 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${score.valor}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-xs font-semibold flex-shrink-0" style={{ color }}>
            {score.etiqueta}
          </span>
        </div>
        <p className="text-xs text-ink/55 leading-relaxed">{score.razon}</p>
      </div>
    </div>
  );
}

// ── Estado de carga ───────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="py-10 flex flex-col items-center gap-4">
      <div className="relative">
        <div className="w-10 h-10 border-2 border-ink/10 border-t-ink rounded-full animate-spin" />
        <Sparkles size={14} className="absolute inset-0 m-auto text-ink/40" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-ink">Analizando tus finanzas…</p>
        <p className="text-xs text-ink/40 mt-1">Esto puede tomar unos segundos</p>
      </div>
    </div>
  );
}

// ── Card bloqueada para usuarios free ─────────────────────────────────────────
function LockedCard({ onUpgrade, upgrading }) {
  return (
    <section className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-ink/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={15} className="text-gold" strokeWidth={1.5} />
          <span className="eyebrow">Análisis con IA</span>
        </div>
        <span className="text-[10px] uppercase tracking-[0.18em] text-gold font-semibold border border-gold/30 px-2 py-0.5 rounded-sm">
          Premium
        </span>
      </div>

      {/* Contenido borroso + overlay */}
      <div className="relative">
        {/* Mock borroso */}
        <div className="p-8 space-y-3 blur-[3px] pointer-events-none select-none opacity-50" aria-hidden>
          <div className="h-16 bg-ink/5 rounded-sm" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-rust/8 rounded-sm border border-rust/15" />
            <div className="h-24 bg-sage/8 rounded-sm border border-sage/15" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-24 bg-gold/8 rounded-sm border border-gold/15" />
            <div className="h-24 bg-ink/5 rounded-sm border border-ink/10" />
          </div>
        </div>

        {/* Overlay de upgrade */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-paper/80 backdrop-blur-[2px]">
          <div className="text-center max-w-xs">
            <div className="w-11 h-11 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-4">
              <Lock size={18} strokeWidth={1.5} className="text-gold" />
            </div>
            <p className="font-semibold text-ink mb-1">Análisis financiero con IA</p>
            <p className="text-sm text-ink/55 leading-relaxed">
              Patrones detectados, recomendaciones accionables y score financiero mensual.
            </p>
          </div>
          <button
            onClick={onUpgrade}
            disabled={upgrading}
            className="btn-primary gap-2 disabled:opacity-60"
          >
            {upgrading
              ? <span className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
              : <><Sparkles size={14} /> Activar Premium</>
            }
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AiInsights({ periodo }) {
  const { user, upgradePlan } = useAuth();
  const isPremium = user?.plan === 'premium';

  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!isPremium) return;
    setLoading(true);
    api.getInsights(periodo)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [periodo, isPremium]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const d = await api.refreshInsights(periodo);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradePlan();
    } finally {
      setUpgrading(false);
    }
  };

  if (!isPremium) {
    return <LockedCard onUpgrade={handleUpgrade} upgrading={upgrading} />;
  }

  return (
    <section className="card-elevated overflow-hidden">
      {/* Header */}
      <div className="px-8 py-5 border-b border-ink/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Sparkles size={15} className="text-gold" strokeWidth={1.5} />
          <span className="eyebrow">Análisis con IA</span>
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
      <div className="p-8">
        {(loading || refreshing) && !data && <LoadingState />}

        {error && (
          <div className="text-sm text-rust border border-rust/20 bg-rust/5 px-4 py-3 rounded-sm">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="space-y-5">
            {/* Score */}
            {data.score && <ScoreCard score={data.score} />}

            {/* Insights */}
            {data.insights?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.insights.map((insight, i) => (
                  <InsightCard key={i} insight={insight} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overlay sutil cuando refreshing sobre datos existentes */}
        {refreshing && data && (
          <div className="mt-4 text-center text-xs text-ink/40">
            <span className="inline-flex items-center gap-1.5">
              <RefreshCw size={11} className="animate-spin" />
              Regenerando con datos actualizados…
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
