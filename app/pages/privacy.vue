<!-- app/pages/privacy.vue -->
<!--
  Minimal privacy policy — deliberately generic. Written for the NZ Privacy
  Act 2020 (IPPs) without over-committing. Update the "Last updated" date
  whenever the substance changes. Google requires this URL to be live for
  OAuth brand verification (set it in Google Auth Platform → Branding).

  ANALYTICS (Aug 2026): GA4 was added (app/plugins/analytics.client.js), so
  the Cookies section no longer claims "no tracking cookies" — GA sets _ga
  and _ga_<id>, which are first-party analytics cookies, not advertising
  ones. The distinction is the whole reason the wording below is careful:
  we still don't run ad or cross-site tracking cookies, and Google Signals /
  ad personalisation are OFF in the property. If either of those changes,
  this section has to change with it, and a consent banner becomes a real
  question rather than an optional one.

  BRAND MARK (Aug 2026): 🔥 emoji → BrandFlame component, matching the auth
  layout and the in-app headers. terms.vue still carries the emoji.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10">

      <NuxtLink to="/" class="inline-flex items-center gap-2 text-lg font-bold text-ink tracking-tight hover:text-flame transition-colors mb-8">
        <BrandFlame class="w-5 h-5" />
        KilnMonitor
      </NuxtLink>

      <h1 class="text-3xl font-bold text-ink tracking-tight mb-1">Privacy Policy</h1>
      <p class="text-sm text-ink-muted italic mb-8">Last updated: 6 August 2026</p>

      <div class="flex flex-col gap-6 text-sm text-ink leading-relaxed">

        <section>
          <h2 class="text-lg font-bold mb-2">Who we are</h2>
          <p>
            KilnMonitor ("we", "us") is a kiln firing log service operated from
            New Zealand. This policy explains how we handle your personal
            information in accordance with the New Zealand Privacy Act 2020.
            Questions? Email
            <a href="mailto:kilnmonitorapp@gmail.com" class="text-flame font-semibold hover:underline">kilnmonitorapp@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">What we collect</h2>
          <p>
            We collect the information you give us when you create an account —
            your name and email address (via email signup or Google sign-in) —
            and the content you create in the app, such as firing schedules and
            temperature logs. We also collect basic technical information
            (such as IP address and browser type) needed to run and secure the
            service.
          </p>
          <p class="mt-3">
            We also collect anonymous usage information about how the site is
            used — which pages are visited, roughly where in the world visitors
            are, and what kind of device and browser they use. This is
            collected through Google Analytics and isn't linked to your
            account or used to identify you.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">How we use it</h2>
          <p>
            We use your information to provide and improve KilnMonitor, to
            communicate with you about your account, and to keep the service
            secure. We use usage information to understand which parts of the
            service people find useful and where they get stuck, so we can make
            it better. We do not sell your personal information, and we don't
            use it for third-party advertising.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Third-party services</h2>
          <p>
            We rely on trusted providers to run the service, including hosting,
            authentication, database, payment, email, and analytics providers.
            These providers may store data outside New Zealand (for example in
            the United States or Australia). We only share what's needed for
            them to provide their service to us.
          </p>
          <p class="mt-3">
            For website analytics we use Google Analytics, provided by Google
            LLC. Google processes this data on our behalf and may store it
            outside New Zealand. You can read Google's privacy policy at
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class="text-flame font-semibold hover:underline">policies.google.com/privacy</a>,
            and you can opt out of Google Analytics entirely using Google's
            browser add-on at
            <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" class="text-flame font-semibold hover:underline">tools.google.com/dlpage/gaoptout</a>.
            We have not enabled Google's advertising or ad-personalisation
            features.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Cookies</h2>
          <p>
            We use cookies and similar technologies for two purposes: to keep
            you signed in and make the service work, and to measure how the
            site is used. The analytics cookies set by Google Analytics
            (<span class="font-mono text-xs">_ga</span> and similar) record an
            anonymous identifier so we can tell repeat visits from new ones.
          </p>
          <p class="mt-3">
            We don't use advertising cookies, and we don't track you across
            other websites. Most browsers let you block or delete cookies in
            their settings — blocking analytics cookies won't stop the service
            working, though blocking all cookies will prevent you signing in.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">How long we keep it</h2>
          <p>
            We keep your information while your account is active. If you
            delete your account, we delete your personal information within a
            reasonable period, except where we're required to keep it (for
            example, billing records). Analytics data is retained by Google for
            a limited period and is anonymous, so it can't be traced back to
            you or deleted individually.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Your rights</h2>
          <p>
            Under the Privacy Act 2020 you may ask to access or correct the
            personal information we hold about you. Email us and we'll respond
            within a reasonable time. If you're not satisfied with how we
            handle your request, you can complain to the Office of the Privacy
            Commissioner (privacy.org.nz).
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Changes</h2>
          <p>
            We may update this policy from time to time. We'll post any changes
            on this page and update the date above.
          </p>
        </section>

      </div>

      <NuxtLink to="/" class="mt-10 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-flame transition-colors">
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to home
      </NuxtLink>

    </div>
  </div>
</template>

<script setup>
// app/pages/privacy.vue — public page, no auth, no layout chrome needed.
definePageMeta({ layout: false })
</script>