/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        navy: {
          950: '#060d1a',
          900: '#0b1121',
          800: '#111827',
          700: '#1a2540',
          600: '#243055',
        },
        brand: {
          blue:   '#3b82f6',
          indigo: '#6366f1',
          teal:   '#14b8a6',
        },
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      },
      boxShadow: {
        'glass': '0 4px 32px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'glow-red':    '0 0 20px rgba(239,68,68,0.3)',
        'glow-orange': '0 0 20px rgba(249,115,22,0.3)',
        'glow-blue':   '0 0 20px rgba(59,130,246,0.3)',
      },
    },
  },
  plugins: [],
};
