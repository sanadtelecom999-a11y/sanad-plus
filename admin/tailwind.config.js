/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A1B2E', surface: '#10253B', 'surface-light': '#17334E', border: '#24425D',
        primary: '#00A0E9', accent: '#7FE0FF', text: '#F5FAFF', muted: '#A9BED0',
        success: '#22C55E', warning: '#F59E0B', danger: '#FF7F96'
      },
      fontFamily: { sans: ['Cairo', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}
