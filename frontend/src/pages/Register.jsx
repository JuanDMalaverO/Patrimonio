// src/pages/Register.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Check, Mail, RotateCcw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { api } from '../services/api.js';

// ── Fortaleza de contraseña ───────────────────────────────────────────────────
function passwordStrength(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8)           s++;
  if (p.length >= 12)          s++;
  if (/[A-Z]/.test(p))        s++;
  if (/[0-9]/.test(p))        s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}
const STRENGTH_LABEL = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
const STRENGTH_COLOR = ['', 'bg-rust', 'bg-gold', 'bg-sage/70', 'bg-sage'];

// ── Input OTP — 6 cajas con auto-avance y soporte de pegado ──────────────────
function OtpInput({ value = '', onChange, disabled, hasError }) {
  const containerRef = useRef(null);

  const focusAt = useCallback((i) => {
    const inputs = containerRef.current?.querySelectorAll('input');
    if (inputs) inputs[Math.max(0, Math.min(5, i))]?.focus();
  }, []);

  useEffect(() => {
    // Al montar, hacer foco en la primera caja vacía
    if (!disabled) {
      const firstEmpty = [...(value)].findIndex(c => !c);
      focusAt(firstEmpty === -1 ? 5 : firstEmpty);
    }
  }, []); // eslint-disable-line

  const handleChange = (i, e) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    const arr = value.padEnd(6, ' ').split('');
    arr[i] = digit || ' ';
    const next = arr.join('').trimEnd();
    onChange(next.replace(/ /g, ''));
    if (digit && i < 5) focusAt(i + 1);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const arr = value.padEnd(6, ' ').split('');
      if (arr[i] && arr[i] !== ' ') {
        arr[i] = ' ';
        onChange(arr.join('').trimEnd().replace(/ /g, ''));
      } else if (i > 0) {
        arr[i - 1] = ' ';
        onChange(arr.join('').trimEnd().replace(/ /g, ''));
        focusAt(i - 1);
      }
    } else if (e.key === 'ArrowLeft')  { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); focusAt(i + 1); }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(text);
    focusAt(Math.min(text.length, 5));
  };

  return (
    <div ref={containerRef} className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, i) => {
        const filled = !!value[i];
        return (
          <input
            key={i}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            value={value[i] || ''}
            onChange={(e) => handleChange(i, e)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            className={[
              'w-11 h-14 sm:w-12 sm:h-16 text-center font-display text-2xl sm:text-3xl tracking-tightest',
              'border rounded-sm transition-all duration-200 bg-paper text-ink',
              'focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed',
              hasError
                ? 'border-rust/60 bg-rust/5 focus:border-rust'
                : filled
                  ? 'border-ink/40 focus:border-ink'
                  : 'border-ink/15 focus:border-ink/60',
            ].join(' ')}
          />
        );
      })}
    </div>
  );
}

