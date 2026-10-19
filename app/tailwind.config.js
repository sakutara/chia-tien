/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'usd-green-950': '#0A1F16',
        'usd-green-900': '#123123',
        'usd-green-800': '#1B4332',
        'usd-green-700': '#2D6A4F',
        'usd-green-600': '#40916C',
        'usd-green-100': '#D8F3DC',
        'usd-paper-50': '#FAF8F5',
        'usd-paper-100': '#F2EFE9',
        'usd-paper-200': '#E4DFD5',
        'usd-gold-600': '#CA8A04',
        'usd-red-600': '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
