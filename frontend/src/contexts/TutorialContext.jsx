// src/contexts/TutorialContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

// ── Definición de los 5 pasos ─────────────────────────────────────────────────
// intro: contenido de la tarjeta centrada que aparece ANTES del spotlight
//   achievement: logro del paso anterior (vacío en el paso 0)
//   headline:    título principal de la intro card
//   body:        descripción corta y clara
//   cta:         texto del botón de avance
// targetSelector: selector CSS del elemento que el spotlight resaltará
// required:       true → el usuario DEBE completar la acción para avanzar
//                 false → hay un botón CTA en el tooltip para avanzar
export const TUTORIAL_STEPS = [
  {
    index:          0,
    path:           '/cuentas',
    navLabel:       'Cuentas',
    title:          'Crea tu primera cuenta',
    description:    'Haz clic en el botón resaltado para abrir el formulario.',
    targetSelector: '[data-tutorial="nueva-cuenta"]',
    required:       true,
    intro: {
      achievement: null,
      headline:    'Creemos tu primera cuenta',
      body:        'En Patrimonio, una "cuenta" es cualquier lugar donde guardas dinero: banco, Nequi, efectivo en billetera o tarjeta de crédito. Vamos a crear la primera.',
      cta:         'Crear mi primera cuenta',
    },
  },
  {
    index:          1,
    path:           '/categorias',
    navLabel:       'Categorías',
    title:          'Revisa tus categorías',
    description:    'Puedes crear una adicional o simplemente continuar.',
    targetSelector: '[data-tutorial="nueva-categoria"]',
    required:       false,
    ctaLabel:       'Continuar →',
    intro: {
      achievement: '¡Primera cuenta creada!',
      headline:    'Estas son tus categorías',
      body:        'Cargamos 16 categorías colombianas para ti — Alimentación, Transporte, Salario y más. Puedes usarlas tal cual o agregar una personalizada.',
      cta:         'Ver mis categorías',
    },
  },
  {
    index:          2,
    path:           '/transacciones',
    navLabel:       'Movimientos',
    title:          'Registra tu primer movimiento',
    description:    'Haz clic en el botón resaltado para registrar el movimiento.',
    targetSelector: '[data-tutorial="nuevo-movimiento"]',
    required:       true,
    intro: {
      achievement: '¡Categorías listas!',
      headline:    'Registra tu primer movimiento',
      body:        'Un movimiento es cualquier ingreso, gasto o transferencia entre cuentas. Anota el más reciente que recuerdes — no tiene que ser perfecto.',
      cta:         'Registrar movimiento',
    },
  },
  {
    index:          3,
    path:           '/presupuestos',
    navLabel:       'Presupuestos',
    title:          'Define tu primer presupuesto',
    description:    'Haz clic en el botón resaltado para definir el límite.',
    targetSelector: '[data-tutorial="nuevo-presupuesto"]',
    required:       true,
    intro: {
      achievement: '¡Movimiento registrado!',
      headline:    'Ponle límite a tus gastos',
      body:        'Un presupuesto es un tope mensual por categoría. Patrimonio te avisará cuando te acerques al límite y te mostrará cuánto llevas gastado.',
      cta:         'Crear presupuesto',
    },
  },
  {
    index:          4,
    path:           '/dashboard',
    navLabel:       'Resumen',
    title:          '¡Tu panorama financiero!',
    description:    'Explora tu resumen y cuando estés listo, completa el tutorial.',
    targetSelector: '[data-tutorial="patrimonio-hero"]',
    required:       false,
    ctaLabel:       'Completar tutorial',
    intro: {
      achievement: '¡Presupuesto definido!',
      headline:    'Veamos tu resumen financiero',
      body:        'En el dashboard verás tu patrimonio neto, flujo del mes, análisis con IA y distribución de gastos — todo en un solo vistazo.',
      cta:         'Ver mi resumen',
    },
  },
];

const TutorialContext = createContext(null);

export function TutorialProvider({ children }) {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();

  const [active, setActive] = useState(false);
  const [step, setStep]     = useState(0);
  // 'intro' → muestra la tarjeta de bienvenida centrada
  // 'spotlight' → muestra el resaltado sobre el botón objetivo
  const [phase, setPhase]   = useState('intro');

  const storageKey = user?.id ? `patrimonio_tutorial_step_${user.id}` : null;

  useEffect(() => {
    if (!user) { setActive(false); return; }
    if (user.onboarding_completado) { setActive(false); return; }

    const saved     = storageKey ? localStorage.getItem(storageKey) : null;
    const savedStep = saved !== null ? parseInt(saved, 10) : 0;
    const startStep = isNaN(savedStep) ? 0 : Math.min(savedStep, TUTORIAL_STEPS.length - 1);

    setStep(startStep);
    setPhase('intro');
    setActive(true);
  }, [user?.id, user?.onboarding_completado]);

  // Cada vez que el paso cambia, volver a la fase de intro
  useEffect(() => {
    setPhase('intro');
  }, [step]);

  const advanceToSpotlight = useCallback(() => {
    setPhase('spotlight');
  }, []);

  const completeStep = useCallback(async (stepIndex) => {
    if (stepIndex !== step) return;
    const nextStep = step + 1;
    if (nextStep >= TUTORIAL_STEPS.length) {
      setActive(false);
      if (storageKey) localStorage.removeItem(storageKey);
      await completeOnboarding();
    } else {
      setStep(nextStep);
      if (storageKey) localStorage.setItem(storageKey, String(nextStep));
      navigate(TUTORIAL_STEPS[nextStep].path);
    }
  }, [step, storageKey, navigate, completeOnboarding]);

  const skipTutorial = useCallback(async () => {
    setActive(false);
    if (storageKey) localStorage.removeItem(storageKey);
    await completeOnboarding();
  }, [storageKey, completeOnboarding]);

  return (
    <TutorialContext.Provider value={{
      active, step, steps: TUTORIAL_STEPS, phase,
      advanceToSpotlight, completeStep, skipTutorial,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export const useTutorial = () => useContext(TutorialContext);
