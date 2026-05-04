// src/components/States.jsx
import { Loader2, AlertCircle } from 'lucide-react';

export function Loading({ label = 'Cargando' }) {
  return (
    <div className="flex items-center justify-center gap-3 text-ink/50 py-16">
      <Loader2 size={16} className="animate-spin" strokeWidth={1.5} />
      <span className="text-sm tracking-wide">{label}…</span>
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <div className="my-4 border border-rust/40 bg-rust/5 px-5 py-4 rounded-sm flex items-start gap-3">
      <AlertCircle size={18} className="text-rust flex-shrink-0 mt-0.5" strokeWidth={1.5} />
      <div className="text-sm text-rust">{message}</div>
    </div>
  );
}

export function Empty({ title, hint, icon: Icon }) {
  return (
    <div className="border border-dashed border-ink/15 px-8 py-16 text-center rounded-sm">
      {Icon && <Icon size={28} strokeWidth={1.2} className="mx-auto text-ink/30 mb-4" />}
      <h3 className="font-display text-2xl tracking-tightest mb-1">{title}</h3>
      {hint && <p className="text-sm text-ink/55 max-w-sm mx-auto">{hint}</p>}
    </div>
  );
}
