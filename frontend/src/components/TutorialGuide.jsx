// src/components/TutorialGuide.jsx
// Tarjeta de guía interactiva que aparece en la página correcta del tutorial.
// Cada página pasa su propio contenido via props.
import { BookOpen } from 'lucide-react';
import { useTutorial } from '../contexts/TutorialContext.jsx';

export default function TutorialGuide({ stepIndex, title, description, tips, action }) {
  const { active, step } = useTutorial();

  // Solo visible en la página correcta y en el paso correcto
  if (!active || step !== stepIndex) return null;

  return (
    <div className="mx-4 md:mx-10 mt-5 mb-0 rounded-sm border border-gold/30 overflow-hidden animate-fade-up">
      {/* Cabecera */}
      <div className="px-5 py-3 bg-gold/10 border-b border-gold/20 flex items-center gap-2">
        <BookOpen size={13} className="text-gold flex-shrink-0" strokeWidth={2} />
        <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-gold">
          Guía interactiva · Paso {stepIndex + 1} de 5
        </span>
      </div>

      {/* Cuerpo */}
      <div className="px-5 py-4 bg-gold/5">
        <h3 className="font-semibold text-sm text-ink mb-1.5">{title}</h3>
        <p className="text-sm text-ink/65 leading-relaxed">{description}</p>

        {tips?.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-ink/8 pt-3">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-ink/60">
                <span className="text-gold font-bold mt-0.5 flex-shrink-0">→</span>
                <span dangerouslySetInnerHTML={{ __html: tip }} />
              </li>
            ))}
          </ul>
        )}

        {action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
