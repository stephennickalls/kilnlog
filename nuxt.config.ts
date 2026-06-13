// nuxt.config.ts
//
// PACKAGE 7 — S9 security headers, via Nuxt routeRules (NOT netlify.toml,
// which the owner declined). Nitro emits these headers on every response.
//
// CSP notes — what each source allows and WHY (a wrong CSP breaks checkout
// SILENTLY, so each entry is deliberate):
//   - connect-src: XHR + websocket to Supabase (REST + Auth + Realtime),
//     plus api.stripe.com for any client-side Stripe calls.
//   - script-src:  'self' for the bundled app (Chart.js etc. are bundled, not
//     CDN). js.stripe.com is included so Stripe.js loads if/when embedded
//     (checkout/portal are server-created redirects today, but keeping Stripe
//     script allowed is harmless and future-proofs an inline Elements form).
//     'unsafe-inline' is required because Nuxt injects an inline hydration/
//     payload script with no nonce in the current setup.
//   - frame-src:   js.stripe.com + hooks.stripe.com for the 3DS/checkout iframe.
//   - form-action: 'self' + Stripe (checkout/portal POST redirects).
//   - img-src:     'self' data: blob: + https: (avatars, Supabase storage).
//   - style-src:   'unsafe-inline' — Tailwind + Vue scoped styles inject inline.
//   - frame-ancestors 'none' is the CSP-level clickjacking guard; X-Frame-Options
//     DENY is the legacy equivalent for old browsers.
//
// IMPORTANT: the Supabase origin must appear literally in connect-src. It is
// read from SUPABASE_URL at build time below. If that env var is absent at
// build, the wildcard *.supabase.co fallback keeps Supabase reachable.

const SUPABASE_ORIGIN = (() => {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : ''
  } catch {
    return ''
  }
})()

// ws(s) origin for Realtime (same host, different scheme).
const SUPABASE_WS = SUPABASE_ORIGIN ? SUPABASE_ORIGIN.replace(/^http/, 'ws') : ''

const SUPABASE_SRC = [SUPABASE_ORIGIN, SUPABASE_WS].filter(Boolean).join(' ')
  || 'https://*.supabase.co wss://*.supabase.co'

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `connect-src 'self' ${SUPABASE_SRC} https://api.stripe.com`,
  "script-src 'self' 'unsafe-inline' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "frame-src https://js.stripe.com https://hooks.stripe.com",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ')

const SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(self "https://js.stripe.com")',
  'X-DNS-Prefetch-Control': 'off',
  'Content-Security-Policy': CSP,
}

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

  // S9 — security headers on every route. The webhook route is exempted from
  // the strict CSP block below because Stripe POSTs to it server-to-server
  // (no browser, no CSP relevance) — headers are harmless there but we leave
  // the API namespace with the same headers; they don't affect non-HTML.
  routeRules: {
    '/**': { headers: SECURITY_HEADERS },
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