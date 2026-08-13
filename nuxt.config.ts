// nuxt.config.ts
//
// PACKAGE 7 — S9 security headers, via Nuxt routeRules (NOT netlify.toml,
// which the owner declined). Nitro emits these headers on every response.
//
// CSP notes — what each source allows and WHY (a wrong CSP breaks checkout
// SILENTLY, so each entry is deliberate):
//   - connect-src: XHR + websocket to Supabase (REST + Auth + Realtime),
//     plus api.stripe.com for any client-side Stripe calls, plus the Google
//     Analytics collection endpoints (see GA block below).
//   - script-src:  'self' for the bundled app (Chart.js etc. are bundled, not
//     CDN). js.stripe.com is included so Stripe.js loads if/when embedded
//     (checkout/portal are server-created redirects today, but keeping Stripe
//     script allowed is harmless and future-proofs an inline Elements form).
//     googletagmanager.com serves gtag.js.
//     'unsafe-inline' is required because Nuxt injects an inline hydration/
//     payload script with no nonce in the current setup.
//   - frame-src:   js.stripe.com + hooks.stripe.com for the 3DS/checkout iframe,
//     and youtube-nocookie.com for the landing-page demo video (see below).
//   - form-action: 'self' + Stripe (checkout/portal POST redirects).
//   - img-src:     'self' data: blob: + https: (avatars, Supabase storage —
//     also covers GA's legacy pixel fallback, and the favicon set in public/).
//   - style-src:   'unsafe-inline' — Tailwind + Vue scoped styles inject inline.
//   - frame-ancestors 'none' is the CSP-level clickjacking guard; X-Frame-Options
//     DENY is the legacy equivalent for old browsers.
//
// IMPORTANT: the Supabase origin must appear literally in connect-src. It is
// read from SUPABASE_URL at build time below. If that env var is absent at
// build, the wildcard *.supabase.co fallback keeps Supabase reachable.
//
// AUTH FIX (Jul 2026): the `imports` block routes the $fetch auto-import
// through app/plugins/auth-fetch.client.js so its interceptors (Bearer token,
// 401 self-heal) apply to every component call. Without this, components bind
// the stock ofetch $fetch at build time and API calls go out unauthenticated.
//
// DEMO VIDEO (Aug 2026): app/components/VideoEmbed.vue lazily embeds the
// walkthrough from youtube-nocookie.com, so that origin is now in frame-src.
// The symptom of removing it is a grey panel reading "This content is blocked"
// where the player should be — the page itself keeps working, so it is easy to
// miss. The -nocookie host is deliberate: it sets no tracking cookies until
// playback, which keeps the landing page out of consent-banner territory.
// If a video ever refuses to play, check the console for a CSP violation
// naming www.youtube.com — YouTube redirects a few embeds there — and add
// that origin too rather than widening the directive pre-emptively.

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

// ── GA4 (Aug 2026) ────────────────────────────────────────────────────────
// Two different hosts, and both are required:
//   - gtag.js is SERVED from googletagmanager.com          → script-src
//   - the hits are SENT to google-analytics.com, and to a  → connect-src
//     region-specific *.analytics.google.com host for some
//     visitors, which is why the wildcards are here.
// googletagmanager.com also appears in connect-src because gtag fetches its
// remote config from there. Miss any of these and GA fails silently — the
// only symptom is a CSP violation in the browser console.
const GA_SCRIPT  = 'https://www.googletagmanager.com'
const GA_CONNECT = [
  'https://www.google-analytics.com',
  'https://analytics.google.com',
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://www.googletagmanager.com',
].join(' ')

// ── YouTube (Aug 2026) ────────────────────────────────────────────────────
// Only the iframe origin is needed. The player's own scripts and XHRs run
// inside that frame under YouTube's CSP, not ours, so nothing goes in
// script-src or connect-src. Poster images are served from public/, already
// covered by img-src 'self'.
const YOUTUBE_FRAME = 'https://www.youtube-nocookie.com'

