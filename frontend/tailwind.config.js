/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    // Clases dinámicas usadas con interpolación de estado/categoría
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
        // Display: serif editorial (Fraunces). Body: sans geométrico (Söhne-style via Manrope). Mono: JetBrains.
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink:    '#0a0a0a',     // negro tinta
        paper:  '#f5f3ee',     // crema editorial
        bone:   '#ebe7df',
        sage:   '#5a6b58',     // verde profundo
        rust:   '#a8472a',     // rojizo terracota
        gold:   '#a88a3a',
        slate2: '#2a2d2e',
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        'card': '0 1px 0 rgba(10,10,10,0.06), 0 0 0 1px rgba(10,10,10,0.06)',
      },
    },
  },
  plugins: [],
};
