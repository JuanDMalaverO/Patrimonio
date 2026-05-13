// src/components/TutorialSpotlight.jsx
// Spotlight tutorial: darkens the page, draws a glowing ring around the target element,
// shows a positioned tooltip with an arrow. Modal (z-50) naturally sits on top (z-[47]).
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useTutorial } from '../contexts/TutorialContext.jsx';

const PAD = 10; // padding around highlighted element
const OVERLAY_Z = 45;
const RING_Z    = 46;
const TIP_Z     = 47;
// Modal.jsx uses z-50 → always sits above all spotlight layers

export default function TutorialSpotlight() {
  const { active, step, steps, skipTutorial, completeStep } = useTutorial();
  const [rect, setRect] = useState(null);
  const location = useLocation();

  const currentStep = active ? steps[step] : null;
  const onThisPage  = location.pathname === currentStep?.path;

  const measure = useCallback(() => {
    if (!currentStep?.targetSelector) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  }, [currentStep]);

  useEffect(() => {
    if (!active || !onThisPage) { setRect(null); return; }

    // Retry until element renders (page may still be loading)
    let attempts = 0;
    const tryFind = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        measure();
      } else if (attempts < 12) {
        attempts++;
        setTimeout(tryFind, 150);
      }
    };
    const t = setTimeout(tryFind, 300);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [active, step, onThisPage, measure]);

  if (!active || !onThisPage || !rect) return null;

  const hl = {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    bottom: rect.bottom + PAD,
    right:  rect.right  + PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  };

  return createPortal(
    <Spotlight hl={hl} currentStep={currentStep} step={step} steps={steps}
               onSkip={skipTutorial} onComplete={() => completeStep(step)} />,
    document.body
  );
}

function Spotlight({ hl, currentStep, step, steps, onSkip, onComplete }) {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  // Tooltip placement: prefer below target, flip above if not enough room
  const spaceBelow  = vh - hl.bottom;
  const tooltipOnTop = spaceBelow < 240 && hl.top > spaceBelow;

  const TOOLTIP_W  = Math.min(300, vw - 32);
  const idealLeft  = hl.left + hl.width / 2 - TOOLTIP_W / 2;
  const tipLeft    = Math.max(16, Math.min(idealLeft, vw - TOOLTIP_W - 16));

  // Arrow points to the horizontal center of the target
  const arrowLeft  = Math.max(14, Math.min(hl.left + hl.width / 2 - tipLeft, TOOLTIP_W - 14));

  const tipStyle = tooltipOnTop
    ? { bottom: vh - hl.top + 12, left: tipLeft }
    : { top: hl.bottom + 12,      left: tipLeft };

  const OVR = 'rgba(0,0,0,0.75)';

  return (
    <>
      {/* ── Dark overlays (4 rectangles leaving a hole at target) ──────── */}
      {[
        // top
        { top: 0, left: 0, right: 0, height: Math.max(0, hl.top) },
        // bottom
        { top: Math.max(0, hl.bottom), left: 0, right: 0, bottom: 0 },
        // left
        { top: hl.top, left: 0, width: Math.max(0, hl.left), height: hl.height },
        // right
        { top: hl.top, left: Math.max(0, hl.right), right: 0, height: hl.height },
      ].map((s, i) => (
        <div
          key={i}
          style={{ position: 'fixed', zIndex: OVERLAY_Z, background: OVR, ...s }}
        />
      ))}

      {/* ── Glowing ring around the target ────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          zIndex: RING_Z,
          top: hl.top, left: hl.left,
          width: hl.width, height: hl.height,
          borderRadius: 4,
          boxShadow: '0 0 0 2px rgba(255,255,255,0.95), 0 0 0 5px rgba(255,255,255,0.2), 0 0 30px rgba(255,255,255,0.12)',
          pointerEvents: 'none',
          animation: 'tutorialPulse 2s ease-in-out infinite',
        }}
      />

      {/* ── Tooltip ───────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', zIndex: TIP_Z, width: TOOLTIP_W, ...tipStyle }}>
        {/* Arrow: up when tooltip is below target */}
        {!tooltipOnTop && <Arrow left={arrowLeft} dir="up" />}

        <div style={{ background: '#0a0a0a', borderRadius: 4, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {/* Header */}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid rgba(245,243,238,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(245,243,238,0.4)' }}>
                Paso {step + 1} de {steps.length}
              </span>
              <button
                onClick={onSkip}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,243,238,0.3)', padding: '0 0 0 8px', lineHeight: 1 }}
                title="Saltar tutorial"
              >
                <X size={13} strokeWidth={1.5} />
              </button>
            </div>
            {/* Progress dots */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {steps.map((_, i) => (
                <div
                  key={i}
                  style={{
                    borderRadius: 9999,
                    height: 6,
                    width: i < step ? 6 : i === step ? 20 : 6,
                    background: i < step ? '#5a6b58' : i === step ? '#f5f3ee' : 'rgba(245,243,238,0.25)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600, fontSize: 14, color: '#f5f3ee', lineHeight: 1.35 }}>
              {currentStep.title}
            </p>
            <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(245,243,238,0.65)', lineHeight: 1.55 }}>
              {currentStep.description}
            </p>
          </div>

          {/* Footer */}
          <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {currentStep.required ? (
              <>
                <span style={{ fontSize: 11, color: 'rgba(245,243,238,0.3)', fontStyle: 'italic' }}>
                  ↑ haz clic en el botón resaltado
                </span>
                <button
                  onClick={onSkip}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(245,243,238,0.3)' }}
                >
                  Saltar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onSkip}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(245,243,238,0.3)' }}
                >
                  Saltar tutorial
                </button>
                <button
                  onClick={onComplete}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#f5f3ee', color: '#0a0a0a',
                    border: 'none', borderRadius: 3, padding: '7px 14px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {currentStep.ctaLabel ?? 'Continuar'}
                  {step === steps.length - 1
                    ? <CheckCircle2 size={13} strokeWidth={2.5} />
                    : <ArrowRight size={13} strokeWidth={2.5} />}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Arrow: down when tooltip is above target */}
        {tooltipOnTop && <Arrow left={arrowLeft} dir="down" />}
      </div>

      {/* Pulse keyframes */}
      <style>{`
        @keyframes tutorialPulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 5px rgba(255,255,255,0.2), 0 0 30px rgba(255,255,255,0.12); }
          50%       { box-shadow: 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 8px rgba(255,255,255,0.12), 0 0 40px rgba(255,255,255,0.18); }
        }
      `}</style>
    </>
  );
}

function Arrow({ left, dir }) {
  const style = {
    position: 'absolute',
    left,
    transform: 'translateX(-50%) rotate(45deg)',
    width: 12, height: 12,
    background: '#0a0a0a',
    ...(dir === 'up'   ? { top: -6    } : {}),
    ...(dir === 'down' ? { bottom: -6 } : {}),
  };
  return <div style={style} />;
}
