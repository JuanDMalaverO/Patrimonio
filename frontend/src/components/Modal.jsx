// src/components/Modal.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, eyebrow, children, width = 'max-w-md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  // Portal: escapa el transform del Layout (animate-fade-up) que rompe position:fixed
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[8vh] sm:items-center sm:pt-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative bg-paper border border-ink/15 rounded-sm shadow-2xl w-full ${width} animate-fade-up my-4 flex-shrink-0`}>
        <div className="flex items-start justify-between px-6 sm:px-7 pt-6 sm:pt-7 pb-2">
          <div>
            {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
            <h2 className="font-display text-xl sm:text-2xl tracking-tightest">{title}</h2>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink p-1 -mr-2 flex-shrink-0">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
