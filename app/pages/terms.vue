<!-- app/pages/terms.vue -->
<!--
  Minimal terms of service — deliberately generic, deliberately light on
  promises. NZ law, NZ courts. Mirrors app/pages/privacy.vue exactly in
  structure and styling; if you restyle one, restyle both.

  Google requires this URL for OAuth brand verification (set it in
  Google Auth Platform → Branding → "Application terms of service link").

  BETA NOTE: the "Beta" and "Payment" sections below reflect the current
  beta-recruitment state (free access, no billing). When paid subscriptions
  go live, revisit both — grep "BETA-TEMP" across the repo.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">
    <div class="max-w-2xl mx-auto px-4 sm:px-6 py-10">

      <NuxtLink to="/" class="inline-flex items-center gap-2 text-lg font-bold text-ink tracking-tight hover:text-flame transition-colors mb-8">
        🔥 KilnMonitor
      </NuxtLink>

      <h1 class="text-3xl font-bold text-ink tracking-tight mb-1">Terms of Service</h1>
      <p class="text-sm text-ink-muted italic mb-8">Last updated: 27 July 2026</p>

      <div class="flex flex-col gap-6 text-sm text-ink leading-relaxed">

        <section>
          <h2 class="text-lg font-bold mb-2">Agreement</h2>
          <p>
            These terms apply to your use of KilnMonitor ("the service"),
            operated from New Zealand. By creating an account or using the
            service, you agree to them. If you don't agree, please don't use
            the service. Questions? Email
            <a href="mailto:kilnmonitorapp@gmail.com" class="text-flame font-semibold hover:underline">kilnmonitorapp@gmail.com</a>.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Your account</h2>
          <p>
            You're responsible for keeping your login details secure and for
            everything that happens under your account. You must provide
            accurate information when signing up, and you must be old enough
            to enter a contract in your country. Don't share your account with
            others.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Acceptable use</h2>
          <p>
            Use the service lawfully and reasonably. Don't attempt to break,
            overload, reverse-engineer, or gain unauthorised access to the
            service, and don't use it to store or transmit anything unlawful.
            We may suspend or close accounts that breach these terms.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Your content</h2>
          <p>
            Your firing schedules, logs, and notes remain yours. You grant us
            only the permission needed to store and display that content back
            to you as part of running the service. You're responsible for
            keeping your own copies of anything important — an export option is
            available in your account settings.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Beta access</h2>
          <p>
            The service is currently in beta. Features may change, break, or be
            removed without notice, and data loss is possible. Beta access is
            provided free of charge and may be ended or changed at any time.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Payment</h2>
          <p>
            Where paid subscriptions apply, fees are stated on our pricing page
            and charged in advance for the period shown. Subscriptions renew
            unless cancelled before the renewal date. Except where required by
            law, fees already paid are not refundable. We may change our prices
            with reasonable notice.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Availability</h2>
          <p>
            We aim to keep the service running but don't guarantee it will be
            uninterrupted, error-free, or available at any particular time. We
            may change, suspend, or discontinue parts of the service.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Not a safety system</h2>
          <p>
            KilnMonitor is a record-keeping and planning tool. It does not
            monitor, control, or supervise your kiln, and it must not be relied
            on for safety. You remain solely responsible for operating your
            kiln safely and for following your kiln and equipment
            manufacturers' instructions.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Liability</h2>
          <p>
            The service is provided "as is". To the extent permitted by law, we
            exclude all warranties and are not liable for indirect or
            consequential loss, or for loss of data, profits, or damage to
            kilns, work, or property. Where liability can't be excluded, it is
            limited to the amount you paid us in the previous twelve months.
            Nothing in these terms limits your rights under the Consumer
            Guarantees Act 1993 where that Act applies; if you use the service
            for business purposes, that Act does not apply.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Ending your use</h2>
          <p>
            You may stop using the service and delete your account at any time
            from your account settings. We may suspend or close your account if
            you breach these terms or if we stop offering the service.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Privacy</h2>
          <p>
            Our
            <NuxtLink to="/privacy" class="text-flame font-semibold hover:underline">Privacy Policy</NuxtLink>
            explains how we handle your personal information and forms part of
            these terms.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Changes</h2>
          <p>
            We may update these terms from time to time. We'll post any changes
            on this page and update the date above. Continuing to use the
            service after a change means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 class="text-lg font-bold mb-2">Governing law</h2>
          <p>
            These terms are governed by the laws of New Zealand, and the New
            Zealand courts have non-exclusive jurisdiction over any dispute.
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
// app/pages/terms.vue — public page, no auth, no layout chrome needed.
definePageMeta({ layout: false })
</script>