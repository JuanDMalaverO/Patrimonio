// src/pages/PagoResultado.jsx
// Página de retorno tras el pago en Wompi.
// Consulta el estado del pago con reintentos y actualiza el usuario si se aprobó.
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../services/api.js';

export default function PagoResultado() {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const { refreshUser }   = useAuth();
  const ref               = searchParams.get('ref');

  // 'checking' | 'aprobado' | 'declinado' | 'pendiente' | 'error'
  const [status, setStatus] = useState('checking');
  const [plan, setPlan]     = useState(null);

  useEffect(() => {
    if (!ref) { setStatus('error'); return; }

    let attempt = 0;
    const delays = [1500, 2500, 3500, 5000, 7000, 9000]; // 6 intentos, ~29s total

    const check = async () => {
      try {
        const data = await api.estadoPago(ref);
        setPlan(data.plan);

        if (data.estado === 'aprobado') {
          await refreshUser();
          setStatus('aprobado');
        } else if (data.estado === 'declinado' || data.estado === 'anulado') {
          setStatus('declinado');
        } else if (attempt < delays.length) {
          setTimeout(check, delays[attempt++]);
        } else {
          setStatus('pendiente'); // Webhook aún no llegó — mostrar mensaje de espera
        }
      } catch {
        if (attempt < delays.length) {
          setTimeout(check, delays[attempt++]);
        } else {
          setStatus('error');
        }
      }
    };

    check();
  }, [ref]);

  const PLAN_LABEL = { monthly: 'Mensual', annual: 'Anual' };

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="relative w-14 h-14 mx-auto">
            <div className="w-14 h-14 border-2 border-ink/10 border-t-gold rounded-full animate-spin" />
            <Sparkles size={18} className="absolute inset-0 m-auto text-gold/60" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-semibold text-ink text-lg">Confirmando tu pago…</p>
            <p className="text-sm text-ink/45 mt-1">Esto puede tardar unos segundos</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'aprobado') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm animate-fade-up">
          <div className="w-16 h-16 rounded-sm bg-sage/10 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-sage" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-display text-3xl tracking-tightest mb-2">¡Bienvenido a Premium!</p>
            <p className="text-sm text-ink/55 leading-relaxed">
              Tu plan {plan ? PLAN_LABEL[plan] : 'Premium'} está activo. Ya tienes acceso
              completo al análisis financiero con IA.
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="btn-primary gap-2 mx-auto"
          >
            <Sparkles size={14} strokeWidth={1.5} />
            Ir al dashboard
            <ArrowRight size={14} strokeWidth={2} />
          </button>
          <p className="text-xs text-ink/30">
            Recibirás un email de confirmación de Wompi con el recibo.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'declinado') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm animate-fade-up">
          <div className="w-16 h-16 rounded-sm bg-rust/10 flex items-center justify-center mx-auto">
            <XCircle size={32} className="text-rust" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-display text-3xl tracking-tightest mb-2">Pago no procesado</p>
            <p className="text-sm text-ink/55 leading-relaxed">
              Tu banco no aprobó el pago. Verifica los datos de tu tarjeta o intenta
              con otro método de pago.
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-primary gap-2 mx-auto">
            Volver al dashboard <ArrowRight size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  if (status === 'pendiente') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-sm animate-fade-up">
          <div className="w-16 h-16 rounded-sm bg-gold/10 flex items-center justify-center mx-auto">
            <Clock size={32} className="text-gold" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-display text-3xl tracking-tightest mb-2">Pago en proceso</p>
            <p className="text-sm text-ink/55 leading-relaxed">
              Tu pago está siendo procesado. En menos de 5 minutos tu plan Premium
              se activará automáticamente.
            </p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="btn-primary gap-2 mx-auto">
            Ir al dashboard <ArrowRight size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // Error genérico
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <p className="font-semibold text-ink">No pudimos verificar tu pago</p>
        <p className="text-sm text-ink/50">
          Si realizaste el pago correctamente, tu plan se activará en unos minutos.
          Si el problema persiste, escríbenos a soporte@mypatrimony.com
        </p>
        <button onClick={() => navigate('/dashboard')} className="btn-ghost text-sm">
          Volver al dashboard
        </button>
      </div>
    </div>
  );
}
