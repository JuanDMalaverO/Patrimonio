// src/contexts/TutorialContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// ── Definición de los 5 pasos ─────────────────────────────────────────────────
export const TUTORIAL_STEPS = [
  {
    index:       0,
    path:        '/cuentas',
    navLabel:    'Cuentas',
    title:       'Crea tu primera cuenta',
    instruction: 'Define dónde tienes tu dinero: banco, efectivo, tarjeta de crédito...',
  },
  {
    index:       1,
    path:        '/categorias',
    navLabel:    'Categorías',
    title:       'Explora y crea una categoría',
    instruction: 'Ya tienes categorías cargadas. Ahora crea una propia.',
  },
  {
    index:       2,
    path:        '/transacciones',
    navLabel:    'Movimientos',
    title:       'Registra tu primer movimiento',
    instruction: 'Anota el ingreso o gasto más reciente que recuerdes.',
  },
  {
    index:       3,
    path:        '/presupuestos',
    navLabel:    'Presupuestos',
    title:       'Define tu primer presupuesto',
    instruction: 'Pon un límite mensual a una de tus categorías de egreso.',
  },
  {
    index:       4,
    path:        '/dashboard',
    navLabel:    'Resumen',
    title:       'Tu resumen financiero',
    instruction: 'Aquí ves el estado completo de tu patrimonio.',
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
