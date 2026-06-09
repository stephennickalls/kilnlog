/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue',
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: '#fbf8f3',
          2:       '#f2ece0',
          3:       '#e6dcc8',
          4:       '#d4c8af',
        },
        ink: {
          DEFAULT: '#221708',
          2:       '#403019',
          muted:   '#7d6a4e',
          faint:   '#a89678',
        },
        flame: {
          DEFAULT: '#b8551c',
          light:   '#d98a4e',
          bg:      '#f7eee1',
          dark:    '#8a3d12',
        },
        celadon: {
          DEFAULT: '#5f8a78',
          light:   '#8fb3a3',
          bg:      '#eaf1ec',
          dark:    '#3f6354',
        },
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