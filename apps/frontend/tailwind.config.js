/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#101418',
        'ink-soft': '#3a424c',
        mist: '#e8eef2',
        accent: '#ffd400',
        heat: '#e30613',
        field: '#c4121a',
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['Sora', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 24px 60px rgba(16, 20, 24, 0.12)',
      },
      keyframes: {
        heroIn: {
          from: { opacity: '0', transform: 'translateY(18px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
        formIn: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to: { opacity: '1', transform: 'none' },
        },
        riseIn: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        heroIn: 'heroIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) both',
        formIn: 'formIn 0.9s 0.15s cubic-bezier(0.22, 1, 0.36, 1) both',
        riseIn: 'riseIn 0.85s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};
