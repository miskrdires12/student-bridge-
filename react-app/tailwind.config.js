/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          lime: '#85E510',
          'lime-hover': '#76cf0c',
          'lime-dark': '#062404',
          charcoal: '#202833',
          'charcoal-dark': '#141a22',
          'charcoal-light': '#2c3644',
          bg: '#F4F7F5',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          muted: '#64748B',
        },
        lime: {
          400: '#8fe617',
          500: '#85E510',
          600: '#72cb0b',
        },
        charcoal: {
          800: '#2c3644',
          900: '#202833',
          950: '#141a22',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        'lime-glow': '0 0 20px rgba(133, 229, 16, 0.35)',
      }
    },
  },
  plugins: [],
}

