// src/components/CheckoutModal.jsx
// Modal de selección de plan + apertura del widget Wompi.
// Flujo: usuario elige plan → llama backend para obtener params firmados
//        → carga script Wompi → abre widget → Wompi redirige a /pago/resultado
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Check, ArrowRight, Shield, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../services/api.js';

const PLANS = {
  monthly: {
    id:          'monthly',
    label:       'Mensual',
    price:       19900,
    priceStr:    '$19.900',
    period:      'por mes',
    perMonth:    '$19.900/mes',
    badge:       null,
    highlight:   false,
  },
  annual: {
    id:          'annual',
    label:       'Anual',
    price:       149000,
    priceStr:    '$149.000',
    period:      'por año',
    perMonth:    '$12.417/mes',
    savings:     '$89.800',
    savingsPct:  38,
    monthsFree:  '4 meses gratis',
    badge:       'Más popular',
    highlight:   true,
  },
};

const FEATURES = [
  'Score de salud financiera (0–100)',
  'Desglose en 4 componentes clave',
  'Insights con números reales de tus datos',
  'Proyección personalizada de tus metas',
  'Recomendaciones accionables cada mes',
];

function loadWompiScript() {
  return new Promise((resolve, reject) => {
    if (window.WidgetCheckout) { resolve(); return; }
    const s    = document.createElement('script');
    s.src      = 'https://checkout.wompi.co/widget.js';
    s.onload   = resolve;
    s.onerror  = () => reject(new Error('No se pudo cargar el sistema de pago. Verifica tu conexión.'));
    document.head.appendChild(s);
  });
}

export default function CheckoutModal({ open, onClose, defaultPlan = 'annual' }) {
  const { user } = useAuth();
  const [plan, setPlan]       = useState(defaultPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  if (!open) return null;

  const selected = PLANS[plan];

  const handlePay = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.iniciarPago(plan);
      await loadWompiScript();
      onClose();

      const checkout = new window.WidgetCheckout({
        currency:      'COP',
        amountInCents: data.monto_en_centavos,
        reference:     data.referencia,
        publicKey:     data.public_key,
        redirectUrl:   data.redirect_url,
        signature:     { integrity: data.integrity_hash },
        ...(user?.email ? { customerData: { email: user.email } } : {}),
      });

      checkout.open(({ transaction }) => {
        if (transaction?.status === 'APPROVED') {
          window.location.href = `/pago/resultado?ref=${encodeURIComponent(data.referencia)}&status=approved`;
        } else if (transaction?.status === 'DECLINED') {
          window.location.href = `/pago/resultado?ref=${encodeURIComponent(data.referencia)}&status=declined`;
        }
        // Si el usuario cierra sin pagar, no redirigir
      });
    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-paper border border-ink/15 rounded-sm shadow-2xl w-full max-w-lg animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-ink/10">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-gold" strokeWidth={1.5} />
            <span className="font-semibold text-ink">Activar Patrimonio Premium</span>
          </div>
          <button onClick={onClose} className="text-ink/40 hover:text-ink p-1 transition-colors">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Plan selector */}
        <div className="px-6 pt-5">
          <p className="text-xs text-ink/45 uppercase tracking-[0.15em] font-medium mb-3">Elige tu plan</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(PLANS).map(p => (
              <button
                key={p.id}
                onClick={() => setPlan(p.id)}
                className={`relative text-left p-4 rounded-sm border transition-all ${
                  plan === p.id
                    ? p.highlight
                      ? 'border-ink bg-ink text-paper'
                      : 'border-ink bg-bone/60'
                    : 'border-ink/15 hover:border-ink/40'
                }`}
              >
                {p.badge && plan === p.id && (
                  <span className="absolute -top-2.5 left-3 text-[10px] uppercase tracking-[0.15em] font-bold bg-gold text-paper px-2 py-0.5 rounded-sm">
                    {p.badge}
                  </span>
                )}
                {p.badge && plan !== p.id && (
                  <span className="absolute -top-2.5 left-3 text-[10px] uppercase tracking-[0.15em] font-bold bg-ink/20 text-ink px-2 py-0.5 rounded-sm">
                    {p.badge}
                  </span>
                )}
                <div className="text-[10px] uppercase tracking-[0.15em] font-medium opacity-60 mb-1">
                  {p.label}
                </div>
                <div className="font-display text-2xl tracking-tightest leading-none mb-0.5">
                  {p.priceStr}
                </div>
                <div className="text-[11px] opacity-55">{p.period}</div>
                {p.perMonth && plan === p.id && (
                  <div className="text-[11px] opacity-70 mt-1 font-medium">{p.perMonth}</div>
                )}
                {p.savings && (
                  <div className={`mt-2 text-[11px] font-semibold ${plan === p.id ? 'text-gold' : 'text-sage'}`}>
                    Ahorras {p.savings} · {p.monthsFree}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Savings callout for annual */}
          {plan === 'annual' && (
            <div className="mt-3 flex items-center gap-2 bg-sage/8 border border-sage/20 rounded-sm px-3 py-2">
              <Zap size={13} className="text-sage flex-shrink-0" strokeWidth={2} />
              <p className="text-xs text-sage font-medium">
                Equivale a pagar solo 8 meses — 4 meses completamente gratis al año.
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="px-6 pt-4">
          <p className="text-xs text-ink/45 uppercase tracking-[0.15em] font-medium mb-2.5">
            Incluye en Premium
          </p>
          <ul className="space-y-2">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-ink/70">
                <Check size={12} className="text-sage flex-shrink-0" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mt-4 text-sm text-rust border border-rust/20 bg-rust/5 px-4 py-3 rounded-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pt-4 pb-6 mt-1">
          <button
            onClick={handlePay}
            disabled={loading}
            className="w-full btn-primary py-3 text-sm gap-2 justify-center disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                Preparando pago…
              </>
            ) : (
              <>
                <Sparkles size={14} strokeWidth={1.5} />
                Pagar {selected.priceStr} · {selected.label}
                <ArrowRight size={14} strokeWidth={2} />
              </>
            )}
          </button>
          <div className="flex items-center justify-center gap-1.5 mt-3">
            <Shield size={11} className="text-ink/30" strokeWidth={1.5} />
            <span className="text-[11px] text-ink/35">Pago procesado por Wompi · Bancolombia</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
