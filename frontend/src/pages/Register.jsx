// src/pages/Register.jsx
import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

// Calcula la fortaleza de la contraseña (0–4)
function passwordStrength(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8)             s++;
  if (p.length >= 12)            s++;
  if (/[A-Z]/.test(p))          s++;
  if (/[0-9]/.test(p))          s++;
  if (/[^A-Za-z0-9]/.test(p))   s++;
  return Math.min(s, 4);
}

const STRENGTH_LABEL = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
const STRENGTH_COLOR = ['', 'bg-rust', 'bg-gold', 'bg-sage/70', 'bg-sage'];

export default function Register() {
  const { user, loading, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre_completo:  '',
    email:            '',
    password:         '',
    password_confirm: '',
    accepted_terms:   false,
  });
  const [showPass, setShowPass]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  // Si ya hay sesión activa, redirigir al dashboard
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const set = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (form.password !== form.password_confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await register({
        nombre_completo: form.nombre_completo,
        email:           form.email,
        password:        form.password,
        accepted_terms:  form.accepted_terms,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const strength      = passwordStrength(form.password);
  const passNoMatch   = form.password_confirm && form.password !== form.password_confirm;
  const canSubmit     = form.accepted_terms && !submitting;

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

      {/* Contenido centrado */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[360px] animate-fade-up">

          {/* Encabezado */}
          <div className="mb-10">
            <p className="eyebrow mb-3">Crear cuenta</p>
            <h1 className="font-display text-[2rem] tracking-tightest leading-[1.1]">
              Empieza a construir<br />tu patrimonio.
            </h1>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="space-y-7">

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
                  autoFocus
                  required
                  minLength={2}
                />
              </div>

              {/* Email */}
              <div>
                <label className="label">Correo electrónico</label>
                <input
                  type="email"
                  className="input"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={set('email')}
                  autoComplete="email"
                  required
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

                {/* Indicador de fortaleza */}
                {form.password && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-0.5 flex-1 rounded-full transition-colors duration-300 ${
                            i <= strength ? STRENGTH_COLOR[strength] : 'bg-ink/10'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-ink/40 w-12 text-right">
                      {STRENGTH_LABEL[strength]}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirmar contraseña */}
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
                {passNoMatch && (
                  <p className="text-[11px] text-rust mt-1.5">Las contraseñas no coinciden</p>
                )}
              </div>

              {/* Términos */}
              <div className="flex items-start gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, accepted_terms: !prev.accepted_terms }))}
                  className={`w-4 h-4 mt-0.5 flex-shrink-0 border rounded-sm flex items-center justify-center transition-colors ${
                    form.accepted_terms
                      ? 'bg-ink border-ink'
                      : 'border-ink/30 hover:border-ink/60'
                  }`}
                >
                  {form.accepted_terms && (
                    <Check size={9} strokeWidth={3} className="text-paper" />
                  )}
                </button>
                <p className="text-sm text-ink/55 leading-relaxed">
                  Acepto los{' '}
                  <span className="text-ink underline underline-offset-2 cursor-pointer">
                    términos y condiciones
                  </span>{' '}
                  de uso de Patrimonio
                </p>
              </div>

            </div>

            {/* Error */}
            {error && (
              <div className="mt-5 text-sm text-rust border border-rust/20 bg-rust/5 px-4 py-3 rounded-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary w-full justify-center mt-8 py-3 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? <span className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                : <> Crear cuenta <ArrowRight size={15} /> </>
              }
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-sm text-ink/45 text-center">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-ink underline underline-offset-4 hover:text-ink/70 transition-colors">
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
