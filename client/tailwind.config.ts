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
        // Couture Nightfall — layered ink canvas (near-black → warm charcoal)
        ink: {
          950: '#050506',
          900: '#0a0a0c',
          800: '#111014',
          700: '#17161c',
          600: '#201e26',
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
        // Rose-gold couture accent — the "fashion" signal (full scale for gradients/borders)
        gold: {
          100: '#fbe9df',
          200: '#f7d8c6',
          300: '#f3b6a0', // rose gold base
          400: '#e79c86',
          500: '#d98467',
          600: '#c06a4f',
        },
        rose: {
          gold: '#F3B6A0',    // rose gold accent (legacy alias)
        },
        violet: {
          deep: '#7C5CFF',    // deep violet accent
        },
        live: '#FF3040',      // luxury red for LIVE
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-playfair)', 'Playfair Display', 'Georgia', 'serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        editorial: '-0.03em',
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
        // Couture Nightfall
        'aurora': 'auroraShift 18s ease-in-out infinite',
        'sheen': 'sheenSweep 6s ease-in-out infinite',
        'rise': 'riseIn 0.6s cubic-bezier(0.22,1,0.36,1) forwards',
        'blur-in': 'blurIn 0.7s cubic-bezier(0.22,1,0.36,1) forwards',
        'gold-shimmer': 'goldShimmer 4s linear infinite',
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
        // Couture Nightfall
        auroraShift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '0.55' },
          '33%': { transform: 'translate3d(4%,-3%,0) scale(1.08)', opacity: '0.8' },
          '66%': { transform: 'translate3d(-3%,2%,0) scale(1.04)', opacity: '0.65' },
        },
        sheenSweep: {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)', opacity: '0' },
          '18%': { opacity: '0.55' },
          '40%, 100%': { transform: 'translateX(220%) skewX(-18deg)', opacity: '0' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(22px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blurIn: {
          '0%': { opacity: '0', filter: 'blur(14px)', transform: 'translateY(10px)' },
          '100%': { opacity: '1', filter: 'blur(0)', transform: 'translateY(0)' },
        },
        goldShimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
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
        // Couture Nightfall — soft gold luminance + deep editorial lift
        'gold-sm': '0 0 12px rgba(243,182,160,0.28)',
        'gold': '0 0 28px rgba(243,182,160,0.35)',
        'couture': '0 24px 70px -24px rgba(0,0,0,0.85), 0 2px 0 0 rgba(255,255,255,0.04) inset',
        'lift': '0 30px 80px -40px rgba(0,0,0,0.9)',
      },
    },
  },
  plugins: [],
};

export default config;