// ── META PIXEL (Aug 2026) ─────────────────────────────────────────────────
// Same two-host shape as GA4, and the same silent-failure trap:
//   - fbevents.js is SERVED from connect.facebook.net   → script-src
//   - the events are SENT to www.facebook.com           → connect-src
// The /tr/ beacon is an image and is already covered by img-src https:.
// The pixel only loads when META_PIXEL_ID is set (see the plugin), so on a
// machine without the env var these entries simply go unused.
const META_SCRIPT  = 'https://connect.facebook.net'
const META_CONNECT = 'https://www.facebook.com'

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  `connect-src 'self' ${SUPABASE_SRC} https://api.stripe.com ${GA_CONNECT} ${META_CONNECT}`,
  `script-src 'self' 'unsafe-inline' https://js.stripe.com ${GA_SCRIPT} ${META_SCRIPT}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `frame-src https://js.stripe.com https://hooks.stripe.com ${YOUTUBE_FRAME}`,
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
  modules: [],
  css: ['~/assets/css/tailwind.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  // ── MOBILE (Aug 2026) ───────────────────────────────────────────────────
  // Nuxt's default viewport tag is 'width=device-width, initial-scale=1',
  // which omits viewport-fit. Without it iOS reports every env(safe-area-inset-*)
  // as 0, so the full-screen nav sheet and the firing sheet sat under the home
  // indicator. The .pb-safe / .pt-safe helpers in tailwind.css depend on this.
  //
  // maximum-scale / user-scalable are DELIBERATELY absent — pinch-zoom stays
  // available. The auto-zoom problem (Safari zooming in on focus of any control
  // under 16px, and never zooming back out) is fixed properly by the
  // `@media (pointer: coarse)` rule in tailwind.css, not by disabling zoom.
  //
  // ── FAVICON (Aug 2026) ──────────────────────────────────────────────────
  // There was no `link` array here at all, so the app shipped with no icon of
  // any kind — browsers fell back to a blank page glyph and an iOS home-screen
  // install got a screenshot of the page instead of a mark.
  //
  // Every file in public/ is generated from the SAME paths as
  // app/components/BrandFlame.vue, so the tab icon and the in-app logo cannot
  // drift apart. Three things about that set are deliberate and easy to undo
  // by accident if you ever regenerate them:
  //   1. The glyph is centred on its TRUE bounding box, not on BrandFlame's
  //      0–24 viewBox. The flame's mass sits low in that box (BrandFlame's
  //      translate(0 -1) exists to correct for it beside cap-height text), so
  //      centring on the viewBox leaves a standalone icon visibly low.
  //   2. favicon.ico carries DIFFERENT artwork per size: the 16px entry is a
  //      solid single-tone flame, because the flame-light inner core hollows
  //      the glyph out at that size and it reads as a droplet. 32 and 48 keep
  //      the two-tone treatment.
  //   3. apple-touch-icon and the PWA icons are OPAQUE on ink (#221708). iOS
  //      composites transparency onto black and Android maskable icons crop to
  //      a circle, so neither can be given a transparent background. iOS
  //      applies its own corner mask — do not pre-round the PNG.
  //
  // ORDER MATTERS in the link array: browsers take the first format they
  // understand, and every current one prefers the SVG.
  //
  // CSP: no change needed. img-src 'self' already covers the icons and
  // manifest-src 'self' already covers the manifest.
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // Legacy fallback — see note 2 above about the 16px entry.
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico', sizes: '48x48' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        // CHECK BEFORE DEPLOY: if a manifest already exists in public/ under
        // another name, point this at that file and merge the icons array into
        // it instead. Two manifests will fight over the install prompt.
        { rel: 'manifest', href: '/site.webmanifest' },
      ],
      meta: [
        // Stops iOS turning firing durations and cone numbers into phone links.
        { name: 'format-detection', content: 'telephone=no' },
        // Safari tints its chrome to match the parchment background. Kept in
        // sync with theme_color in site.webmanifest — change both together.
        { name: 'theme-color', content: '#faf6ef' },
      ],
    },
  },

  // AUTH FIX (Jul 2026) — see header comment.
  imports: {
    imports: [
      { name: '$fetch', from: '~/plugins/auth-fetch.client', priority: 20 },
    ],
  },

  // S9 — security headers on every route. The webhook route is exempted from
  // the strict CSP block below because Stripe POSTs to it server-to-server
  // (no browser, no CSP relevance) — headers are harmless there but we leave
  // the API namespace with the same headers; they don't affect non-HTML.
  routeRules: {
    '/**': { headers: SECURITY_HEADERS },
    // BETA-TEMP: /register-interest was the public beta URL before the
    // rename to /early-access (Aug 2026). Links are already in the wild,
    // so 301 old visits permanently to the new address.
    '/register-interest': { redirect: { to: '/early-access', statusCode: 301 } },
  },

  runtimeConfig: {
    stripeSecretKey:      process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret:  process.env.STRIPE_WEBHOOK_SECRET,
    supabaseSecretKey:    process.env.SUPABASE_SECRET_KEY,
    public: {
      supabaseUrl:            process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
      // GA4 measurement ID (G-XXXXXXXXXX). Set in Netlify env only — leaving
      // it unset locally means app/plugins/analytics.client.js no-ops, so dev
      // traffic never reaches the property.
      gaMeasurementId:        process.env.GA_MEASUREMENT_ID || '',
      // Meta Pixel id (a long number). Set in Netlify env only — unset locally
      // means app/plugins/meta-pixel.client.js no-ops, so dev traffic and
      // your own testing never pollute the ad reporting.
      metaPixelId:            process.env.META_PIXEL_ID || '',
    },
  },
})