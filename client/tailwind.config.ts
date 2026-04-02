import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff1f7',
          100: '#ffe4ef',
          200: '#ffc9df',
          300: '#ff9dc3',
          400: '#ff6da6',
          500: '#FF4FA3', // hot pink primary
          600: '#e63590',
          700: '#c41d73',
          800: '#a11960',
          900: '#861a52',
          950: '#520831',
        },
        surface: {
          DEFAULT: '#F8F8F8',
          dark: '#070707',    // near-black
        },
        charcoal: '#111111',  // soft charcoal
        glass: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          light: 'rgba(255,255,255,0.12)',
          medium: 'rgba(255,255,255,0.16)',
        },
        rose: {
          gold: '#F3B6A0',    // rose gold accent
        },
        violet: {
          deep: '#7C5CFF',    // deep violet accent
        },
        live: '#FF3040',      // luxury red for LIVE
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
        '5xl': '28px',
      },
      animation: {
        'gift-float': 'giftFloat 2s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'pulse-live': 'pulseLive 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'ring-pulse': 'ringPulse 2s ease-in-out infinite',
        'glow-breathe': 'glowBreathe 3s ease-in-out infinite',
      },
      keyframes: {
        giftFloat: {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-200px) scale(1.5)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255,79,163,0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(255,79,163,0.8)' },
        },
        pulseLive: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(255,48,64,0.4)' },
          '50%': { boxShadow: '0 0 16px rgba(255,48,64,0.8)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        ringPulse: {
          '0%, 100%': { boxShadow: '0 0 0 2px rgba(255,48,64,0.4)' },
          '50%': { boxShadow: '0 0 0 4px rgba(255,48,64,0.7)' },
        },
        glowBreathe: {
          '0%, 100%': { filter: 'drop-shadow(0 0 4px rgba(255,79,163,0.3))' },
          '50%': { filter: 'drop-shadow(0 0 12px rgba(255,79,163,0.6))' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-sm': '0 0 8px rgba(255,79,163,0.35)',
        'glow': '0 0 16px rgba(255,79,163,0.45)',
        'glow-lg': '0 0 32px rgba(255,79,163,0.55)',
        'glow-violet': '0 0 20px rgba(124,92,255,0.4)',
        'glow-live': '0 0 12px rgba(255,48,64,0.5)',
        'glass': '0 8px 32px rgba(0,0,0,0.4)',
        'glass-sm': '0 4px 16px rgba(0,0,0,0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
