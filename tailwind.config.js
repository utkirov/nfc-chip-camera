/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './admin/**/*.{html,js}', './verify/**/*.{html,js}', './shared/js/**/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Unbounded', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: { ink: '#0a0b0d', panel: '#111317', gold: '#e8b86d', verified: '#3dffa2' },
    },
  },
};
