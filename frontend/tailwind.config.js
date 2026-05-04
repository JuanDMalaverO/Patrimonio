/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    'bg-sage', 'bg-rust', 'bg-gold', 'bg-ink',
    'text-sage', 'text-rust', 'text-gold', 'text-ink',
    'border-sage', 'border-rust', 'border-gold', 'border-ink',
    'bg-sage/10', 'bg-rust/10', 'bg-gold/10', 'bg-ink/10',
    'bg-sage/20', 'bg-rust/20',
    'ring-sage', 'ring-rust',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans:    ['Manrope', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        // ink/paper/bone/slate2 usan CSS custom properties para soportar dark mode
        // automáticamente en TODAS las variantes de opacidad (bg-ink/10, text-ink/50, etc.)
        ink:    'rgb(var(--c-ink)    / <alpha-value>)',
        paper:  'rgb(var(--c-paper)  / <alpha-value>)',
        bone:   'rgb(var(--c-bone)   / <alpha-value>)',
        slate2: 'rgb(var(--c-slate2) / <alpha-value>)',
        // Colores de acento: fijos en ambos temas
        sage:   '#5a6b58',
        rust:   '#a8472a',
        gold:   '#a88a3a',
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        // CSS variable para que la sombra también se adapte al tema
        'card': 'var(--shadow-card)',
      },
    },
  },
  plugins: [],
};
