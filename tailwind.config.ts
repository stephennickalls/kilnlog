/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue',
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: '#f5f0e8',
          2:       '#ede5d5',
          3:       '#e0d4bc',
          4:       '#d4c9b0',
        },
        ink: {
          DEFAULT: '#1a1208',
          2:       '#3d2f1a',
          muted:   '#c8a87a',   // warm gold — replaces dull #6b5c3e
          faint:   '#a08060',
        },
        flame: {
          DEFAULT: '#b05c1a',
          light:   '#c8a87a',
          bg:      '#f9f1e4',
          dark:    '#8a4015',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        kicker: ['0.72rem', { letterSpacing: '0.16em', lineHeight: '1' }],
      },
    },
  },
  plugins: [],
}