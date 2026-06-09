// tailwind.config.js
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
        // Unfired clay / paper — the warm ground
        parchment: {
          DEFAULT: '#fbf8f3',
          2:       '#f2ece0',
          3:       '#e6dcc8',
          4:       '#d4c8af',
        },
        // Fired iron / deep clay — text + ink. muted kept a readable brown
        // (not gold) so secondary text stays legible on parchment.
        ink: {
          DEFAULT: '#221708',
          2:       '#403019',
          muted:   '#7d6a4e',
          faint:   '#a89678',
        },
        // Iron-oxide warm accent — terracotta/amber. Primary brand + BISQUE.
        flame: {
          DEFAULT: '#b8551c',
          light:   '#d98a4e',
          bg:      '#f7eee1',
          dark:    '#8a3d12',
        },
        // Celadon — the iconic reduction blue-green. GLAZE + single-fire.
        celadon: {
          DEFAULT: '#5f8a78',
          light:   '#8fb3a3',
          bg:      '#eaf1ec',
          dark:    '#3f6354',
        },
        // Cobalt — deeper jewel cool. RAKU / specialty + occasional info/links.
        cobalt: {
          DEFAULT: '#3a5a78',
          light:   '#7794ad',
          bg:      '#e9eef3',
          dark:    '#284057',
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