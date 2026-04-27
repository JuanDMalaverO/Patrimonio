// src/components/Modal.jsx
import { X } from 'lucide-react';
import { useEffect } from 'react';

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm animate-fade-up" onClick={onClose} />
      <div className={`relative bg-paper border border-ink/15 rounded-sm shadow-2xl w-full ${width} animate-fade-up`}>
        <div className="flex items-start justify-between px-7 pt-7 pb-2">
          <div>
            {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
            <h2 className="font-display text-2xl tracking-tightest">{title}</h2>
          </div>
          <button onClick={onClose} className="text-ink/50 hover:text-ink p-1 -mr-2">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <div className="px-7 pb-7 pt-4">{children}</div>
      </div>
    </div>
  );
}
