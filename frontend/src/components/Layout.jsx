// src/components/Layout.jsx
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, ArrowLeftRight, Target, Tags } from 'lucide-react';

const NAV = [
  { to: '/dashboard',     label: 'Resumen',       icon: LayoutDashboard, num: '01' },
  { to: '/cuentas',       label: 'Cuentas',       icon: Wallet,          num: '02' },
  { to: '/transacciones', label: 'Movimientos',   icon: ArrowLeftRight,  num: '03' },
  { to: '/presupuestos',  label: 'Presupuestos',  icon: Target,          num: '04' },
  { to: '/categorias',    label: 'Categorías',    icon: Tags,            num: '05' },
];

export default function Layout({ children }) {
  const location = useLocation();
  return (
    <div className="min-h-screen flex">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-ink/10 bg-paper flex-shrink-0 sticky top-0 h-screen flex flex-col">
        {/* Marca */}
        <div className="px-6 py-7 border-b border-ink/10">
          <div className="eyebrow mb-1">Finanzas · 2026</div>
          <h1 className="font-display text-2xl tracking-tightest leading-none">
            Patrimonio<span className="text-rust">.</span>
          </h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon, num }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 text-sm transition-all rounded-sm
                 ${isActive
                    ? 'bg-ink text-paper'
                    : 'text-ink/70 hover:text-ink hover:bg-ink/5'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`font-mono text-[10px] ${isActive ? 'text-paper/60' : 'text-ink/40'}`}>{num}</span>
                  <Icon size={16} strokeWidth={1.5} />
                  <span className="font-medium tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer marca */}
        <div className="px-6 py-5 border-t border-ink/10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sage animate-pulse" />
            <span className="text-xs text-ink/60">Conectado · Demo</span>
          </div>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 min-w-0">
        <div key={location.pathname} className="animate-fade-up">
          {children}
        </div>
      </main>
    </div>
  );
}
