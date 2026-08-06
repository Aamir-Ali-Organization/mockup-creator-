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
        ink: '#101418',
        accent: '#ffd400',
        heat: '#e30613',
        field: '#c4121a',
      },
      fontFamily: {
        display: ['var(--font-bebas)', 'sans-serif'],
        body: ['var(--font-sora)', 'sans-serif'],
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
