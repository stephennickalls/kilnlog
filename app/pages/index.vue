<!-- app/pages/index.vue -->
<!--
  Marketing landing page. Celadon appears in three meaningful places:
  1. Hero chart planned/schedule line — the schedule IS the celadon world
  2. Active pill + rate chip — on-track/good state = celadon (matches the app)
  3. Schedule library feature card icon — the one feature in the celadon world
  Everything else stays warm (flame/parchment/ink). No decoration.

  BETA-TEMP: during beta recruitment the page announces the beta (top BetaBanner)
  and every "Start free trial / signup" CTA points to /register-interest instead
  of /signup. Grep "BETA-TEMP" to find and revert every change:
    - <BetaBanner /> at the top of the root div (delete the line)
    - nav + hero + pricing + final CTAs: to="/register-interest" (was /signup)
      and their beta wording
    - hero kicker, pricing sub-line, hero reassurance line reworded for beta
  Reverting the CTAs: swap to="/register-interest" back to to="/signup" and
  restore the original button text noted in each BETA-TEMP comment.
-->
<template>
  <div class="bg-parchment text-ink font-serif min-h-screen text-lg">

    <!-- BETA-TEMP: beta announcement bar (delete this line to revert) -->
    <BetaBanner />

    <!-- Nav -->
    <nav class="sticky top-0 z-50 bg-parchment/95 backdrop-blur border-b border-parchment-3">
      <div class="max-w-[1200px] mx-auto px-10 h-[68px] flex items-center justify-between">
        <a href="/" class="text-[1.3rem] font-bold text-ink tracking-tight">KilnMonitor</a>
        <div class="hidden md:flex items-center gap-9 text-[0.95rem] text-ink-muted">
          <a href="#features" class="hover:text-ink transition-colors">Features</a>
          <a href="#pricing" class="hover:text-ink transition-colors">Pricing</a>
          <NuxtLink to="/login" class="hover:text-ink transition-colors">Sign in</NuxtLink>
          <!-- BETA-TEMP: was to="/signup" · "Start free trial" -->
          <NuxtLink to="/register-interest" class="bg-flame text-parchment px-5 py-2 rounded text-[0.875rem] font-semibold hover:bg-flame-dark transition-colors">Join the beta</NuxtLink>
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
        <!-- BETA-TEMP: was to="/signup" · "Start free trial →" -->
        <NuxtLink to="/register-interest" class="px-10 py-[0.875rem] text-flame font-semibold" @click="mobileMenu = false">Join the beta →</NuxtLink>
      </div>
    </nav>

    <!-- Hero -->
    <section class="px-10 pt-20 pb-16 bg-parchment" style="background-image: radial-gradient(ellipse at 80% 20%, rgba(176,92,26,0.06) 0%, transparent 55%)">
      <div class="max-w-[1200px] mx-auto">

        <!-- Top copy -->
        <div class="max-w-[680px] mb-14">
          <!-- BETA-TEMP: was "Kiln firing log &amp; chart" -->
          <p class="text-flame font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">Now in private beta</p>
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
            <!-- BETA-TEMP: was to="/signup" · "Start free trial" -->
            <NuxtLink to="/register-interest" class="inline-flex items-center gap-2 bg-flame text-parchment px-6 py-3 rounded text-[1rem] font-semibold hover:bg-flame-dark transition-all hover:-translate-y-px">
              Join the beta
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </NuxtLink>
            <NuxtLink to="/login" class="inline-flex items-center px-6 py-3 border-[1.5px] border-parchment-3 rounded text-[1rem] text-ink-muted hover:border-flame-light hover:text-ink transition-colors">Sign in</NuxtLink>
          </div>
          <!-- BETA-TEMP: was "30 days free · No credit card required · $49 NZD/year after" -->
          <p class="text-[0.825rem] text-ink-faint">Free early access for selected testers · No credit card · $49 NZD/year after launch</p>
        </div>

        <!-- Chart + fire cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-6">

          <!-- Chart card. Recreates the REAL app chart (useKilnChart.js + the
               plot styling in app.vue): faint celadon graph-paper ground,
               Chart.js colours — Planned = warm grey #a8a29e dashed [6,4],
               Actual = orange #f97316 solid with a soft orange fill — a top
               point-style legend, plus the live features (indigo reduction
               band, celadon NOW line + target dot).
               Story: the PLANNED grey line is the whole schedule start→end
               (climb → 1,287° peak → hold → cool-down). The ACTUAL orange line
               traces only up to NOW, which sits high on the rise, a touch BEHIND
               plan. Rates are °C/MIN and ROUNDED to whole numbers (the app's
               Math.round): at the final approach to Cone 10 a real fire slows to
               ~60°C/hr ≈ +1°C/min — the gentle slope drawn at NOW.
               One coordinate space (viewBox 480×200). Scale: x = 42 + h·52.5;
               y = 176 − t·0.10156 (0°C=176, ~1477°C=26) so the peak stands tall.
               NOW at 4.3h (x268), 1,179°C (y56); planned target there 1,225°. -->
          <div class="bg-white border border-parchment-3 rounded-[14px] p-7 shadow-[0_8px_40px_rgba(58,30,8,0.09),0_2px_8px_rgba(58,30,8,0.05)]">
            <div class="flex justify-between items-center mb-[0.875rem]">
              <span class="text-[0.875rem] font-semibold text-ink-2">Cone 10 Reduction</span>
              <span class="flex items-center gap-[5px] bg-celadon-bg border border-celadon/30 rounded-full px-[10px] py-[3px] text-[0.75rem] font-bold text-celadon-dark">
                <span class="w-[6px] h-[6px] bg-celadon rounded-full animate-pulse"/>
                Active
              </span>
            </div>
            <div class="flex items-baseline gap-[6px] mb-4">
              <span class="text-[2.75rem] font-bold text-flame leading-none tracking-[-0.04em]">1,179</span>
              <span class="text-[1.2rem] font-semibold text-flame-light">°C</span>
              <!-- Rate on-track = celadon. °C/MIN, and the app ROUNDS rate to a
                   whole number (Math.round in useFiringStats), so it's +1, not
                   +1.4. ~1°C/min (≈60°C/hr) is a realistic slow final approach
                   to Cone 10, matching the gentle actual slope at NOW. -->
              <span class="text-[0.8rem] text-celadon-dark bg-celadon-bg border border-celadon/30 rounded px-[7px] py-[2px] ml-1">+1°C/m</span>
            </div>

            <!-- Graph-paper ground behind the plot (as in app.vue) -->
            <div class="w-full rounded-lg overflow-hidden mb-4" style="background: linear-gradient(to right, rgba(95,138,120,0.06) 1px, transparent 1px) 0 0 / 12.5% 100%, linear-gradient(to bottom, rgba(95,138,120,0.06) 1px, transparent 1px) 0 0 / 100% 25%, #fcfdfc;">
              <svg class="w-full block" viewBox="0 0 480 200" fill="none">
                <!-- Top legend — Chart.js point-style: orange Actual, grey Planned -->
                <circle cx="196" cy="13" r="4" fill="#f97316"/>
                <text x="206" y="17" font-size="11" fill="#57534e" font-family="Georgia, serif">Actual</text>
                <circle cx="266" cy="13" r="4" fill="#a8a29e"/>
                <text x="276" y="17" font-size="11" fill="#57534e" font-family="Georgia, serif">Planned</text>

                <!-- y-axis labels (°C) -->
                <text x="4" y="179" font-size="10" fill="#a8a29e" font-family="Georgia, serif">0°C</text>
                <text x="4" y="128" font-size="10" fill="#a8a29e" font-family="Georgia, serif">500°C</text>
                <text x="4" y="77" font-size="10" fill="#a8a29e" font-family="Georgia, serif">1000°C</text>

                <!-- Reduction band (open/live): body reduction from ~900°C to NOW,
                     mapped along the actual curve. rgba matches reductionBandsPlugin. -->
                <rect x="200" y="28" width="66" height="148" fill="rgba(99,102,241,0.10)"/>
                <line x1="200" y1="28" x2="200" y2="176" stroke="rgba(99,102,241,0.55)" stroke-width="1" stroke-dasharray="4 4"/>
                <line x1="266" y1="28" x2="266" y2="176" stroke="rgba(99,102,241,0.55)" stroke-width="1" stroke-dasharray="4 4"/>
                <text x="204" y="40" font-size="9" font-weight="bold" fill="rgba(79,70,229,0.9)" font-family="sans-serif">Reduction…</text>

                <!-- Planned — warm grey #a8a29e dashed [6,4]. FULL schedule:
                     climb → peak 1,287° (~5.1h) → hold → cool-down to end. -->
                <polyline points="42,174 84,161 126,133 168,105 200,82 226,65 252,55 268,52 289,47 310,45 336,45 383,71 462,111" stroke="#a8a29e" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

                <!-- Actual — orange #f97316 solid, soft orange fill. Only up to
                     NOW; sits a touch BELOW plan (behind), slope gentle at the top. -->
                <path d="M42,174 L84,162 L126,135 L168,107 L200,85 L226,69 L252,59 L268,56 L268,176 L42,176 Z" fill="rgba(249,115,22,0.08)"/>
                <polyline points="42,174 84,162 126,135 168,107 200,85 226,69 252,59 268,56" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

                <!-- NOW line — celadon (nowLinePlugin), high on the rise -->
                <line x1="268" y1="28" x2="268" y2="176" stroke="rgba(95,138,120,0.9)" stroke-width="1.5"/>
                <rect x="268" y="28" width="30" height="14" fill="rgba(95,138,120,0.95)"/>
                <text x="283" y="38" font-size="9" font-weight="bold" fill="#fff" font-family="sans-serif" text-anchor="middle">NOW</text>

                <!-- Planned target dot at NOW — ABOVE the actual (we're behind) -->
                <circle cx="268" cy="52" r="4" fill="rgba(95,138,120,1)" stroke="#fff" stroke-width="1.5"/>
                <text x="300" y="55" font-size="10" font-weight="bold" fill="rgba(58,90,72,0.95)" font-family="sans-serif">target 1,225°</text>

                <!-- Latest reading marker — orange, on the actual curve -->
                <circle cx="268" cy="56" r="4.5" fill="#f97316" stroke="#fff" stroke-width="2"/>

                <!-- x-axis time labels -->
                <text x="42" y="194" font-size="10" fill="#a8a29e" font-family="Georgia, serif">0h</text>
                <text x="252" y="194" font-size="10" fill="#a8a29e" font-family="Georgia, serif" text-anchor="middle">4h</text>
                <text x="462" y="194" font-size="10" fill="#a8a29e" font-family="Georgia, serif" text-anchor="end">8h</text>
              </svg>
            </div>
            <div class="grid grid-cols-3 border-t border-parchment-2 pt-4">
              <div class="flex flex-col gap-[3px]">
                <span class="text-[1.05rem] font-bold text-ink tracking-tight">1,287°C</span>
                <span class="text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint">Peak target</span>
              </div>
              <div class="flex flex-col gap-[3px]">
                <span class="text-[1.05rem] font-bold text-ink tracking-tight">4h 18m</span>
                <span class="text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint">Elapsed</span>
              </div>
              <div class="flex flex-col gap-[3px]">
                <span class="text-[1.05rem] font-bold text-ink tracking-tight">+1<span class="text-ink-faint font-semibold">/+2</span></span>
                <span class="text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint">Rate °C/min · act/tgt</span>
              </div>
            </div>
          </div>

          <!-- Feature story cards — each maps to a real, shipped feature.
               Order: NOW line/recalibrate first, then the product's soul (the
               founder's gas-out story → Save as schedule) in the middle, then
               planned + live reduction bands (G11). The middle card is the
               flame-bg hero. -->
          <div class="flex flex-col gap-3">
            <div class="bg-parchment-2 border border-parchment-4 rounded-[10px] px-[1.625rem] py-6 flex flex-col gap-2">
              <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame">Always know where you are</p>
              <p class="text-[0.9rem] text-ink-muted leading-relaxed">The NOW line pins this exact minute to your plan and shows the target you should be at. Running behind? Recalibrate slides the rest of the schedule to meet your kiln where it is.</p>
            </div>
            <div class="bg-flame-bg border border-parchment-4 rounded-[10px] px-[1.625rem] py-6 flex flex-col gap-2">
              <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame">Repeat the happy accident</p>
              <p class="text-[0.9rem] text-ink-muted leading-relaxed">Ran out of gas mid-firing, had to jump in the car to get more gas to carried on — and the glaze came out singing? The whole firing was logged, gas-out and all. Save what <em>actually happened</em> as a schedule and repeat the firing that worked, not the plan that didn't.</p>
            </div>
            <div class="bg-parchment-2 border border-parchment-4 rounded-[10px] px-[1.625rem] py-6 flex flex-col gap-2">
              <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame">Reduction, planned &amp; real</p>
              <p class="text-[0.9rem] text-ink-muted leading-relaxed">Mark where you intend to reduce on your schedule, then log the real thing live at the kiln. The chart shows both — so you learn how your intentions and your atmosphere actually line up.</p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Bridge — dark section -->
    <section class="bg-ink px-10 py-20" style="background-image: radial-gradient(ellipse at 20% 50%, rgba(176,92,26,0.14) 0%, transparent 60%)">
      <div class="max-w-[1200px] mx-auto">
        <p class="text-flame-light font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">Built for the studio</p>
        <h2 class="text-[clamp(2.25rem,4vw,3.25rem)] font-bold text-parchment leading-[1.12] tracking-tight mb-5">Plan it.<br>Log it.<br>Learn from it.</h2>
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

          <!-- Schedule library — celadon icon (this is the celadon/schedule world) -->
          <div class="bg-parchment p-8 flex flex-col gap-[0.875rem]">
            <div class="w-11 h-11 bg-celadon-bg rounded-lg flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="2" stroke="#5f8a78" stroke-width="1.25"/><path d="M7 8h8M7 12h5" stroke="#5f8a78" stroke-width="1.25" stroke-linecap="round"/><path d="M14 15l2-2 2 2" stroke="#5f8a78" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
        <h2 class="text-[clamp(2rem,3.5vw,2.875rem)] font-bold text-ink leading-[1.15] tracking-tight mb-14">One plan.<br>Everything included.</h2>

        <div class="bg-white border border-parchment-3 rounded-[14px] p-12 shadow-[0_4px_24px_rgba(58,30,8,0.07)] grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-14 items-start">
          <div>
            <span class="inline-block bg-flame-bg border border-flame-light text-flame text-[0.75rem] font-bold uppercase tracking-[0.1em] px-3 py-1 rounded mb-5">Annual plan</span>
            <div class="flex items-baseline gap-1 mb-2">
              <span class="text-[1.625rem] font-bold text-ink-muted self-start mt-2">$</span>
              <span class="text-[4.5rem] font-bold text-ink leading-none tracking-[-0.04em]">49</span>
              <span class="text-[1.1rem] text-ink-faint">NZD / year</span>
            </div>
            <p class="text-[0.9rem] text-ink-faint mb-8">That's just $4.08 per month — less than a bag of clay.</p>
            <!-- BETA-TEMP: was to="/signup" · "Start 30-day free trial" -->
            <NuxtLink to="/register-interest" class="inline-flex items-center gap-2 bg-flame text-parchment px-8 py-4 rounded text-[1.05rem] font-semibold hover:bg-flame-dark transition-all hover:-translate-y-px">
              Register for free beta access
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </NuxtLink>
            <!-- BETA-TEMP: was "No credit card required to start" -->
            <p class="text-[0.825rem] text-ink-faint mt-3">Free during beta — selected testers get 12 months free.</p>
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
        <!-- BETA-TEMP: was "Start your 30-day free trial. No credit card, no commitment." -->
        <p class="text-[1.1rem] text-ink-muted mb-2">Join the private beta. Free early access, no credit card.</p>
        <!-- BETA-TEMP: was to="/signup" · "Get started free" -->
        <NuxtLink to="/register-interest" class="inline-flex items-center gap-2 bg-flame text-parchment px-8 py-4 rounded text-[1.05rem] font-semibold hover:bg-flame-dark transition-all hover:-translate-y-px">
          Register for beta access
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
          <!-- BETA-TEMP: was to="/signup" · "Sign up" -->
          <NuxtLink to="/register-interest" class="hover:text-parchment transition-colors">Join the beta</NuxtLink>
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