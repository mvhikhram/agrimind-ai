/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        farm: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        obsidian: {
          800: '#0f1d14',
          850: '#0a170e',
          900: '#07100a',
          950: '#040905',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(34, 197, 94, 0.25)',
        'glow-lg': '0 0 30px rgba(34, 197, 94, 0.35)',
      }
    },
  },
  plugins: [],
}
