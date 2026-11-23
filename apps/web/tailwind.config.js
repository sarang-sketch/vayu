/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070c16',
          900: '#0b1220',
          800: '#101a2e',
          700: '#16233c',
          600: '#1f3050',
          500: '#2a4066',
        },
        mist: {
          100: '#e6edf7',
          300: '#b6c4d8',
          500: '#8296b0',
        },
        teal: {
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
        },
        amber: {
          300: '#fcd34d',
          400: '#fbbf24',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        hindi: ['"Noto Sans Devanagari"', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -12px rgba(45, 212, 191, 0.35)',
        card: '0 8px 30px -12px rgba(0, 0, 0, 0.5)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
