/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#aa3bff',
          bg: 'rgba(170, 59, 255, 0.1)',
          border: 'rgba(170, 59, 255, 0.5)',
        }
      }
    },
  },
  plugins: [],
}
