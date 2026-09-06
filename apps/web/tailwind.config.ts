import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#0a0a0a',
        panel: '#141414',
        paper: '#f6f5f2',
        mist: '#ebeae6',
        fog: '#6f6f6f',
        signal: '#e10600',
        volt: '#e10600',
        ember: '#e10600',
        ink: '#0a0a0a',
        accent: '#e10600',
        heat: '#e10600',
        field: '#e10600',
        snow: '#ffffff',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        pulseRing: {
          '0%, 100%': { transform: 'scale(0.95)', opacity: '0.55' },
          '50%': { transform: 'scale(1.05)', opacity: '1' },
        },
        drip: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '40%': { opacity: '1' },
          '100%': { transform: 'translateY(18px)', opacity: '0' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        pulseRing: 'pulseRing 2s ease-in-out infinite',
        drip: 'drip 1.6s ease-in-out infinite',
        spinSlow: 'spinSlow 8s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
