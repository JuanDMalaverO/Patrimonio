// src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]         = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');

  // Si ya hay sesión activa, ir directo al dashboard
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const set = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (error) setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">

      {/* Nav mínima */}
      <div className="border-b border-ink/10 px-6 h-14 flex items-center justify-between flex-shrink-0">
        <Link to="/" className="font-display text-xl tracking-tightest leading-none">
          Patrimonio<span className="text-rust">·</span>
        </Link>
        <span className="text-sm text-ink/40">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="text-ink underline underline-offset-4 hover:text-ink/70 transition-colors">
            Regístrate
          </Link>
        </span>
      </div>

      {/* Contenido centrado */}
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-[360px] animate-fade-up">

          {/* Encabezado */}
          <div className="mb-10">
            <p className="eyebrow mb-3">Iniciar sesión</p>
            <h1 className="font-display text-[2rem] tracking-tightest leading-[1.1]">
              Bienvenido de nuevo.
            </h1>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="space-y-7">

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
                  autoFocus
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
                    placeholder="········"
                    value={form.password}
                    onChange={set('password')}
                    autoComplete="current-password"
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
              disabled={submitting}
              className="btn-primary w-full justify-center mt-8 py-3 gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting
                ? <span className="w-4 h-4 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                : <> Entrar <ArrowRight size={15} /> </>
              }
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-sm text-ink/45 text-center">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-ink underline underline-offset-4 hover:text-ink/70 transition-colors">
              Créala gratis
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
