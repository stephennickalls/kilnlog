// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' },
  future: { compatibilityVersion: 4 },
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/tailwind.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    stripeSecretKey:      process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret:  process.env.STRIPE_WEBHOOK_SECRET,
    supabaseSecretKey:    process.env.SUPABASE_SECRET_KEY,
    public: {
      supabaseUrl:            process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    },
  },
})