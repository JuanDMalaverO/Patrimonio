// src/contexts/TutorialContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// ── Definición de los 5 pasos ─────────────────────────────────────────────────
// targetSelector: CSS selector del elemento a resaltar con el spotlight
// required: true  → el usuario debe completar la acción (no hay botón "Continuar")
// required: false → el tooltip muestra un botón ctaLabel para avanzar sin la acción
export const TUTORIAL_STEPS = [
  {
    index:          0,
    path:           '/cuentas',
    navLabel:       'Cuentas',
    title:          'Crea tu primera cuenta',
    description:    'Aquí registras todas tus billeteras: cuenta bancaria, Nequi, efectivo, tarjeta de crédito. Haz clic en el botón resaltado para comenzar.',
    targetSelector: '[data-tutorial="nueva-cuenta"]',
    required:       true,
  },
  {
    index:          1,
    path:           '/categorias',
    navLabel:       'Categorías',
    title:          'Revisa tus categorías',
    description:    'Ya tienes 16 categorías colombianas cargadas: Alimentación, Transporte, Salario y más. Puedes crear una adicional o continuar al siguiente paso.',
    targetSelector: '[data-tutorial="nueva-categoria"]',
    required:       false,
    ctaLabel:       'Continuar →',
  },
  {
    index:          2,
    path:           '/transacciones',
    navLabel:       'Movimientos',
    title:          'Registra tu primer movimiento',
    description:    'Anota el ingreso o gasto más reciente que recuerdes. Haz clic en el botón resaltado para registrarlo.',
    targetSelector: '[data-tutorial="nuevo-movimiento"]',
    required:       true,
  },
  {
    index:          3,
    path:           '/presupuestos',
    navLabel:       'Presupuestos',
    title:          'Define tu primer presupuesto',
    description:    'Pon un límite mensual a tu categoría de mayor gasto. Patrimonio te avisará cuando te acerques al techo.',
    targetSelector: '[data-tutorial="nuevo-presupuesto"]',
    required:       true,
  },
  {
    index:          4,
    path:           '/dashboard',
    navLabel:       'Resumen',
    title:          '¡Tu panorama financiero!',
    description:    'Este es tu centro de control. Aquí ves patrimonio neto, flujo del mes, análisis con IA y distribución de gastos.',
    targetSelector: '[data-tutorial="patrimonio-hero"]',
    required:       false,
    ctaLabel:       'Completar tutorial',
  },
];

const TutorialContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function TutorialProvider({ children }) {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [active, setActive] = useState(false);
  const [step, setStep]     = useState(0);

  // Clave de localStorage por usuario (soporta múltiples usuarios en el mismo navegador)
  const storageKey = user?.id ? `patrimonio_tutorial_step_${user.id}` : null;

  // Auto-iniciar cuando el usuario nuevo entra por primera vez
  useEffect(() => {
    if (!user) { setActive(false); return; }
    if (user.onboarding_completado) { setActive(false); return; }

    const saved     = storageKey ? localStorage.getItem(storageKey) : null;
    const savedStep = saved !== null ? parseInt(saved, 10) : 0;
    const startStep = isNaN(savedStep) ? 0 : Math.min(savedStep, TUTORIAL_STEPS.length - 1);

    setStep(startStep);
    setActive(true);
  }, [user?.id, user?.onboarding_completado]);

  // Completa el paso actual y avanza al siguiente (o finaliza el tutorial)
  const completeStep = useCallback(async (stepIndex) => {
    if (stepIndex !== step) return;

    const nextStep = step + 1;

    if (nextStep >= TUTORIAL_STEPS.length) {
      // ¡Tutorial completado!
      setActive(false);
      if (storageKey) localStorage.removeItem(storageKey);
      await completeOnboarding();
    } else {
      setStep(nextStep);
      if (storageKey) localStorage.setItem(storageKey, String(nextStep));
      navigate(TUTORIAL_STEPS[nextStep].path);
    }
  }, [step, storageKey, navigate, completeOnboarding]);

  // Salta el tutorial marcando el onboarding como completado
  const skipTutorial = useCallback(async () => {
    setActive(false);
    if (storageKey) localStorage.removeItem(storageKey);
    await completeOnboarding();
  }, [storageKey, completeOnboarding]);

  return (
    <TutorialContext.Provider value={{ active, step, steps: TUTORIAL_STEPS, completeStep, skipTutorial }}>
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => useContext(TutorialContext);
