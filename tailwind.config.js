module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.6' },
          '100%': { transform: 'scale(1.15)', opacity: '0' },
        },
      },
      animation: {
        float: 'float 3.5s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2.2s ease-out infinite',
        fadeUp: 'fadeUp 0.6s ease both',
      },
    },
  },
  plugins: [],
};
