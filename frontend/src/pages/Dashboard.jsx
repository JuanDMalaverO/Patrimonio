// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Wallet, Plus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCheckout } from '../contexts/CheckoutContext.jsx';
import AiInsights from '../components/AiInsights.jsx';
import {
  AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, YAxis
} from 'recharts';
import { api } from '../services/api';
import { formatCOP, periodLabel, currentPeriod, formatDateShort } from '../utils/format';
import PageHeader from '../components/PageHeader';
import { Loading, ErrorBox, Empty } from '../components/States';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openCheckout } = useCheckout();
  const isPremium = user?.plan === 'premium';
  const periodo = currentPeriod();

  useEffect(() => {
    setLoading(true);
    api.getDashboard(periodo)
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [periodo]);

  if (loading) return <><PageHeader eyebrow={`Periodo · ${periodLabel(periodo)}`} title="Resumen" /><Loading /></>;
  if (err) return <><PageHeader eyebrow="Periodo" title="Resumen" /><ErrorBox message={err} /></>;
  if (!data) return null;

  const { patrimonio_neto, total_cuentas, flujo_mes, top_categorias, tendencia_diaria } = data;
  const balancePositivo = flujo_mes.balance >= 0;

  return (
    <>
      <PageHeader
        eyebrow={`Periodo · ${periodLabel(periodo)}`}
        title="Resumen"
        subtitle="Estado consolidado de tu patrimonio, flujo de efectivo y comportamiento de gasto del periodo en curso."
        actions={
          <button onClick={() => navigate('/transacciones?nuevo=1')} className="btn-primary">
            <Plus size={16} strokeWidth={1.5} />
            Registrar movimiento
          </button>
        }
      />

      <div className="page-body space-y-6 md:space-y-10">
        {/* HERO PATRIMONIO */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-1 md:col-span-7 border border-ink/10 bg-ink text-paper rounded-sm p-6 md:p-10 relative overflow-hidden" data-tutorial="patrimonio-hero">
            {/* Marca de agua decorativa */}
            <div
              className="absolute -right-10 -bottom-20 font-display text-[280px] leading-none text-paper/[0.04] select-none pointer-events-none"
              aria-hidden
            >
              $
            </div>
            <div className="relative">
              <div className="eyebrow text-paper/50 mb-4">Patrimonio neto consolidado</div>
              <div className="num text-6xl md:text-7xl font-light tracking-tightest leading-none">
                {formatCOP(patrimonio_neto)}
              </div>
              <div className="mt-6 flex items-center gap-6 text-sm text-paper/70">
                <div className="flex items-center gap-2">
                  <Wallet size={14} strokeWidth={1.5} />
                  <span>{total_cuentas} {total_cuentas === 1 ? 'cuenta activa' : 'cuentas activas'}</span>
                </div>
                <div className="h-3 w-px bg-paper/20" />
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} strokeWidth={1.5} />
                  <span>Tasa de ahorro {flujo_mes.tasa_ahorro}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Balance del mes */}
          <div className="col-span-1 md:col-span-5 grid grid-cols-2 md:grid-cols-1 grid-rows-1 md:grid-rows-2 gap-4 md:gap-6">
            <Stat
              eyebrow="Ingresos del mes"
              valor={flujo_mes.ingresos}
              icon={<ArrowDownRight size={18} className="text-sage" strokeWidth={1.5} />}
              acento="sage"
            />
            <Stat
              eyebrow="Egresos del mes"
              valor={flujo_mes.egresos}
              icon={<ArrowUpRight size={18} className="text-rust" strokeWidth={1.5} />}
              acento="rust"
            />
          </div>
        </section>

        {/* FLUJO DE CAJA + BALANCE */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          <div className="col-span-1 lg:col-span-8 card-elevated p-5 md:p-8">
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="eyebrow mb-1">Flujo de caja</div>
                <h3 className="font-display text-2xl tracking-tightest">Ingresos vs Egresos</h3>
              </div>
              <div className="flex items-center gap-5 text-xs">
                <Legend color="bg-sage" label="Ingresos" />
                <Legend color="bg-rust" label="Egresos" />
              </div>
            </div>

            {tendencia_diaria.length === 0 ? (
              <div className="py-16">
                <Empty title="Sin movimientos" hint="No hay transacciones registradas en este periodo." />
              </div>
            ) : (
              <div className="h-72 -mx-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={tendencia_diaria} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIng" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5a6b58" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#5a6b58" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gEgr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a8472a" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#a8472a" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="fecha"
                      tickFormatter={formatDateShort}
                      tick={{ fontSize: 11, fill: '#0a0a0a80' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => formatCOP(v, { compact: true })}
                      tick={{ fontSize: 11, fill: '#0a0a0a80' }}
                      axisLine={false}
                      tickLine={false}
                      width={70}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0a0a0a',
                        border: 'none',
                        borderRadius: 2,
                        color: '#f5f3ee',
                        fontFamily: 'Manrope, sans-serif',
                        fontSize: 12,
                      }}
                      labelStyle={{ color: '#f5f3ee99', marginBottom: 4 }}
                      labelFormatter={formatDateShort}
                      formatter={(v, name) => [formatCOP(v), name === 'ingresos' ? 'Ingresos' : 'Egresos']}
                    />
                    <Area type="monotone" dataKey="ingresos" stroke="#5a6b58" strokeWidth={2} fill="url(#gIng)" />
                    <Area type="monotone" dataKey="egresos"  stroke="#a8472a" strokeWidth={2} fill="url(#gEgr)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Balance card */}
          <div className="col-span-1 lg:col-span-4 card-elevated p-5 md:p-8 flex flex-col">
            <div className="eyebrow mb-1">Balance del mes</div>
            <h3 className="font-display text-2xl tracking-tightest mb-6">Resultado neto</h3>

            <div className={`num text-5xl tracking-tightest leading-none ${balancePositivo ? 'text-sage' : 'text-rust'}`}>
              {formatCOP(flujo_mes.balance, { sign: true })}
            </div>
            <p className="text-sm text-ink/60 mt-3 leading-relaxed">
              {balancePositivo
                ? `Estás ahorrando el ${flujo_mes.tasa_ahorro}% de tus ingresos este mes.`
                : 'Tus egresos superan los ingresos del periodo.'}
            </p>

            <div className="mt-auto pt-6 border-t border-ink/10 space-y-2 text-sm">
              <Row label="Ingresos" valor={flujo_mes.ingresos} positivo />
              <Row label="Egresos"  valor={flujo_mes.egresos}  />
            </div>
          </div>
        </section>

        {/* Banner de upgrade — solo para usuarios free */}
        {!isPremium && (
          <div className="flex items-center justify-between gap-4 border border-gold/25 bg-gold/5 rounded-sm px-5 py-4 flex-wrap">
            <div className="flex items-start gap-3">
              <Sparkles size={15} className="text-gold flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <p className="text-sm font-semibold text-ink">Desbloquea el análisis con IA</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  Score financiero, insights con tus números reales y proyección de metas.
                  Desde <strong>$19.900/mes</strong> o <strong>$149.000/año</strong>.
                </p>
              </div>
            </div>
            <button
              onClick={() => openCheckout('annual')}
              className="btn-primary text-sm gap-1.5 flex-shrink-0"
            >
              <Sparkles size={13} strokeWidth={1.5} /> Activar Premium
            </button>
          </div>
        )}

        {/* IA INSIGHTS — premium arriba del fold, free con teaser bloqueado */}
        <AiInsights periodo={periodo} />

        {/* TOP CATEGORÍAS */}
        <section className="card-elevated p-5 md:p-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <div className="eyebrow mb-1">Distribución del gasto</div>
              <h3 className="font-display text-2xl tracking-tightest">Categorías con mayor egreso</h3>
            </div>
            <span className="eyebrow">Top 5</span>
          </div>

          {top_categorias.length === 0 ? (
            <Empty title="Aún sin datos" hint="Registra tus primeros egresos para ver la distribución." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
              <div className="col-span-1 md:col-span-7">
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={top_categorias} layout="vertical" margin={{ left: 0, right: 30 }}>
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="nombre"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#0a0a0a' }}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0a0a0a',
                          border: 'none',
                          borderRadius: 2,
                          color: '#f5f3ee',
                          fontSize: 12,
                        }}
                        formatter={(v) => [formatCOP(v), 'Total']}
                        cursor={{ fill: 'rgba(10,10,10,0.04)' }}
                      />
                      <Bar dataKey="total" radius={[0, 2, 2, 0]}>
                        {top_categorias.map((c, i) => (
                          <Cell key={i} fill={c.color || '#0a0a0a'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="col-span-1 md:col-span-5 space-y-3">
                {top_categorias.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-3 py-3 border-b border-ink/10 last:border-0">
                    <span className="font-mono text-[10px] text-ink/40 w-6">{String(i + 1).padStart(2, '0')}</span>
                    <span className="w-2 h-8 rounded-sm" style={{ background: c.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.nombre}</div>
                      <div className="text-xs text-ink/50">{c.porcentaje}% del gasto</div>
                    </div>
                    <div className="num text-base">{formatCOP(c.total)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Stat({ eyebrow, valor, icon, acento }) {
  return (
    <div className="card-elevated p-7 flex flex-col justify-between min-h-[140px]">
      <div className="flex items-start justify-between">
        <div className="eyebrow">{eyebrow}</div>
        <div className={`p-1.5 rounded-sm bg-${acento}/10`}>{icon}</div>
      </div>
      <div className={`num text-4xl tracking-tightest text-${acento}`}>{formatCOP(valor)}</div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="text-ink/60">{label}</span>
    </div>
  );
}

function Row({ label, valor, positivo }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink/60">{label}</span>
      <span className={`num ${positivo ? 'text-sage' : 'text-rust'}`}>
        {positivo ? '+' : '−'}{formatCOP(valor)}
      </span>
    </div>
  );
}
