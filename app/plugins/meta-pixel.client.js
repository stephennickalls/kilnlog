// File: app/plugins/meta-pixel.client.js
//
// Meta (Facebook) Pixel — loaded only when META_PIXEL_ID is set, exactly like
// app/plugins/analytics.client.js. Leaving the env var unset locally means dev
// traffic never reaches the pixel, so set it in Netlify only.
//
// CSP: nuxt.config.ts must allow https://connect.facebook.net in script-src
// (that is where fbevents.js is served from) and https://www.facebook.com in
// connect-src (where the events are sent). The /tr/ tracking pixel image is
// already covered by img-src https:. Miss either and the pixel fails silently
// with only a console violation — the same trap GA4 has.
//
// SPA PAGEVIEWS: fbq('track', 'PageView') fires once on load and then on every
// client-side route change. Without the router hook, a visitor moving from /
// to /early-access registers as a single page view, which makes the ad look
// worse than it is.
//
// CONVERSIONS: this exposes $fbq so a page can report a signup:
//   const { $fbq } = useNuxtApp()
//   $fbq('track', 'Lead')
// Call that after the /api/beta-interest POST resolves, not on button click,
// so a failed submission is not counted as a lead.
//
// PRIVACY: the pixel sets third-party cookies. If you later add a consent
// banner, gate this plugin behind it rather than unloading it afterwards.

export default defineNuxtPlugin((nuxtApp) => {
  const pixelId = useRuntimeConfig().public.metaPixelId
  if (!pixelId) {
    // No-op stub so call sites never have to null-check $fbq.
    nuxtApp.provide('fbq', () => {})
    return
  }

  // Meta's standard loader. Queues calls until fbevents.js arrives, so the
  // init and first PageView below are safe to fire immediately.
  /* eslint-disable */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
    }
    if (!f._fbq) f._fbq = n
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    t = b.createElement(e)
    t.async = true
    t.src = v
    s = b.getElementsByTagName(e)[0]
    s.parentNode.insertBefore(t, s)
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
  /* eslint-enable */

  window.fbq('init', pixelId)
  window.fbq('track', 'PageView')

  // Client-side navigations are invisible to the pixel otherwise.
  nuxtApp.$router.afterEach(() => {
    window.fbq('track', 'PageView')
  })

  nuxtApp.provide('fbq', (...args) => window.fbq(...args))
})