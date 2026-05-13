// src/components/Layout.jsx
import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Wallet, ArrowLeftRight, Target, Tags, Flag,
  LogOut, Sparkles, Settings, Menu, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useTutorial } from '../contexts/TutorialContext.jsx';

const NAV = [
  { to: '/dashboard',     label: 'Resumen',      icon: LayoutDashboard, num: '01' },
  { to: '/cuentas',       label: 'Cuentas',      icon: Wallet,          num: '02' },
  { to: '/transacciones', label: 'Movimientos',  icon: ArrowLeftRight,  num: '03' },
  { to: '/presupuestos',  label: 'Presupuestos', icon: Target,          num: '04' },
  { to: '/metas',         label: 'Metas',        icon: Flag,            num: '05' },
  { to: '/categorias',    label: 'Categorías',   icon: Tags,            num: '06' },
  { to: '/configuracion', label: 'Configuración',icon: Settings,        num: '07' },
];

function SidebarContent({ onNavClick }) {
  const navigate    = useNavigate();
  const { user, logout } = useAuth();
  const firstName   = user?.nombre_completo?.split(' ')[0] ?? 'Usuario';

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Marca */}
      <div className="px-6 py-7 border-b border-ink/10 flex-shrink-0">
        <div className="eyebrow mb-1">Finanzas · 2026</div>
        <h1 className="font-display text-2xl tracking-tightest leading-none">
          Patrimonio<span className="text-rust">·</span>
        </h1>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {NAV.map(({ to, label, icon: Icon, num }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onNavClick}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 text-sm transition-all rounded-sm
               ${isActive
                  ? 'bg-ink text-paper'
                  : 'text-ink/70 hover:text-ink hover:bg-ink/5'}`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`font-mono text-[10px] w-4 ${isActive ? 'text-paper/50' : 'text-ink/30'}`}>
                  {num}
                </span>
                <Icon size={15} strokeWidth={1.5} />
                <span className="font-medium tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer: plan + usuario + logout */}
      <div className="px-4 py-4 border-t border-ink/10 space-y-3 flex-shrink-0">
        {user?.plan === 'premium' ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-gold/8 border border-gold/20">
            <Sparkles size={11} className="text-gold flex-shrink-0" strokeWidth={2} />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-gold">Premium</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-ink/5 border border-ink/10">
            <span className="text-[10px] uppercase tracking-[0.18em] font-medium text-ink/35">Plan Free</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-sage flex-shrink-0 animate-pulse" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-ink truncate">{firstName}</p>
            <p className="text-[10px] text-ink/40 truncate">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex-shrink-0 p-1.5 text-ink/35 hover:text-rust transition-colors rounded-sm hover:bg-rust/5"
          >
            <LogOut size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const location          = useLocation();
  const [open, setOpen]   = useState(false);
  const { active }        = useTutorial();

  return (
    <div className="min-h-screen flex bg-paper">

      {/* ── SIDEBAR DESKTOP (md+) ─────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 lg:w-64 border-r border-ink/10 bg-paper flex-shrink-0 sticky top-0 h-screen flex-col">
        <SidebarContent onNavClick={() => {}} />
      </aside>

      {/* ── DRAWER MOBILE (<md) ───────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 w-72 bg-paper border-r border-ink/10 flex flex-col animate-slide-left">
            <SidebarContent onNavClick={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── ÁREA DE CONTENIDO ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top bar mobile */}
        <div className="md:hidden sticky top-0 z-30 bg-paper/95 backdrop-blur-sm border-b border-ink/10 px-4 h-14 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="p-2 -ml-2 text-ink/60 hover:text-ink transition-colors"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>
          <span className="font-display text-lg tracking-tightest leading-none">
            Patrimonio<span className="text-rust">·</span>
          </span>
          {/* Spacer para centrar el logo */}
          <div className="w-8" />
        </div>

        {/* Contenido principal */}
        <main className={`flex-1 min-w-0 ${active ? 'pb-20' : ''}`}>
          <div key={location.pathname} className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
