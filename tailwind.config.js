/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        snack: {
          50: 'var(--color-snack-50, #fff7ed)',
          100: 'var(--color-snack-100, #ffedd5)',
          500: 'var(--color-snack-500, #f97316)',
          600: 'var(--color-snack-600, #ea580c)',
          700: 'var(--color-snack-700, #c2410c)',
          900: 'var(--color-snack-900, #7c2d12)'
        }
      }
    }
  },
  plugins: []
}
