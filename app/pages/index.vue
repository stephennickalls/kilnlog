<template>
  <div class="bg-parchment text-ink font-serif min-h-screen text-lg">

    <!-- Nav -->
    <nav class="sticky top-0 z-50 bg-parchment/95 backdrop-blur border-b border-parchment-3">
      <div class="max-w-[1200px] mx-auto px-10 h-[68px] flex items-center justify-between">
        <a href="/" class="text-[1.3rem] font-bold text-ink tracking-tight">KilnMonitor</a>
        <div class="hidden md:flex items-center gap-9 text-[0.95rem] text-ink-muted">
          <a href="#features" class="hover:text-ink transition-colors">Features</a>
          <a href="#pricing" class="hover:text-ink transition-colors">Pricing</a>
          <NuxtLink to="/login" class="hover:text-ink transition-colors">Sign in</NuxtLink>
          <NuxtLink to="/signup" class="bg-flame text-parchment px-5 py-2 rounded text-[0.875rem] font-semibold hover:bg-flame-dark transition-colors">Start free trial</NuxtLink>
        </div>
        <button class="md:hidden flex flex-col gap-[5px] p-1" aria-label="Menu" @click="mobileMenu = !mobileMenu">
          <span class="block w-6 h-[1.5px] bg-ink rounded"/>
          <span class="block w-6 h-[1.5px] bg-ink rounded"/>
          <span class="block w-6 h-[1.5px] bg-ink rounded"/>
        </button>
      </div>
      <div v-if="mobileMenu" class="md:hidden flex flex-col bg-parchment border-t border-parchment-3">
        <a href="#features" class="px-10 py-[0.875rem] text-ink-muted border-b border-parchment-3" @click="mobileMenu = false">Features</a>
        <a href="#pricing" class="px-10 py-[0.875rem] text-ink-muted border-b border-parchment-3" @click="mobileMenu = false">Pricing</a>
        <NuxtLink to="/login" class="px-10 py-[0.875rem] text-ink-muted border-b border-parchment-3" @click="mobileMenu = false">Sign in</NuxtLink>
        <NuxtLink to="/signup" class="px-10 py-[0.875rem] text-flame font-semibold" @click="mobileMenu = false">Start free trial →</NuxtLink>
      </div>
    </nav>

    <!-- Hero -->
    <section class="px-10 pt-20 pb-16 bg-parchment" style="background-image: radial-gradient(ellipse at 80% 20%, rgba(176,92,26,0.06) 0%, transparent 55%)">
      <div class="max-w-[1200px] mx-auto">

        <!-- Top copy -->
        <div class="max-w-[680px] mb-14">
          <p class="text-flame font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">Kiln firing log &amp; chart</p>
          <h1 class="text-[clamp(2.75rem,5vw,4.25rem)] font-bold text-ink leading-[1.07] tracking-tight mb-6">Your firing notebook,<br>finally digital.</h1>
          <p class="text-[1.1rem] text-ink-muted leading-[1.7] mb-7">Sometimes a firing comes out better than you planned — a glaze breaks just right, a reduction sings. Could you do it again? KilnMonitor records the whole curve as it happens, so the firing you want to repeat is one you actually can.</p>

          <!-- Simplicity strip -->
          <div class="flex items-center gap-4 bg-parchment-2 border-[1.5px] border-parchment-4 rounded-lg px-5 py-[0.875rem] mb-8 max-w-[800px]">
            <div class="w-9 h-9 bg-white border border-parchment-3 rounded-md flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M8 1L3 8h5l-2 5 6-7H7L8 1z" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div>
              <p class="text-[0.9rem] font-bold text-ink mb-0.5">No hardware. No setup. No fuss.</p>
              <p class="text-[0.8rem] text-ink-muted leading-snug">Draw a curve, log temperatures as you fire — right from the phone in your apron pocket.</p>
            </div>
          </div>

          <div class="flex gap-4 items-center flex-wrap mb-4">
            <NuxtLink to="/signup" class="inline-flex items-center gap-2 bg-flame text-parchment px-6 py-3 rounded text-[1rem] font-semibold hover:bg-flame-dark transition-all hover:-translate-y-px">
              Start free trial
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </NuxtLink>
            <NuxtLink to="/login" class="inline-flex items-center px-6 py-3 border-[1.5px] border-parchment-3 rounded text-[1rem] text-ink-muted hover:border-flame-light hover:text-ink transition-colors">Sign in</NuxtLink>
          </div>
          <p class="text-[0.825rem] text-ink-faint">30 days free · No credit card required · $49 NZD/year after</p>
        </div>

        <!-- Chart + fire cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6">

          <!-- Chart card -->
          <div class="bg-white border border-parchment-3 rounded-[14px] p-7 shadow-[0_8px_40px_rgba(58,30,8,0.09),0_2px_8px_rgba(58,30,8,0.05)]">
            <div class="flex justify-between items-center mb-[0.875rem]">
              <span class="text-[0.875rem] font-semibold text-ink-2">Cone 10 Reduction</span>
              <span class="flex items-center gap-[5px] bg-green-50 border border-green-200 rounded-full px-[10px] py-[3px] text-[0.75rem] font-bold text-green-700">
                <span class="w-[6px] h-[6px] bg-green-500 rounded-full animate-pulse"/>
                Active
              </span>
            </div>
            <div class="flex items-baseline gap-[6px] mb-4">
              <span class="text-[2.75rem] font-bold text-flame leading-none tracking-[-0.04em]">1,247</span>
              <span class="text-[1.2rem] font-semibold text-flame-light">°C</span>
              <span class="text-[0.8rem] text-green-700 bg-green-50 border border-green-200 rounded px-[7px] py-[2px] ml-1">+8°/min</span>
            </div>
            <svg class="w-full mb-4" viewBox="0 0 340 120" fill="none">
              <line x1="0" y1="95" x2="340" y2="95" stroke="#d4c9b0" stroke-width="0.5"/>
              <line x1="0" y1="62" x2="340" y2="62" stroke="#d4c9b0" stroke-width="0.5"/>
              <line x1="0" y1="28" x2="340" y2="28" stroke="#d4c9b0" stroke-width="0.5"/>
              <text x="2" y="98" font-size="9" fill="#a08060" font-family="Georgia, serif">0°C</text>
              <text x="2" y="65" font-size="9" fill="#a08060" font-family="Georgia, serif">640°C</text>
              <text x="2" y="31" font-size="9" fill="#a08060" font-family="Georgia, serif">1280°C</text>
              <polyline points="30,110 70,88 110,62 155,28 195,20 230,23 265,75 310,108" stroke="#c8a87a" stroke-width="1.5" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M30,110 L65,92 L105,65 L148,30 L188,21 L220,24 L248,48 L248,120 L30,120 Z" fill="#b05c1a" fill-opacity="0.08"/>
              <polyline points="30,110 65,92 105,65 148,30 188,21 220,24 248,48" stroke="#b05c1a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <circle cx="248" cy="48" r="4" fill="#b05c1a"/>
              <circle cx="248" cy="48" r="7" fill="#b05c1a" fill-opacity="0.2"/>
              <text x="27" y="118" font-size="9" fill="#a08060" font-family="Georgia, serif">0h</text>
              <text x="155" y="118" font-size="9" fill="#a08060" font-family="Georgia, serif" text-anchor="middle">4h</text>
              <text x="308" y="118" font-size="9" fill="#a08060" font-family="Georgia, serif">8h</text>
              <line x1="258" y1="14" x2="275" y2="14" stroke="#b05c1a" stroke-width="2"/>
              <text x="278" y="17" font-size="9" fill="#7a5c3a" font-family="Georgia, serif">Actual</text>
              <line x1="258" y1="26" x2="275" y2="26" stroke="#c8a87a" stroke-width="1.5" stroke-dasharray="4 3"/>
              <text x="278" y="29" font-size="9" fill="#7a5c3a" font-family="Georgia, serif">Planned</text>
            </svg>
            <div class="grid grid-cols-3 border-t border-parchment-2 pt-4">
              <div class="flex flex-col gap-[3px]">
                <span class="text-[1.05rem] font-bold text-ink tracking-tight">1,280°C</span>
                <span class="text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint">Peak target</span>
              </div>
              <div class="flex flex-col gap-[3px]">
                <span class="text-[1.05rem] font-bold text-ink tracking-tight">4h 12m</span>
                <span class="text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint">Elapsed</span>
              </div>
              <div class="flex flex-col gap-[3px]">
                <span class="text-[1.05rem] font-bold text-ink tracking-tight">84</span>
                <span class="text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint">Readings</span>
              </div>
            </div>
          </div>

          <!-- Fire type cards -->
          <div class="flex flex-col gap-3">
            <div class="bg-parchment-2 border border-parchment-4 rounded-[10px] px-[1.625rem] py-6 flex flex-col gap-2">
              <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame">Gas reduction</p>
              <p class="text-[0.9rem] text-ink-muted leading-relaxed">Dial in your reduction windows with real data. Know exactly when your kiln hit temperature — every time.</p>
            </div>
            <div class="bg-parchment-2 border border-parchment-4 rounded-[10px] px-[1.625rem] py-6 flex flex-col gap-2">
              <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame">Wood firing</p>
              <p class="text-[0.9rem] text-ink-muted leading-relaxed">No two firings are alike. Log every stoke cycle and finally understand what drives your best results.</p>
            </div>
            <div class="bg-flame-bg border border-parchment-4 rounded-[10px] px-[1.625rem] py-6 flex flex-col gap-2">
              <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame">Electric too</p>
              <p class="text-[0.9rem] text-ink-muted leading-relaxed">Controller showing the temperature but not the story? Keep your own record of every firing, in one place.</p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Bridge — dark section -->
    <section class="bg-ink px-10 py-20" style="background-image: radial-gradient(ellipse at 20% 50%, rgba(176,92,26,0.14) 0%, transparent 60%)">
      <div class="max-w-[1200px] mx-auto">
        <p class="text-flame-light font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">Built for the studio</p>
        <h2 class="text-[clamp(2.25rem,4vw,3.25rem)] font-bold text-parchment leading-[1.12] tracking-tight mb-5">Plan it. Log it.<br>Learn from it.</h2>
        <p class="text-[1.05rem] text-ink-muted leading-[1.7] max-w-[560px]">Sketch your firing curve, tap in temperatures as you go, and watch your kiln track against the plan. Every firing saved forever — so you can repeat your wins and stop repeating your mistakes.</p>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="bg-parchment-2 border-y border-parchment-3 px-10 py-24">
      <div class="max-w-[1200px] mx-auto">
        <p class="text-flame font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">What you get</p>
        <h2 class="text-[clamp(2rem,3.5vw,2.875rem)] font-bold text-ink leading-[1.15] tracking-tight mb-14">Everything you need.<br>Nothing you don't.</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-px bg-parchment-3 border border-parchment-3 rounded-[10px] overflow-hidden">

          <div class="md:col-span-2 bg-flame-bg p-8 flex flex-col gap-[0.875rem]">
            <div class="w-11 h-11 bg-flame/10 rounded-lg flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 17l4-4 3 3 4-5 5 6" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 5h16" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round"/></svg>
            </div>
            <h3 class="text-[1.05rem] font-bold text-ink tracking-tight">Planned vs actual, live</h3>
            <p class="text-[0.925rem] text-ink-muted leading-[1.65]">Draw your target curve, then watch your real readings track against it as the firing climbs. See at a glance whether you're ahead, behind, or right on the line — and adjust while it still matters.</p>
          </div>

          <div class="bg-parchment p-8 flex flex-col gap-[0.875rem]">
            <div class="w-11 h-11 bg-flame/10 rounded-lg flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 6h14M4 10h14M4 14h8" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round"/><circle cx="17" cy="16" r="3" stroke="#b05c1a" stroke-width="1.25"/><path d="M17 14.5v1.5l1 1" stroke="#b05c1a" stroke-width="1" stroke-linecap="round"/></svg>
            </div>
            <h3 class="text-[1.05rem] font-bold text-ink tracking-tight">Log in a tap</h3>
            <p class="text-[0.925rem] text-ink-muted leading-[1.65]">Check the kiln, tap in the temperature, done. The chart draws itself. Mis-typed a reading? Edit or delete it in a second.</p>
          </div>

          <div class="bg-parchment p-8 flex flex-col gap-[0.875rem]">
            <div class="w-11 h-11 bg-flame/10 rounded-lg flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="2" stroke="#b05c1a" stroke-width="1.25"/><path d="M7 8h8M7 12h5" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round"/><path d="M14 15l2-2 2 2" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <h3 class="text-[1.05rem] font-bold text-ink tracking-tight">Schedule library</h3>
            <p class="text-[0.925rem] text-ink-muted leading-[1.65]">Start from a built-in bisque or glaze curve, or save your own and reuse it. No re-drawing the same firing twice.</p>
          </div>

          <div class="bg-parchment p-8 flex flex-col gap-[0.875rem]">
            <div class="w-11 h-11 bg-flame/10 rounded-lg flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2C6.03 2 2 6.03 2 11s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" stroke="#b05c1a" stroke-width="1.25"/><path d="M11 6v5l3 3" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round"/></svg>
            </div>
            <h3 class="text-[1.05rem] font-bold text-ink tracking-tight">Full firing history</h3>
            <p class="text-[0.925rem] text-ink-muted leading-[1.65]">Every firing saved with its curve, notes, and stats. Compare past firings to understand what changed — and why one came out better.</p>
          </div>

          <div class="bg-ink p-8 flex flex-col justify-center gap-[0.625rem]">
            <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame-light">Firing insight</p>
            <div class="text-[2.75rem] font-bold text-parchment leading-none tracking-[-0.04em]">1,280<span class="text-[1.375rem] text-flame-light">°C</span></div>
            <p class="text-[0.825rem] text-ink-muted leading-[1.5]">Peak temperature — Cone 10 reduction<br>Duration 8h 40m · 142 readings logged</p>
          </div>

        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="bg-parchment px-10 py-24">
      <div class="max-w-[1200px] mx-auto">
        <p class="text-flame font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">Simple pricing</p>
        <h2 class="text-[clamp(2rem,3.5vw,2.875rem)] font-bold text-ink leading-[1.15] tracking-tight mb-14">One plan. Everything included.</h2>

        <div class="bg-white border border-parchment-3 rounded-[14px] p-12 shadow-[0_4px_24px_rgba(58,30,8,0.07)] grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-14 items-start">
          <div>
            <span class="inline-block bg-flame-bg border border-flame-light text-flame text-[0.75rem] font-bold uppercase tracking-[0.1em] px-3 py-1 rounded mb-5">Annual plan</span>
            <div class="flex items-baseline gap-1 mb-2">
              <span class="text-[1.625rem] font-bold text-ink-muted self-start mt-2">$</span>
              <span class="text-[4.5rem] font-bold text-ink leading-none tracking-[-0.04em]">49</span>
              <span class="text-[1.1rem] text-ink-faint">NZD / year</span>
            </div>
            <p class="text-[0.9rem] text-ink-faint mb-8">That's just $4.08 per month — less than a bag of clay.</p>
            <NuxtLink to="/signup" class="inline-flex items-center gap-2 bg-flame text-parchment px-8 py-4 rounded text-[1.05rem] font-semibold hover:bg-flame-dark transition-all hover:-translate-y-px">
              Start 30-day free trial
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </NuxtLink>
            <p class="text-[0.825rem] text-ink-faint mt-3">No credit card required to start</p>
          </div>

          <div class="hidden md:block w-px bg-parchment-3 self-stretch"/>

          <div>
            <p class="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink-faint mb-4">Everything included:</p>
            <ul class="flex flex-col gap-3 list-none p-0">
              <li v-for="item in pricingItems" :key="item" class="flex items-center gap-3 text-[0.975rem] text-ink-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="shrink-0"><path d="M2 7l3.5 3.5L12 3.5" stroke="#b05c1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="bg-ink px-10 py-24" style="background-image: radial-gradient(ellipse at 30% 50%, rgba(176,92,26,0.15) 0%, transparent 60%)">
      <div class="max-w-[1200px] mx-auto text-center flex flex-col items-center gap-4">
        <h2 class="text-[clamp(2rem,3.5vw,2.875rem)] font-bold text-parchment leading-[1.2] tracking-tight">Never lose a good firing again.</h2>
        <p class="text-[1.1rem] text-ink-muted mb-2">Start your 30-day free trial. No credit card, no commitment.</p>
        <NuxtLink to="/signup" class="inline-flex items-center gap-2 bg-flame text-parchment px-8 py-4 rounded text-[1.05rem] font-semibold hover:bg-flame-dark transition-all hover:-translate-y-px">
          Get started free
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-ink border-t border-white/[0.08] px-10 py-7">
      <div class="max-w-[1200px] mx-auto flex items-center justify-between gap-4 flex-wrap">
        <span class="text-[0.95rem] font-bold text-parchment">KilnMonitor</span>
        <span class="text-[0.825rem] text-ink-muted">&copy; {{ new Date().getFullYear() }} KilnMonitor. Made by a potter, for potters.</span>
        <div class="flex gap-7 text-[0.825rem] text-ink-muted">
          <NuxtLink to="/login" class="hover:text-parchment transition-colors">Sign in</NuxtLink>
          <NuxtLink to="/signup" class="hover:text-parchment transition-colors">Sign up</NuxtLink>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup>
definePageMeta({ layout: false, middleware: [] })
const mobileMenu = ref(false)
const pricingItems = [
  'Unlimited kiln firings',
  'Planned vs actual chart',
  'Tap-to-log readings',
  'Full firing history',
  'Schedule library',
  'Works on phone & desktop',
]
</script>