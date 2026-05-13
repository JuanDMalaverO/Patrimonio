// src/pages/Configuracion.jsx
import { useState } from 'react';
import { Sun, Moon, Sparkles, Eye, EyeOff, Check, LogOut, User, Lock, Palette, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCheckout } from '../contexts/CheckoutContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';
import { api } from '../services/api.js';
import PageHeader from '../components/PageHeader.jsx';

// ── Sección genérica de ajustes ───────────────────────────────────────────────
function Section({ icon: Icon, title, children }) {
  return (
    <div className="card-elevated overflow-hidden">
      <div className="px-6 py-4 border-b border-ink/10 flex items-center gap-2.5">
        <Icon size={15} strokeWidth={1.5} className="text-ink/50" />
        <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
      </div>
      <div className="divide-y divide-ink/8">{children}</div>
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-xs text-ink/45 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ── Toggle de tema visual ─────────────────────────────────────────────────────
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-1 p-1 rounded-sm border border-ink/10 bg-bone/30">
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
          theme === 'light' ? 'bg-paper shadow-sm text-ink border border-ink/10' : 'text-ink/50 hover:text-ink'
        }`}
      >
        <Sun size={13} strokeWidth={1.8} /> Claro
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs font-medium transition-all ${
          theme === 'dark' ? 'bg-paper shadow-sm text-ink border border-ink/10' : 'text-ink/50 hover:text-ink'
        }`}
      >
        <Moon size={13} strokeWidth={1.8} /> Oscuro
      </button>
    </div>
  );
}

