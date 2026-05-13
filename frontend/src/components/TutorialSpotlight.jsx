// src/components/TutorialSpotlight.jsx
// Two-phase tutorial:
//   phase 'intro'     → centered IntroCard explains the step (z-300)
//   phase 'spotlight' → dark overlays + glowing ring + tooltip near target (z-45..47)
// Modal.jsx uses z-50, which sits above all spotlight layers naturally.
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  X, ArrowRight, CheckCircle2,
  Wallet, Tags, ArrowLeftRight, Target, Flag, LayoutDashboard,
} from 'lucide-react';
import { useTutorial } from '../contexts/TutorialContext.jsx';

// Icon per step index
const STEP_ICONS = [Wallet, Tags, ArrowLeftRight, Target, Flag, LayoutDashboard];

const PAD        = 10;
const OVERLAY_Z  = 45;
const RING_Z     = 46;
const TIP_Z      = 47;
const INTRO_Z    = 300;

// ── Main export ───────────────────────────────────────────────────────────────
export default function TutorialSpotlight() {
  const { active, step, steps, phase, advanceToSpotlight, skipTutorial, completeStep } = useTutorial();
  const [rect, setRect]     = useState(null);
  const targetElRef         = useRef(null);
  const location            = useLocation();

  const currentStep = active ? steps[step] : null;
  const onThisPage  = location.pathname === currentStep?.path;

  const measure = useCallback(() => {
    if (!currentStep?.targetSelector) return;
    const el = document.querySelector(currentStep.targetSelector);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width, height: r.height });
  }, [currentStep]);

  // Add / remove pulse class on the target button (only in spotlight phase)
  useEffect(() => {
    const removePulse = () => {
      if (targetElRef.current) {
        targetElRef.current.classList.remove('tutorial-target-pulse');
        targetElRef.current = null;
      }
    };

    if (!active || !onThisPage || phase !== 'spotlight') {
      setRect(null);
      removePulse();
      return;
    }

    let attempts = 0;
    const tryFind = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        removePulse();
        targetElRef.current = el;
        el.classList.add('tutorial-target-pulse');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        measure();
      } else if (attempts < 12) {
        attempts++;
        setTimeout(tryFind, 150);
      }
    };
    const t = setTimeout(tryFind, 200);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      removePulse();
    };
  }, [active, step, onThisPage, phase, measure]);

  if (!active || !onThisPage) return null;

  // ── Phase: intro ─────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return createPortal(
      <IntroCard
        currentStep={currentStep}
        step={step}
        steps={steps}
        onAdvance={advanceToSpotlight}
        onSkip={skipTutorial}
      />,
      document.body
    );
  }

  // ── Phase: spotlight ──────────────────────────────────────────────────────
  if (!rect) return null;

  const hl = {
    top:    rect.top    - PAD,
    left:   rect.left   - PAD,
    bottom: rect.bottom + PAD,
    right:  rect.right  + PAD,
    width:  rect.width  + PAD * 2,
    height: rect.height + PAD * 2,
  };

  return createPortal(
    <SpotlightOverlay
      hl={hl}
      currentStep={currentStep}
      step={step}
      steps={steps}
      onSkip={skipTutorial}
      onComplete={() => completeStep(step)}
    />,
    document.body
  );
}

