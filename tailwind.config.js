/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08090A',
          900: '#0C0D0F',
          850: '#111214',
          800: '#16181B',
          700: '#1E2024',
          600: '#2A2D33',
          500: '#3A3D44',
        },
        cyan: {
          DEFAULT: '#22D3EE',
          400: '#22D3EE',
          500: '#06B6D4',
          300: '#67E8F9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