// ── Paso 1: pedir email y enviar código ──────────────────────────────────────
function StepEmail({ onCodeSent }) {
  const [email, setEmail]       = useState('');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.sendCode({ email });
      onCodeSent(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="mb-10">
        <p className="eyebrow mb-3">Crear cuenta</p>
        <h1 className="font-display text-[2rem] tracking-tightest leading-[1.1]">
          Empieza a construir<br />tu patrimonio.
        </h1>
        <p className="text-sm text-ink/50 mt-3 leading-relaxed">
          Primero verificamos que el email sea tuyo. Te enviamos un código de 6 dígitos.
        </p>
      </div>

      <form onSubmit={submit} noValidate>
        <div>
          <label className="label">Correo electrónico</label>
          <input
            type="email"
            className="input"
            placeholder="tu@email.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            autoComplete="email"
            autoFocus
            required
          />
        </div>

        {error && (
          <div className="mt-5 text-sm text-rust border border-rust/20 bg-rust/5 px-4 py-3 rounded-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !email}
          className="btn-primary w-full justify-center mt-8 py-3 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending
            ? <span className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
            : <><Mail size={15} /> Enviar código de verificación</>
          }
        </button>
      </form>
    </div>
  );
}

// ── Paso 2: código + datos de cuenta ─────────────────────────────────────────
function StepVerify({ email, onBack, onRegistered }) {
  const { register } = useAuth();

  const [otp, setOtp]           = useState('');
  const [otpOk, setOtpOk]       = useState(false);   // código validado en servidor
  const [otpError, setOtpError] = useState(false);

  const [form, setForm] = useState({
    nombre_completo: '',
    password:        '',
    password_confirm:'',
    accepted_terms:  false,
  });
  const [showPass, setShowPass]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  // Cooldown para reenviar código (60 s)
  const [cooldown, setCooldown] = useState(60);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Validar código en servidor en cuanto se completan los 6 dígitos
  useEffect(() => {
    if (otp.length !== 6) { setOtpOk(false); setOtpError(false); return; }
    let cancelled = false;
    api.verifyCode({ email, codigo: otp })
      .then(data => {
        if (!cancelled) {
          setOtpOk(data.valido);
          setOtpError(!data.valido);
        }
      })
      .catch(() => { if (!cancelled) setOtpError(true); });
    return () => { cancelled = true; };
  }, [otp, email]);

  const resendCode = async () => {
    setResending(true);
    setOtp(''); setOtpOk(false); setOtpError(false);
    try {
      await api.sendCode({ email });
      setCooldown(60);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!otpOk) { setError('El código de verificación es incorrecto.'); return; }
    if (form.password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres'); return; }
    if (form.password !== form.password_confirm) { setError('Las contraseñas no coinciden'); return; }

    setSubmitting(true);
    setError('');
    try {
      await register({
        nombre_completo: form.nombre_completo,
        email,
        password:        form.password,
        accepted_terms:  form.accepted_terms,
        codigo:          otp,
      });
      onRegistered();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const strength    = passwordStrength(form.password);
  const passNoMatch = form.password_confirm && form.password !== form.password_confirm;
  const canSubmit   = otpOk && form.accepted_terms && !submitting;

  return (
    <div className="animate-fade-up">
      <div className="mb-8">
        <p className="eyebrow mb-3">Crear cuenta · Paso 2</p>
        <h1 className="font-display text-[2rem] tracking-tightest leading-[1.1]">
          Verifica tu email.
        </h1>
      </div>

      {/* Email confirmado + cambiar */}
      <div className="flex items-center justify-between mb-6 px-4 py-3 bg-bone/50 border border-ink/10 rounded-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Mail size={14} className="text-ink/40 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-sm text-ink/70 truncate">{email}</span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-ink/50 hover:text-ink underline underline-offset-2 transition-colors flex-shrink-0 ml-3"
        >
          Cambiar
        </button>
      </div>

      <form onSubmit={submit} noValidate className="space-y-7">

        {/* OTP */}
        <div>
          <label className="label mb-3">Código de verificación</label>
          <div className="flex flex-col items-center gap-3">
            <OtpInput
              value={otp}
              onChange={setOtp}
              disabled={submitting}
              hasError={otpError}
            />

            {/* Feedback del código */}
            <div className="h-5 flex items-center justify-center">
              {otp.length === 6 && otpOk && (
                <span className="text-xs text-sage flex items-center gap-1 animate-fade-up">
                  <ShieldCheck size={13} strokeWidth={2} /> Código correcto
                </span>
              )}
              {otp.length === 6 && otpError && (
                <span className="text-xs text-rust animate-fade-up">
                  Código incorrecto. Inténtalo de nuevo.
                </span>
              )}
            </div>

            {/* Reenviar código */}
            <div className="text-center">
              {cooldown > 0 ? (
                <p className="text-xs text-ink/40">
                  Reenviar código en <span className="font-mono">{cooldown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resending}
                  className="text-xs text-ink/60 hover:text-ink underline underline-offset-2 transition-colors flex items-center gap-1 mx-auto"
                >
                  <RotateCcw size={11} strokeWidth={2} className={resending ? 'animate-spin' : ''} />
                  {resending ? 'Enviando…' : 'Reenviar código'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-ink/10" />
          <span className="text-[10px] text-ink/35 uppercase tracking-widest">Tus datos</span>
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        {/* Nombre */}
        <div>
          <label className="label">Nombre completo</label>
          <input
            type="text"
            className="input"
            placeholder="Juan Pérez"
            value={form.nombre_completo}
            onChange={set('nombre_completo')}
            autoComplete="name"
            required
            minLength={2}
          />
        </div>

        {/* Contraseña */}
        <div>
          <label className="label">Contraseña</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              className="input pr-8"
              placeholder="Mín. 8 caracteres"
              value={form.password}
              onChange={set('password')}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              tabIndex={-1}
              className="absolute right-0 bottom-2.5 text-ink/35 hover:text-ink/70 transition-colors"
              onClick={() => setShowPass(p => !p)}
            >
              {showPass ? <EyeOff size={15} strokeWidth={1.5} /> : <Eye size={15} strokeWidth={1.5} />}
            </button>
          </div>
          {form.password && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${i <= strength ? STRENGTH_COLOR[strength] : 'bg-ink/10'}`} />
                ))}
              </div>
              <span className="text-[10px] text-ink/40 w-12 text-right">{STRENGTH_LABEL[strength]}</span>
            </div>
          )}
        </div>

        {/* Confirmar */}
        <div>
          <label className="label">Confirmar contraseña</label>
          <input
            type={showPass ? 'text' : 'password'}
            className="input"
            placeholder="Repite la contraseña"
            value={form.password_confirm}
            onChange={set('password_confirm')}
            autoComplete="new-password"
            required
          />
          {passNoMatch && <p className="text-[11px] text-rust mt-1.5">Las contraseñas no coinciden</p>}
        </div>

        {/* Términos */}
        <div className="flex items-start gap-3 pt-1">
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, accepted_terms: !prev.accepted_terms }))}
            className={`w-4 h-4 mt-0.5 flex-shrink-0 border rounded-sm flex items-center justify-center transition-colors ${
              form.accepted_terms ? 'bg-ink border-ink' : 'border-ink/30 hover:border-ink/60'
            }`}
          >
            {form.accepted_terms && <Check size={9} strokeWidth={3} className="text-paper" />}
          </button>
          <p className="text-sm text-ink/55 leading-relaxed">
            Acepto los{' '}
            <span className="text-ink underline underline-offset-2 cursor-pointer">términos y condiciones</span>
            {' '}de uso de Patrimonio
          </p>
        </div>

        {error && (
          <div className="text-sm text-rust border border-rust/20 bg-rust/5 px-4 py-3 rounded-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="btn-primary w-full justify-center py-3 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? <span className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
            : <> Crear cuenta <ArrowRight size={15} /> </>
          }
        </button>
      </form>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Register() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [step, setStep]   = useState('email'); // 'email' | 'verify'
  const [email, setEmail] = useState('');

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleCodeSent = (sentEmail) => {
    setEmail(sentEmail);
    setStep('verify');
  };

  // Después de registrarse → ir directamente a Cuentas para iniciar el tutorial
  const handleRegistered = () => navigate('/cuentas', { replace: true });

  return (
    <div className="min-h-screen bg-paper flex flex-col">

      {/* Nav mínima */}
      <div className="border-b border-ink/10 px-6 h-14 flex items-center justify-between flex-shrink-0">
        <Link to="/" className="font-display text-xl tracking-tightest leading-none">
          Patrimonio<span className="text-rust">·</span>
        </Link>
        <span className="text-sm text-ink/40">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-ink underline underline-offset-4 hover:text-ink/70 transition-colors">
            Inicia sesión
          </Link>
        </span>
      </div>

      {/* Indicador de progreso */}
      <div className="h-0.5 bg-ink/8">
        <div
          className="h-full bg-ink transition-all duration-500"
          style={{ width: step === 'email' ? '50%' : '100%' }}
        />
      </div>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">
          {step === 'email'
            ? <StepEmail onCodeSent={handleCodeSent} />
            : <StepVerify
                email={email}
                onBack={() => setStep('email')}
                onRegistered={handleRegistered}
              />
          }
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 text-center">
        <p className="text-xs text-ink/30">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="underline underline-offset-2 hover:text-ink/60 transition-colors">
            Inicia sesión
          </Link>
        </p>
      </div>

    </div>
  );
}
