// src/components/TutorialBar.jsx
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';
import { useTutorial } from '../contexts/TutorialContext.jsx';

export default function TutorialBar() {
  const { active, step, steps, skipTutorial } = useTutorial();
  const location = useLocation();
  const navigate = useNavigate();

  if (!active) return null;

  const current    = steps[step];
  const onThisPage = location.pathname === current.path;

  const bar = (
    <div
      // En desktop se desplaza a la derecha del sidebar (w-56 md / w-64 lg)
      className="fixed bottom-0 left-0 right-0 md:left-56 lg:left-64 z-[200]
                 bg-ink text-paper border-t border-paper/10
                 shadow-[0_-4px_24px_rgba(0,0,0,0.25)]"
    >
      {/* Barra de progreso superior */}
      <div className="h-0.5 bg-paper/10">
        <div
          className="h-full bg-sage transition-all duration-500"
          style={{ width: `${((step + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="px-4 md:px-6 py-3 flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">

        {/* Indicadores de paso */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {steps.map((s, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i < step
                  ? 'w-1.5 h-1.5 bg-sage'
                  : i === step
                    ? 'w-4 h-1.5 bg-paper'
                    : 'w-1.5 h-1.5 bg-paper/25'
              }`}
            />
          ))}
        </div>

        {/* Texto del paso */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-paper/40 leading-none mb-0.5">
            Paso {step + 1} de {steps.length}
          </p>
          <p className="text-sm font-medium text-paper truncate">{current.title}</p>
        </div>

        {/* Botón de acción: ir a la página si no estamos ahí */}
        {!onThisPage && (
          <button
            onClick={() => navigate(current.path)}
            className="flex-shrink-0 flex items-center gap-1.5 bg-paper/10 hover:bg-paper/20
                       text-paper text-xs font-medium px-3 py-1.5 rounded-sm transition-colors"
          >
            Ir a {current.navLabel}
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        )}

        {/* Saltar */}
        <button
          onClick={skipTutorial}
          className="flex-shrink-0 flex items-center gap-1 text-paper/35 hover:text-paper/70
                     text-xs transition-colors p-1"
          title="Saltar tutorial"
        >
          <X size={14} strokeWidth={1.5} />
          <span className="hidden sm:inline">Saltar</span>
        </button>

      </div>
    </div>
  );

  // Portal para escapar cualquier stacking context del Layout
  return createPortal(bar, document.body);
}
