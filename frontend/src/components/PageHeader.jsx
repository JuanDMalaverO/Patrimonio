// src/components/PageHeader.jsx
export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="px-10 pt-12 pb-8 border-b border-ink/10">
      <div className="flex items-end justify-between gap-8 flex-wrap">
        <div>
          {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
          <h1 className="font-display text-5xl md:text-6xl tracking-tightest leading-[0.95] text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 text-ink/60 max-w-xl text-[15px] leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
