/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d8ecff',
          200: '#b6dbff',
          300: '#87c2ff',
          400: '#5aa5ff',
          500: '#2c83ff',
          600: '#1766f2',
          700: '#134fd0',
          800: '#1443a6',
          900: '#153d85',
        },
      },
      borderRadius: {
        xl: '14px',
      },
    },
  },
  plugins: [],
};