// ── Formulario de perfil ──────────────────────────────────────────────────────
function ProfileForm({ user, onUpdate }) {
  const [nombre, setNombre]     = useState(user?.nombre_completo ?? '');
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      await api.updateProfile({ nombre_completo: nombre });
      onUpdate(nombre);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="px-6 py-5 space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="label">Nombre completo</label>
          <input
            className="input"
            value={nombre}
            onChange={e => { setNombre(e.target.value); setError(''); setSuccess(false); }}
            required
            minLength={2}
          />
        </div>
        <div>
          <label className="label">Correo electrónico</label>
          <input
            className="input opacity-50 cursor-not-allowed"
            value={user?.email ?? ''}
            readOnly
            tabIndex={-1}
          />
          <p className="text-[10px] text-ink/40 mt-1">El email no se puede modificar</p>
        </div>
      </div>
      {error   && <p className="text-sm text-rust">{error}</p>}
      {success && <p className="text-sm text-sage flex items-center gap-1.5"><Check size={13} /> Nombre actualizado</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 gap-2">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

// ── Formulario de contraseña ──────────────────────────────────────────────────
function PasswordForm() {
  const [form, setForm]       = useState({ password_actual: '', password_nueva: '', password_confirmar: '' });
  const [show, setShow]       = useState(false);
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const noMatch = form.password_nueva && form.password_confirmar && form.password_nueva !== form.password_confirmar;

  const submit = async (e) => {
    e.preventDefault();
    if (noMatch) return;
    setSaving(true); setError(''); setSuccess(false);
    try {
      await api.changePassword(form);
      setForm({ password_actual: '', password_nueva: '', password_confirmar: '' });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  const EyeBtn = () => (
    <button type="button" tabIndex={-1} onClick={() => setShow(s => !s)}
      className="absolute right-0 bottom-2.5 text-ink/35 hover:text-ink/70 transition-colors">
      {show ? <EyeOff size={14} strokeWidth={1.5} /> : <Eye size={14} strokeWidth={1.5} />}
    </button>
  );

  return (
    <form onSubmit={submit} className="px-6 py-5 space-y-5">
      <div className="grid sm:grid-cols-3 gap-5">
        <div>
          <label className="label">Contraseña actual</label>
          <div className="relative">
            <input type={show ? 'text' : 'password'} className="input pr-7"
              value={form.password_actual} onChange={set('password_actual')} required />
            <EyeBtn />
          </div>
        </div>
        <div>
          <label className="label">Nueva contraseña</label>
          <input type={show ? 'text' : 'password'} className="input"
            value={form.password_nueva} onChange={set('password_nueva')} required minLength={8}
            placeholder="Mín. 8 caracteres" />
        </div>
        <div>
          <label className="label">Confirmar nueva</label>
          <input type={show ? 'text' : 'password'} className="input"
            value={form.password_confirmar} onChange={set('password_confirmar')} required />
          {noMatch && <p className="text-[11px] text-rust mt-1">No coinciden</p>}
        </div>
      </div>
      {error   && <p className="text-sm text-rust">{error}</p>}
      {success && <p className="text-sm text-sage flex items-center gap-1.5"><Check size={13} /> Contraseña actualizada</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !!noMatch} className="btn-primary disabled:opacity-50">
          {saving ? 'Actualizando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  );
}

// ── Sección de suscripción ────────────────────────────────────────────────────
function SubscriptionSection({ user }) {
  const { openCheckout } = useCheckout();
  const isPremium = user?.plan === 'premium';

  const expiryDate = user?.plan_expires_at
    ? new Date(user.plan_expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="px-6 py-5 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isPremium
              ? <><Sparkles size={14} className="text-gold" strokeWidth={2} /><span className="text-sm font-semibold text-gold">Plan Premium activo</span></>
              : <span className="text-sm font-semibold text-ink">Plan Free</span>
            }
          </div>
          <p className="text-xs text-ink/50">
            {isPremium
              ? 'Acceso completo al análisis financiero con IA y todas las funciones premium.'
              : 'Funciones core ilimitadas. Activa Premium para análisis con IA.'
            }
          </p>
          {isPremium && expiryDate && (
            <p className="text-xs text-ink/40 mt-1">Válido hasta: {expiryDate}</p>
          )}
        </div>
        {!isPremium && (
          <button
            onClick={() => openCheckout('annual')}
            className="btn-primary text-sm gap-1.5 flex-shrink-0"
          >
            <Sparkles size={13} strokeWidth={1.5} />
            Activar Premium
          </button>
        )}
      </div>

      {!isPremium && (
        <div className="border border-ink/8 rounded-sm p-4 bg-bone/30 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-semibold text-ink">Mensual</p>
            <p className="font-display text-2xl tracking-tightest mt-0.5">$19.900</p>
            <p className="text-xs text-ink/45">COP / mes</p>
          </div>
          <div className="relative">
            <span className="absolute -top-2.5 left-0 text-[10px] font-bold uppercase tracking-wider bg-gold text-paper px-1.5 py-0.5 rounded-sm">
              Mejor valor
            </span>
            <p className="font-semibold text-ink mt-1">Anual</p>
            <p className="font-display text-2xl tracking-tightest mt-0.5">$149.000</p>
            <p className="text-xs text-ink/45">COP / año · 4 meses gratis</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Configuracion() {
  const { user, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  const handleProfileUpdate = (nombre) => {
    setUser(prev => prev ? { ...prev, nombre_completo: nombre } : null);
  };

  return (
    <>
      <PageHeader
        eyebrow="Sección 07"
        title="Configuración"
        subtitle="Gestiona tu perfil, seguridad, apariencia y suscripción."
      />

      <div className="page-body space-y-5">

        {/* Perfil */}
        <Section icon={User} title="Mi cuenta">
          <ProfileForm user={user} onUpdate={handleProfileUpdate} />
        </Section>

        {/* Seguridad */}
        <Section icon={Lock} title="Seguridad">
          <PasswordForm />
        </Section>

        {/* Apariencia */}
        <Section icon={Palette} title="Apariencia">
          <Row label="Tema" hint="Cambia entre modo claro y oscuro.">
            <ThemeToggle />
          </Row>
        </Section>

        {/* Suscripción */}
        <Section icon={CreditCard} title="Suscripción">
          <SubscriptionSection user={user} />
        </Section>

        {/* Sesión */}
        <Section icon={LogOut} title="Sesión">
          <Row label="Cerrar sesión" hint="Finaliza tu sesión en este dispositivo.">
            <button onClick={handleLogout} className="btn-ghost text-sm text-rust border-rust/20 hover:bg-rust/5">
              <LogOut size={14} strokeWidth={1.5} /> Cerrar sesión
            </button>
          </Row>
        </Section>

      </div>
    </>
  );
}
