// File: app/plugins/analytics.client.js
//
// GA4 (Aug 2026). Client-only — gtag touches window/document.
//
// Why manual page_view: gtag's automatic page_view fires once, on script load.
// Nuxt navigations are client-side route changes, so every page after the
// first would never be recorded. We disable send_page_view and emit one
// ourselves per afterEach.
//
// No-ops when GA_MEASUREMENT_ID is unset (local dev, previews) so dev traffic
// never pollutes the property. Set the env var only in production.
//
// CSP: googletagmanager.com is in script-src and google-analytics.com in
// connect-src (nuxt.config.ts). If GA ever "just stops working", check there
// first — CSP blocks show only in the browser console, never server-side.

export default defineNuxtPlugin(() => {
  const id = useRuntimeConfig().public.gaMeasurementId
  if (!id) return

  window.dataLayer = window.dataLayer || []
  function gtag() { window.dataLayer.push(arguments) }
  window.gtag = gtag

  gtag('js', new Date())
  gtag('config', id, {
    send_page_view: false,
    anonymize_ip:   true,
  })

  const s = document.createElement('script')
  s.async = true
  s.src   = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(s)

  const router = useRouter()

  // Fire the initial view once hydration settles, then one per navigation.
  router.isReady().then(() => {
    sendPageView(router.currentRoute.value)
    router.afterEach(to => sendPageView(to))
  })

  function sendPageView(route) {
    gtag('event', 'page_view', {
      page_path:     route.fullPath,
      page_location: window.location.href,
      page_title:    document.title,
    })
  }
})