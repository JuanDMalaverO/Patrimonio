// src/components/PageHeader.jsx
export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="px-4 sm:px-6 md:px-10 pt-7 md:pt-12 pb-5 md:pb-8 border-b border-ink/10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          {eyebrow && <div className="eyebrow mb-2 md:mb-3">{eyebrow}</div>}
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tightest leading-[0.95] text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 md:mt-3 text-ink/60 max-w-xl text-sm md:text-[15px] leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0 mt-1">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
