<!-- app/pages/privacy.vue -->
<!--
  Minimal privacy policy — deliberately generic. Written for the NZ Privacy
  Act 2020 (IPPs) without over-committing. Update the "Last updated" date
  whenever the substance changes. Google requires this URL to be live for
  OAuth brand verification (set it in Google Auth Platform → Branding).
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10">

      <NuxtLink to="/" class="inline-flex items-center gap-2 text-lg font-bold text-ink tracking-tight hover:text-flame transition-colors mb-8">
        🔥 KilnMonitor
      </NuxtLink>

      <h1 class="text-3xl font-bold text-ink tracking-tight mb-1">Privacy Policy</h1>
      <p class="text-sm text-ink-muted italic mb-8">Last updated: 27 July 2026</p>

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
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">How we use it</h2>
          <p>
            We use your information to provide and improve KilnMonitor, to
            communicate with you about your account, and to keep the service
            secure. We do not sell your personal information, and we don't use
            it for third-party advertising.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Third-party services</h2>
          <p>
            We rely on trusted providers to run the service, including hosting,
            authentication, database, payment, and email providers. These
            providers may store data outside New Zealand (for example in the
            United States or Australia). We only share what's needed for them
            to provide their service to us.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Cookies</h2>
          <p>
            We use cookies and similar technologies only where needed to keep
            you signed in and to make the service work. We don't use
            advertising or cross-site tracking cookies.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">How long we keep it</h2>
          <p>
            We keep your information while your account is active. If you
            delete your account, we delete your personal information within a
            reasonable period, except where we're required to keep it (for
            example, billing records).
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