// ── IntroCard — tarjeta centrada de bienvenida ────────────────────────────────
function IntroCard({ currentStep, step, steps, onAdvance, onSkip }) {
  const [exiting, setExiting] = useState(false);
  const Icon = STEP_ICONS[step] ?? Wallet;

  const handleCta = () => {
    setExiting(true);
    setTimeout(onAdvance, 270);
  };

  const { intro } = currentStep;
  const isFirst   = step === 0;

  const cardStyle = {
    background:  '#0a0a0a',
    color:       '#f5f3ee',
    borderRadius: 8,
    width:       '100%',
    maxWidth:    400,
    overflow:    'hidden',
    boxShadow:   '0 30px 90px rgba(0,0,0,0.7)',
    position:    'relative',
    transition:  'transform 0.27s cubic-bezier(0.4,0,0.2,1), opacity 0.27s ease',
    transform:    exiting ? 'scale(0.93) translateY(-6px)' : 'scale(1) translateY(0)',
    opacity:      exiting ? 0 : 1,
    animation:   exiting ? 'none' : 'introCardIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
  };

  const overlayStyle = {
    position:       'fixed',
    inset:          0,
    zIndex:         INTRO_Z,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        16,
    background:     'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(6px)',
    transition:     'opacity 0.27s ease',
    opacity:         exiting ? 0 : 1,
  };

  return (
    <>
      <style>{`
        @keyframes introCardIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);     }
        }
        @keyframes spotlightIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tutorialPulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 5px rgba(255,255,255,0.2), 0 0 30px rgba(255,255,255,0.12); }
          50%       { box-shadow: 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 8px rgba(255,255,255,0.12), 0 0 40px rgba(255,255,255,0.18); }
        }
      `}</style>

      <div style={overlayStyle}>
        <div style={cardStyle}>

          {/* Progress bar top */}
          <div style={{ height: 3, background: 'rgba(245,243,238,0.08)' }}>
            <div style={{
              height: '100%',
              width:  `${((step + 1) / steps.length) * 100}%`,
              background: 'linear-gradient(90deg, #5a6b58, #7a9178)',
              transition: 'width 0.5s ease',
            }} />
          </div>

          {/* Skip button */}
          <button
            onClick={onSkip}
            style={{
              position: 'absolute', top: 14, right: 14,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(245,243,238,0.3)', padding: 4, lineHeight: 1,
            }}
            title="Saltar tutorial"
          >
            <X size={15} strokeWidth={1.5} />
          </button>

          {/* Brand header — only on first step */}
          {isFirst && (
            <div style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(245,243,238,0.07)', paddingBottom: 16, marginBottom: 0 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(245,243,238,0.35)', fontWeight: 600 }}>
                Patrimonio<span style={{ color: '#a8472a' }}>·</span>
              </span>
            </div>
          )}

          {/* Body */}
          <div style={{ padding: isFirst ? '24px 24px 0' : '24px 24px 0', textAlign: 'center' }}>

            {/* Achievement badge (steps 1+) */}
            {!isFirst && intro.achievement && (
              <div style={{
                display:        'inline-flex',
                alignItems:     'center',
                gap:            6,
                background:     'rgba(90,107,88,0.18)',
                border:         '1px solid rgba(90,107,88,0.35)',
                borderRadius:   20,
                padding:        '4px 12px',
                marginBottom:   20,
              }}>
                <CheckCircle2 size={11} color="#5a6b58" strokeWidth={2.5} />
                <span style={{ fontSize: 11, color: '#7a9178', fontWeight: 600, letterSpacing: '0.04em' }}>
                  {intro.achievement}
                </span>
              </div>
            )}

            {/* Icon */}
            <div style={{
              display:        'inline-flex',
              background:     'rgba(245,243,238,0.07)',
              borderRadius:   16,
              padding:        18,
              marginBottom:   18,
              ...(isFirst ? {} : { marginTop: intro.achievement ? 0 : 4 }),
            }}>
              <Icon size={30} strokeWidth={1.4} color="#f5f3ee" />
            </div>

            {/* Step pill */}
            <div style={{ marginBottom: 12 }}>
              <span style={{
                fontSize:    10,
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                color:       'rgba(245,243,238,0.35)',
                fontWeight:  600,
              }}>
                Paso {step + 1} de {steps.length}
              </span>
            </div>

            {/* Headline */}
            <h2 style={{
              margin:     '0 0 12px',
              fontSize:   20,
              fontWeight: 700,
              lineHeight: 1.3,
              color:      '#f5f3ee',
            }}>
              {intro.headline}
            </h2>

            {/* Body text */}
            <p style={{
              margin:     '0 0 24px',
              fontSize:   13.5,
              color:      'rgba(245,243,238,0.6)',
              lineHeight: 1.65,
            }}>
              {intro.body}
            </p>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 5, padding: '0 24px 20px' }}>
            {steps.map((_, i) => (
              <div key={i} style={{
                borderRadius: 9999,
                height:       5,
                width:        i < step ? 5 : i === step ? 20 : 5,
                background:   i < step ? '#5a6b58' : i === step ? '#f5f3ee' : 'rgba(245,243,238,0.18)',
                transition:   'all 0.3s ease',
              }} />
            ))}
          </div>

          {/* Footer */}
          <div style={{
            padding:        '0 24px 24px',
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
          }}>
            <button
              onClick={onSkip}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'rgba(245,243,238,0.28)', padding: 0,
              }}
            >
              Saltar tutorial
            </button>
            <button
              onClick={handleCta}
              style={{
                display:    'flex',
                alignItems: 'center',
                gap:        8,
                background: '#f5f3ee',
                color:      '#0a0a0a',
                border:     'none',
                borderRadius: 5,
                padding:    '10px 20px',
                fontSize:   13,
                fontWeight: 700,
                cursor:     'pointer',
                boxShadow:  '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {intro.cta}
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

// ── SpotlightOverlay — overlay oscuro con hueco y tooltip ─────────────────────
function SpotlightOverlay({ hl, currentStep, step, steps, onSkip, onComplete }) {
  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const spaceBelow   = vh - hl.bottom;
  const tooltipOnTop = spaceBelow < 240 && hl.top > spaceBelow;

  const TOOLTIP_W = Math.min(300, vw - 32);
  const idealLeft = hl.left + hl.width / 2 - TOOLTIP_W / 2;
  const tipLeft   = Math.max(16, Math.min(idealLeft, vw - TOOLTIP_W - 16));
  const arrowLeft = Math.max(14, Math.min(hl.left + hl.width / 2 - tipLeft, TOOLTIP_W - 14));

  const tipStyle = tooltipOnTop
    ? { bottom: vh - hl.top + 12, left: tipLeft }
    : { top: hl.bottom + 12,      left: tipLeft };

  const OVR = 'rgba(0,0,0,0.75)';
  const enterAnim = 'spotlightIn 0.3s ease both';

  return (
    <>
      {/* ── Dark overlays ─────────────────────────────────────────────── */}
      {[
        { top: 0, left: 0, right: 0, height: Math.max(0, hl.top) },
        { top: Math.max(0, hl.bottom), left: 0, right: 0, bottom: 0 },
        { top: hl.top, left: 0, width: Math.max(0, hl.left), height: hl.height },
        { top: hl.top, left: Math.max(0, hl.right), right: 0, height: hl.height },
      ].map((s, i) => (
        <div key={i} style={{ position: 'fixed', zIndex: OVERLAY_Z, background: OVR, animation: enterAnim, ...s }} />
      ))}

      {/* ── Glow ring ─────────────────────────────────────────────────── */}
      <div style={{
        position:      'fixed',
        zIndex:        RING_Z,
        top: hl.top, left: hl.left,
        width: hl.width, height: hl.height,
        borderRadius:  4,
        boxShadow:     '0 0 0 2px rgba(255,255,255,0.95), 0 0 0 5px rgba(255,255,255,0.2), 0 0 30px rgba(255,255,255,0.12)',
        pointerEvents: 'none',
        animation:     'tutorialPulse 2s ease-in-out infinite',
      }} />

      {/* ── Tooltip ───────────────────────────────────────────────────── */}
      <div style={{ position: 'fixed', zIndex: TIP_Z, width: TOOLTIP_W, animation: enterAnim, ...tipStyle }}>
        {!tooltipOnTop && <Arrow left={arrowLeft} dir="up" />}

        <div style={{ background: '#0a0a0a', borderRadius: 4, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {/* Header */}
          <div style={{ padding: '13px 15px 11px', borderBottom: '1px solid rgba(245,243,238,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(245,243,238,0.4)' }}>
                Paso {step + 1} de {steps.length}
              </span>
              <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(245,243,238,0.3)', padding: '0 0 0 8px', lineHeight: 1 }}>
                <X size={13} strokeWidth={1.5} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {steps.map((_, i) => (
                <div key={i} style={{
                  borderRadius: 9999, height: 5,
                  width:      i < step ? 5 : i === step ? 20 : 5,
                  background: i < step ? '#5a6b58' : i === step ? '#f5f3ee' : 'rgba(245,243,238,0.25)',
                  transition: 'all 0.3s ease',
                }} />
              ))}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '13px 15px' }}>
            <p style={{ margin: '0 0 7px', fontWeight: 600, fontSize: 13.5, color: '#f5f3ee', lineHeight: 1.35 }}>
              {currentStep.title}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'rgba(245,243,238,0.6)', lineHeight: 1.55 }}>
              {currentStep.description}
            </p>
          </div>

          {/* Footer */}
          <div style={{ padding: '0 15px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {currentStep.required ? (
              <>
                <span style={{ fontSize: 11, color: 'rgba(245,243,238,0.3)', fontStyle: 'italic' }}>↑ haz clic en el botón resaltado</span>
                <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(245,243,238,0.3)' }}>Saltar</button>
              </>
            ) : (
              <>
                <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(245,243,238,0.3)' }}>Saltar tutorial</button>
                <button
                  onClick={onComplete}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#f5f3ee', color: '#0a0a0a',
                    border: 'none', borderRadius: 3, padding: '7px 13px',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {currentStep.ctaLabel ?? 'Continuar'}
                  {step === steps.length - 1
                    ? <CheckCircle2 size={13} strokeWidth={2.5} />
                    : <ArrowRight   size={13} strokeWidth={2.5} />}
                </button>
              </>
            )}
          </div>
        </div>

        {tooltipOnTop && <Arrow left={arrowLeft} dir="down" />}
      </div>
    </>
  );
}

function Arrow({ left, dir }) {
  return (
    <div style={{
      position:  'absolute',
      left,
      transform: 'translateX(-50%) rotate(45deg)',
      width: 11, height: 11,
      background: '#0a0a0a',
      ...(dir === 'up'   ? { top:    -5 } : {}),
      ...(dir === 'down' ? { bottom: -5 } : {}),
    }} />
  );
}
