<!-- File: app/pages/index.vue -->
<!--
  Marketing landing page. Celadon appears in three meaningful places:
  1. Hero chart NOW line + on-track pill — on-track/good state = celadon
  2. Cone down button — heat work lives in the celadon world (as in the app)
  3. Schedule library feature card icon
  Everything else stays warm (flame/parchment/ink). No decoration.

  MOBILE (Aug 2026): every section was px-10 — 80px of a 320px screen spent on
  padding before a single word. The pricing card added p-12 on top of that, so
  its content had 144px to live in. Padding now steps up with the viewport
  (px-5 → sm:px-8 → lg:px-10) and the same for the card and section padding.
  The clamp() minimums on the headings were also set for a desktop-first eye
  (2.75rem = 44px at 320px); each has been lowered so the hero fits without
  the browser choosing the break points for us.

  DEMO VIDEO (Aug 2026): the bridge section now carries the walkthrough. It
  sits there rather than in the hero because it answers a question the hero
  has just raised (what am I signing up for?), and because a visitor who only
  wants the pitch still gets it above that fold. See `demoVideos` in the
  script block — the selector row appears on its own once a second video is
  added, so a new walkthrough needs no markup change.

  HERO CARD (Aug 2026): rebuilt from the flyer artwork, and from the REAL
  components — FiringConsole.vue for the console surface and app.vue for the
  chart ground. Everything here is copied from the shipped app rather than
  approximated:
    - the ink card carries FiringConsole's flame radial wash, not flat ink
    - Log reading is the flame block with FiringConsole's plus icon
    - Cone down is solid celadon with the SAME filled ▽ path the console uses
      (M4 6 h16 L12 20 Z), so button and chart marker read as one concept
    - End reduction is solid cobalt with the ⊟ glyph, as when a reduction is open
    - the on-track pill is bg-celadon-bg / text-celadon-dark, the console's
      delta chip exactly
  The three buttons sit BESIDE the console bar from sm up and drop to a
  three-column grid below it on a phone, which is the same trade the real
  console makes at its own breakpoints. They are inert divs, not buttons:
  nothing here is clickable except the CTAs, and a button that ignores a press
  is worse than an obvious picture of one.

  CONE DROPS (Aug 2026): logging witness cones was the single most requested
  addition from testers, so it appears ABOVE THE FOLD four times: the
  simplicity strip names it, the console shows the CONE DOWN button, the chart
  marks the drop on the curve, and the stats row reports it. Grep "CONE DROPS".

  BETA-TEMP: during beta recruitment the page announces the beta (top BetaBanner)
  and every "Start free trial / signup" CTA points to /register-interest instead
  of /signup. Grep "BETA-TEMP" to find and revert every change:
    - <BetaBanner /> at the top of the root div (delete the line)
    - nav + hero + pricing + final CTAs: to="/register-interest" (was /signup)
      and their beta wording
    - hero kicker, pricing sub-line, hero reassurance line reworded for beta
    - pricing section: $49 figure hidden, "Pricing announced at launch" shown
      instead (original markup preserved in the comment at that spot)
  Reverting the CTAs: swap to="/register-interest" back to to="/signup" and
  restore the original button text noted in each BETA-TEMP comment.

  COPY (Aug 2026): all visitor-facing "beta" jargon replaced with plain
  "early access" / "testing" language — many potters don't know what a
  software beta is. The BETA-TEMP markers above still map every revert spot.
-->
<template>
  <div class="bg-parchment text-ink font-serif min-h-screen text-base sm:text-lg">

    <!-- BETA-TEMP: beta announcement bar (delete this line to revert) -->
    <BetaBanner />

    <!-- Nav -->
    <nav class="sticky top-0 z-50 bg-parchment/95 backdrop-blur border-b border-parchment-3">
      <div class="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 h-[60px] sm:h-[68px] flex items-center justify-between gap-3">
        <a href="/" class="text-[1.15rem] sm:text-[1.3rem] font-bold text-ink tracking-tight shrink-0">KilnMonitor</a>
        <div class="hidden md:flex items-center gap-6 lg:gap-9 text-[0.95rem] text-ink-muted">
          <a href="#features" class="hover:text-ink transition-colors">Features</a>
          <a href="#pricing" class="hover:text-ink transition-colors">Pricing</a>
          <NuxtLink to="/login" class="hover:text-ink transition-colors">Sign in</NuxtLink>
          <!-- BETA-TEMP: was to="/signup" · "Start free trial" -->
          <NuxtLink to="/early-access" class="bg-flame text-parchment px-5 py-2 rounded text-[0.875rem] font-semibold hover:bg-flame-dark transition-colors whitespace-nowrap">Get early access</NuxtLink>
        </div>
        <button class="md:hidden flex flex-col gap-[5px] p-2 -mr-2 shrink-0" aria-label="Menu" @click="mobileMenu = !mobileMenu">
          <span class="block w-6 h-[1.5px] bg-ink rounded"/>
          <span class="block w-6 h-[1.5px] bg-ink rounded"/>
          <span class="block w-6 h-[1.5px] bg-ink rounded"/>
        </button>
      </div>
      <div v-if="mobileMenu" class="md:hidden flex flex-col bg-parchment border-t border-parchment-3">
        <a href="#features" class="px-5 sm:px-8 py-3.5 text-ink-muted border-b border-parchment-3" @click="mobileMenu = false">Features</a>
        <a href="#pricing" class="px-5 sm:px-8 py-3.5 text-ink-muted border-b border-parchment-3" @click="mobileMenu = false">Pricing</a>
        <NuxtLink to="/login" class="px-5 sm:px-8 py-3.5 text-ink-muted border-b border-parchment-3" @click="mobileMenu = false">Sign in</NuxtLink>
        <!-- BETA-TEMP: was to="/signup" · "Start free trial →" -->
        <NuxtLink to="/early-access" class="px-5 sm:px-8 py-3.5 text-flame font-semibold" @click="mobileMenu = false">Get early access →</NuxtLink>
      </div>
    </nav>

    <!-- Hero -->
    <section class="px-5 sm:px-8 lg:px-10 pt-12 sm:pt-16 lg:pt-20 pb-12 sm:pb-16 bg-parchment" style="background-image: radial-gradient(ellipse at 80% 20%, rgba(176,92,26,0.06) 0%, transparent 55%)">
      <div class="max-w-[1200px] mx-auto">

        <!-- Top copy -->
        <div class="max-w-[680px] mb-10 sm:mb-14">
          <!-- BETA-TEMP: was "Kiln firing log &amp; chart" -->
          <p class="text-flame font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">Early access now open</p>
          <!-- clamp min was 2.75rem — at 320px that put "Your firing" at the
               very edge of the line box. 2.25rem leaves the intended break. -->
          <h1 class="text-[clamp(2.25rem,5vw,4.25rem)] font-bold text-ink leading-[1.07] tracking-tight mb-6">Your firing notebook,<br>finally digital.</h1>
          <p class="text-[1rem] sm:text-[1.1rem] text-ink-muted leading-[1.7] mb-7">Sometimes a firing comes out better than you planned — a glaze breaks just right, a reduction sings. Could you do it again? KilnMonitor records the whole curve as it happens, so the firing you want to repeat is one you actually can.</p>

          <!-- Simplicity strip -->
          <div class="flex items-start sm:items-center gap-3 sm:gap-4 bg-parchment-2 border-[1.5px] border-parchment-4 rounded-lg px-4 sm:px-5 py-3.5 mb-8 max-w-[800px]">
            <div class="w-9 h-9 bg-white border border-parchment-3 rounded-md flex items-center justify-center shrink-0">
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M8 1L3 8h5l-2 5 6-7H7L8 1z" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-[0.9rem] font-bold text-ink mb-0.5">No hardware. No setup. No fuss.</p>
              <!-- CONE DROPS: named here so the feature is above the fold in
                   words as well as on the chart below. -->
              <p class="text-[0.8rem] text-ink-muted leading-snug">Draw a curve, log temperatures and cone drops as you fire — right from the phone in your apron pocket.</p>
            </div>
          </div>

          <div class="flex gap-3 sm:gap-4 items-center flex-wrap mb-4">
            <!-- BETA-TEMP: was to="/signup" · "Start free trial" -->
            <NuxtLink to="/early-access" class="inline-flex items-center gap-2 bg-flame text-parchment px-5 sm:px-6 py-3 rounded text-[0.95rem] sm:text-[1rem] font-semibold hover:bg-flame-dark transition-all hover:-translate-y-px">
              Get free early access
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="shrink-0"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </NuxtLink>
            <NuxtLink to="/login" class="inline-flex items-center px-5 sm:px-6 py-3 border-[1.5px] border-parchment-3 rounded text-[0.95rem] sm:text-[1rem] text-ink-muted hover:border-flame-light hover:text-ink transition-colors">Sign in</NuxtLink>
          </div>
          <!-- BETA-TEMP: was "30 days free · No credit card required · $49 NZD/year after" -->
          <p class="text-[0.825rem] text-ink-faint">Help us build the app potters actually need — free for our first testers</p>
        </div>

        <!-- Chart + fire cards grid.
             LAYOUT (Aug 2026): the split used to happen at md, where the cards
             column was only ~250px wide — every paragraph became a tall narrow
             ribbon, and because grid rows stretch, the chart card was padded
             out with dead white space to match that height.

             It now waits for xl. lg was still too early: at 1024px the cards
             column works out around 380px before its own 26px of padding, so
             the three paragraphs were still running eight or nine words a
             line while the chart card sat there tall beside them. From md to
             xl the chart takes the full width and the cards run three across
             underneath it, which is the shape that actually reads at those
             sizes. items-start stops the shorter column being stretched to
             the taller one at any width. -->
        <div class="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 sm:gap-6 items-start">

          <!-- Chart card — the flyer artwork, rebuilt from the real components.
               See the HERO CARD note at the top of this file for what is copied
               from where.

               CHART STORY: 6 hours into a Cone 10 reduction glaze firing. The
               ACTUAL orange line runs start → NOW and stops there, because that
               is all that has happened. The PLANNED grey dashed line continues
               past NOW: up to the 1,287° peak, a hold, then the cool-down.
               Cone 010 went over at 900° on the climb, and body reduction has
               been running since 1,010°.

               COORDINATES: one space, viewBox 480×220, 11 hours wide so the
               planned cool-down has somewhere to go.
                 x = 46 + h·38.2      (0h=46, 4h=199, 8h=352, 11h=466)
                 y = 182 − t·0.10615  (0°C=182, 1,287°C=45)
               NOW is 6h (x275) at 1,214°C (y53).

               There is NO separate target dot at NOW: 1,214° and 1,221° are
               0.7px apart at this scale, so two dots would render as one blob.
               The flyer solves it the same way — one orange marker, both
               numbers as text beside it.

               TYPE SIZE: the SVG scales with the card, so a 10px label that
               reads fine on a 700px card renders at ~6px on a 320px phone.
               The .chart-* classes in the scoped style block below carry a
               larger size by default and dial back at sm. Nothing here uses a
               font-size attribute, because CSS would override it anyway. -->
          <div class="bg-white border border-parchment-3 rounded-[14px] p-4 sm:p-6 lg:p-7 shadow-[0_8px_40px_rgba(58,30,8,0.09),0_2px_8px_rgba(58,30,8,0.05)]">
            <div class="flex justify-between items-center gap-2 mb-3">
              <span class="text-[0.875rem] font-semibold text-ink-2 truncate min-w-0">Cone 10 Reduction</span>
              <span class="flex items-center gap-[5px] bg-celadon-bg border border-celadon/30 rounded-full px-[10px] py-[3px] text-[0.75rem] font-bold text-celadon-dark shrink-0">
                <span class="w-[6px] h-[6px] bg-celadon rounded-full animate-pulse"/>
                Active
              </span>
            </div>

            <!-- Console row: bar + actions. Beside each other from sm up (as in
                 the flyer and the real lg console); the actions drop to a
                 three-across grid under the bar on a phone. -->
            <div class="flex flex-col sm:flex-row items-stretch gap-2 mb-4">

              <!-- Ink + flame glow: FiringConsole's one persistent brand surface -->
              <div
                class="flex-1 min-w-0 bg-ink border border-white/10 rounded-xl flex items-center gap-3 sm:gap-4 px-4 py-3"
                style="box-shadow:0 2px 12px rgba(34,23,8,0.25); background-image: radial-gradient(ellipse at 22% 45%, rgba(184,85,28,0.35) 0%, transparent 62%)"
              >
                <div class="flex items-end gap-3 sm:gap-4 min-w-0">
                  <div class="min-w-0">
                    <div class="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Current</div>
                    <div class="flex items-baseline gap-1">
                      <span class="text-[1.6rem] sm:text-[2rem] font-bold tabular-nums leading-none text-parchment">1,214</span>
                      <span class="text-[0.7rem] sm:text-[0.8rem] font-medium text-parchment-4/70">°C</span>
                    </div>
                  </div>
                  <svg class="w-4 h-4 mb-1.5 shrink-0 text-parchment-4/60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
                  <div class="min-w-0">
                    <div class="text-[9px] sm:text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Target</div>
                    <div class="flex items-baseline gap-1">
                      <span class="text-[1.6rem] sm:text-[2rem] font-bold tabular-nums leading-none text-parchment-4">1,221</span>
                      <span class="text-[0.7rem] sm:text-[0.8rem] font-medium text-parchment-4/70">°C</span>
                    </div>
                  </div>
                </div>

                <!-- The console's delta chip, on track -->
                <div class="ml-auto shrink-0 inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-[0.8rem] sm:text-sm font-bold bg-celadon-bg text-celadon-dark">
                  <span>✓</span> On track
                </div>
              </div>

              <!-- Actions. Inert by design (see HERO CARD note).
                   CONE DROPS: the middle one is why this row is here at all. -->
              <div class="grid grid-cols-3 sm:flex gap-2 shrink-0">
                <div class="sm:w-[84px] lg:w-24 bg-flame text-parchment rounded-xl flex flex-col items-center justify-center gap-1 py-2.5 sm:py-0">
                  <svg class="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                  <span class="text-[9px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wide text-center leading-tight">Log reading</span>
                </div>
                <div class="sm:w-[84px] lg:w-24 bg-celadon text-white rounded-xl flex flex-col items-center justify-center gap-1 py-2.5 sm:py-0">
                  <svg class="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>
                  <span class="text-[9px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wide text-center leading-tight">Cone down</span>
                </div>
                <div class="sm:w-[84px] lg:w-24 bg-cobalt text-white rounded-xl flex flex-col items-center justify-center gap-1 py-2.5 sm:py-0">
                  <span class="text-base sm:text-xl leading-none flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>⊟
                  </span>
                  <span class="text-[9px] sm:text-[10px] lg:text-xs font-bold uppercase tracking-wide text-center leading-tight">End reduction</span>
                </div>
              </div>
            </div>

            <!-- Graph-paper ground behind the plot (as in app.vue) -->
            <div class="w-full rounded-lg overflow-hidden mb-4" style="background: linear-gradient(to right, rgba(95,138,120,0.06) 1px, transparent 1px) 0 0 / 12.5% 100%, linear-gradient(to bottom, rgba(95,138,120,0.06) 1px, transparent 1px) 0 0 / 100% 25%, #fcfdfc;">
              <svg class="w-full block" viewBox="0 0 480 220" fill="none">

                <!-- Legend — Chart.js point style, planned then actual -->
                <circle cx="196" cy="14" r="4" fill="#a8a29e"/>
                <text x="206" y="18" class="chart-legend">Planned</text>
                <circle cx="278" cy="14" r="4" fill="#f97316"/>
                <text x="288" y="18" class="chart-legend">Actual</text>

                <!-- y-axis -->
                <text x="2" y="185" class="chart-axis">0°</text>
                <text x="2" y="132" class="chart-axis">500°</text>
                <text x="2" y="79" class="chart-axis">1000°</text>

                <!-- Reduction band: open/live, from 1,010°C at 4h to NOW.
                     rgba matches reductionBandsPlugin (cobalt). -->
                <rect x="199" y="40" width="76" height="142" fill="rgba(58,90,120,0.10)"/>
                <line x1="199" y1="40" x2="199" y2="182" stroke="rgba(58,90,120,0.5)" stroke-width="1" stroke-dasharray="4 4"/>
                <text x="203" y="176" class="chart-note" fill="rgba(40,64,87,0.85)">Reduction</text>

                <!-- Planned — warm grey #a8a29e dashed [6,4], NOW onward:
                     climb to the 1,287° peak, hold, then cool. -->
                <polyline points="275,53 321,46 352,45 390,60 424,81 466,108" stroke="#a8a29e" stroke-width="2" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <circle cx="321" cy="46" r="3.5" fill="#a8a29e"/>
                <circle cx="352" cy="45" r="3.5" fill="#a8a29e"/>
                <circle cx="390" cy="60" r="3.5" fill="#a8a29e"/>
                <circle cx="424" cy="81" r="3.5" fill="#a8a29e"/>
                <circle cx="466" cy="108" r="3.5" fill="#a8a29e"/>

                <!-- Actual — orange #f97316 solid with the soft orange fill.
                     Start → NOW and no further: that is all that has happened. -->
                <path d="M46,180 L84,166 L122,123 L161,86 L199,75 L229,74 L256,60 L275,53 L275,182 L46,182 Z" fill="rgba(249,115,22,0.08)"/>
                <polyline points="46,180 84,166 122,123 161,86 199,75 229,74 256,60 275,53" stroke="#f97316" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
                <circle cx="84" cy="166" r="3" fill="#f97316"/>
                <circle cx="122" cy="123" r="3" fill="#f97316"/>
                <circle cx="199" cy="75" r="3" fill="#f97316"/>
                <circle cx="256" cy="60" r="3" fill="#f97316"/>

                <!-- CONE DROPS: cone 010 over at 900°C on the climb. The glyph
                     is the console's filled ▽, apex resting on the curve, so
                     the mark and the CONE DOWN button above are one idea. -->
                <g transform="translate(161,80)">
                  <path d="M-5.5,-5 h11 L0,6 Z" fill="#3a2a18" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>
                </g>
                <text x="120" y="103" class="chart-note" fill="rgba(58,42,24,0.85)">cone 010</text>

                <!-- NOW line — celadon (nowLinePlugin) -->
                <line x1="275" y1="40" x2="275" y2="182" stroke="rgba(95,138,120,0.9)" stroke-width="1.5"/>
                <rect x="256" y="24" width="38" height="16" rx="2" fill="rgba(95,138,120,0.95)"/>
                <text x="275" y="36" text-anchor="middle" class="chart-badge">NOW</text>

                <!-- Latest reading, and both numbers as text (see the note about
                     the 0.7px gap in the card comment above) -->
                <circle cx="275" cy="53" r="5" fill="#f97316" stroke="#fff" stroke-width="2"/>
                <text x="284" y="50" class="chart-note" fill="#c2410c">1,214°</text>
                <text x="284" y="63" class="chart-note" fill="rgba(58,90,72,0.95)">target 1,221°</text>

                <!-- x-axis -->
                <text x="46" y="203" class="chart-axis">0h</text>
                <text x="199" y="203" text-anchor="middle" class="chart-axis">4h</text>
                <text x="352" y="203" text-anchor="middle" class="chart-axis">8h</text>
              </svg>
            </div>

            <!-- CONE DROPS: four stats, so the last cone down is a number and
                 not only a mark. Two columns on a phone — four across a 320px
                 card squeezed every value to a couple of characters. -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 gap-y-3 border-t border-parchment-2 pt-4">
              <div class="flex flex-col gap-[3px] min-w-0">
                <span class="text-[0.95rem] sm:text-[1.05rem] font-bold text-ink tracking-tight">1,287°C</span>
                <span class="text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint leading-tight">Peak target</span>
              </div>
              <div class="flex flex-col gap-[3px] min-w-0">
                <span class="text-[0.95rem] sm:text-[1.05rem] font-bold text-ink tracking-tight">6h 02m</span>
                <span class="text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint leading-tight">Elapsed</span>
              </div>
              <div class="flex flex-col gap-[3px] min-w-0">
                <span class="text-[0.95rem] sm:text-[1.05rem] font-bold text-ink tracking-tight">010 <span class="text-ink-faint font-semibold">@ 900°</span></span>
                <span class="text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint leading-tight">Last cone down</span>
              </div>
              <div class="flex flex-col gap-[3px] min-w-0">
                <span class="text-[0.95rem] sm:text-[1.05rem] font-bold text-ink tracking-tight">+1<span class="text-ink-faint font-semibold">/+2</span></span>
                <span class="text-[0.65rem] sm:text-[0.7rem] uppercase tracking-[0.08em] text-ink-faint leading-tight">Rate °C/min · act/tgt</span>
              </div>
            </div>
          </div>

          <!-- Feature story cards — each maps to a real, shipped feature.
               Order: logging (the daily act, and what the console above shows)
               first, then the product's soul (the founder's gas-out story →
               Save as schedule) in the middle, then planned + live reduction
               bands (G11). The middle card is the flame-bg hero.

               md through xl sits the three in a row beneath the full-width
               chart; xl puts them back in a column beside it. -->
          <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-1 gap-3">
            <div class="bg-parchment-2 border border-parchment-4 rounded-[10px] px-5 sm:px-[1.625rem] py-5 sm:py-6 flex flex-col gap-2">
              <!-- CONE DROPS: the story card, replacing the NOW-line/recalibrate
                   card that used to sit here. -->
              <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame">Temperatures and cones, one tap each</p>
               <p class="text-[0.9rem] text-ink-muted leading-relaxed">Log temperatures from your pyrometer reading. Log the moment cones drop — it lands on the chart with the time and the temperature it fell at. Log temp and heat work, recorded side by side.</p>
            </div>
            <div class="bg-flame-bg border border-parchment-4 rounded-[10px] px-5 sm:px-[1.625rem] py-5 sm:py-6 flex flex-col gap-2">
              <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame">Repeat the happy accident</p>
              <p class="text-[0.9rem] text-ink-muted leading-relaxed">Ran out of gas mid-firing, had to jump in the car for more to carry on — and the glaze came out singing? The whole firing was logged, gas-out and all. Save what <em>actually happened</em> as a schedule and repeat the firing that worked, not the plan that didn't.</p>
            </div>
            <div class="bg-parchment-2 border border-parchment-4 rounded-[10px] px-5 sm:px-[1.625rem] py-5 sm:py-6 flex flex-col gap-2">
              <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame">Reduction, planned &amp; real</p>
              <p class="text-[0.9rem] text-ink-muted leading-relaxed">Mark where you intend to reduce on your schedule, then log the real thing live at the kiln. The chart shows both — so you learn how your intentions and your atmosphere actually line up.</p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- Bridge — dark section, carrying the demo video.
         Copy left, video right on lg+; stacked below that with the VIDEO
         FIRST, because on a phone the video is the faster read and the copy
         beside it is a repeat of ground the hero already covered.

         The selector row under the player hides itself while there is only
         one video in `demoVideos`. -->
    <section class="bg-ink px-5 sm:px-8 lg:px-10 py-14 sm:py-20" style="background-image: radial-gradient(ellipse at 20% 50%, rgba(176,92,26,0.14) 0%, transparent 60%)">
      <div class="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-10 lg:gap-14 items-center">

        <div class="order-2 lg:order-1 min-w-0">
          <p class="text-flame-light font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">Built for the studio</p>
          <h2 class="text-[clamp(1.875rem,4vw,3.25rem)] font-bold text-parchment leading-[1.12] tracking-tight mb-5">Plan it.<br>Log it.<br>Learn from it.</h2>
          <p class="text-[1rem] sm:text-[1.05rem] text-ink-muted leading-[1.7] max-w-[560px] mb-6">Sketch your firing curve, tap in temperatures and cone drops as you go, and watch your kiln track against the plan. Every firing saved forever — so you can repeat your wins and stop repeating your mistakes.</p>
          <p class="text-[0.9rem] text-parchment/70 leading-relaxed max-w-[560px]">{{ activeVideo.blurb }}</p>
        </div>

        <div class="order-1 lg:order-2 min-w-0">
          <VideoEmbed
            :video-id="activeVideo.id"
            :poster="activeVideo.poster"
            :title="activeVideo.title"
            :duration="activeVideo.duration"
          />

          <!-- One video: nothing to choose between, so no selector. -->
          <div v-if="demoVideos.length > 1" class="flex flex-wrap gap-2 mt-3">
            <button
              v-for="v in demoVideos"
              :key="v.id"
              class="px-3.5 py-2 rounded text-[0.825rem] font-semibold border transition-colors text-left"
              :class="v.id === activeVideo.id
                ? 'bg-flame text-parchment border-flame'
                : 'bg-transparent text-parchment/70 border-white/15 hover:border-white/35 hover:text-parchment'"
              @click="activeVideoId = v.id"
            >
              {{ v.title }}
              <span class="opacity-60 tabular-nums ml-1">{{ v.duration }}</span>
            </button>
          </div>
        </div>

      </div>
    </section>

    <!-- Features -->
    <section id="features" class="bg-parchment-2 border-y border-parchment-3 px-5 sm:px-8 lg:px-10 py-16 sm:py-20 lg:py-24">
      <div class="max-w-[1200px] mx-auto">
        <p class="text-flame font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">What you get</p>
        <h2 class="text-[clamp(1.75rem,3.5vw,2.875rem)] font-bold text-ink leading-[1.15] tracking-tight mb-8 sm:mb-14">Everything you need.<br>Nothing you don't.</h2>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-px bg-parchment-3 border border-parchment-3 rounded-[10px] overflow-hidden">

          <div class="md:col-span-2 bg-flame-bg p-6 sm:p-8 flex flex-col gap-[0.875rem]">
            <div class="w-11 h-11 bg-flame/10 rounded-lg flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M3 17l4-4 3 3 4-5 5 6" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 5h16" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round"/></svg>
            </div>
            <h3 class="text-[1.05rem] font-bold text-ink tracking-tight">Planned vs actual, live</h3>
            <p class="text-[0.925rem] text-ink-muted leading-[1.65]">Draw your target curve, then watch your real readings track against it as the firing climbs. See at a glance whether you're ahead, behind, or right on the line — and adjust while it still matters.</p>
          </div>

          <div class="bg-parchment p-6 sm:p-8 flex flex-col gap-[0.875rem]">
            <div class="w-11 h-11 bg-flame/10 rounded-lg flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M4 6h14M4 10h14M4 14h8" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round"/><circle cx="17" cy="16" r="3" stroke="#b05c1a" stroke-width="1.25"/><path d="M17 14.5v1.5l1 1" stroke="#b05c1a" stroke-width="1" stroke-linecap="round"/></svg>
            </div>
            <h3 class="text-[1.05rem] font-bold text-ink tracking-tight">Log temperatures and cones</h3>
             <p class="text-[0.9rem] text-ink-muted leading-relaxed">Log temperatures from your pyrometer reading. Log the moment cones drop — it lands on the chart with the time and the temperature it fell at. Log temp and heat work, recorded side by side.</p>
          </div>

          <!-- Schedule library — celadon icon (this is the celadon/schedule world) -->
          <div class="bg-parchment p-6 sm:p-8 flex flex-col gap-[0.875rem]">
            <div class="w-11 h-11 bg-celadon-bg rounded-lg flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><rect x="3" y="3" width="16" height="16" rx="2" stroke="#5f8a78" stroke-width="1.25"/><path d="M7 8h8M7 12h5" stroke="#5f8a78" stroke-width="1.25" stroke-linecap="round"/><path d="M14 15l2-2 2 2" stroke="#5f8a78" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <h3 class="text-[1.05rem] font-bold text-ink tracking-tight">Schedule library</h3>
            <p class="text-[0.925rem] text-ink-muted leading-[1.65]">Start from a built-in bisque or glaze curve, or save your own and reuse it. No re-drawing the same firing twice.</p>
          </div>

          <div class="bg-parchment p-6 sm:p-8 flex flex-col gap-[0.875rem]">
            <div class="w-11 h-11 bg-flame/10 rounded-lg flex items-center justify-center shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none"><path d="M11 2C6.03 2 2 6.03 2 11s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z" stroke="#b05c1a" stroke-width="1.25"/><path d="M11 6v5l3 3" stroke="#b05c1a" stroke-width="1.25" stroke-linecap="round"/></svg>
            </div>
            <h3 class="text-[1.05rem] font-bold text-ink tracking-tight">Full firing history</h3>
            <p class="text-[0.925rem] text-ink-muted leading-[1.65]">Every firing saved with its curve, notes, and stats. Compare past firings to understand what changed — and why one came out better.</p>
          </div>

          <div class="bg-ink p-6 sm:p-8 flex flex-col justify-center gap-[0.625rem]">
            <p class="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-flame-light">Firing insight</p>
            <div class="text-[2.25rem] sm:text-[2.75rem] font-bold text-parchment leading-none tracking-[-0.04em]">1,280<span class="text-[1.125rem] sm:text-[1.375rem] text-flame-light">°C</span></div>
            <p class="text-[0.825rem] text-ink-muted leading-[1.5]">Peak temperature — Cone 10 reduction<br>Duration 8h 40m · 142 readings logged</p>
          </div>

        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="bg-parchment px-5 sm:px-8 lg:px-10 py-16 sm:py-20 lg:py-24">
      <div class="max-w-[1200px] mx-auto">
        <p class="text-flame font-semibold tracking-[0.16em] uppercase text-[0.72rem] mb-4">Simple pricing</p>
        <h2 class="text-[clamp(1.75rem,3.5vw,2.875rem)] font-bold text-ink leading-[1.15] tracking-tight mb-8 sm:mb-14">One plan.<br>Everything included.</h2>

        <!-- p-12 on top of the section's px-10 left 144px of content at 320px. -->
        <div class="bg-white border border-parchment-3 rounded-[14px] p-6 sm:p-8 lg:p-12 shadow-[0_4px_24px_rgba(58,30,8,0.07)] grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-8 lg:gap-14 items-start">
          <div class="min-w-0">
            <span class="inline-block bg-flame-bg border border-flame-light text-flame text-[0.75rem] font-bold uppercase tracking-[0.1em] px-3 py-1 rounded mb-5">Annual plan</span>

            <!-- BETA-TEMP: price hidden during beta. Was —
              <div class="flex items-baseline gap-1 mb-2">
                <span class="text-[1.625rem] font-bold text-ink-muted self-start mt-2">$</span>
                <span class="text-[4.5rem] font-bold text-ink leading-none tracking-[-0.04em]">49</span>
                <span class="text-[1.1rem] text-ink-faint">NZD / year</span>
              </div>
              <p class="text-[0.9rem] text-ink-faint mb-8">That's just $4.08 per month.</p>
            -->
            <div class="mb-2">
              <span class="text-[1.75rem] sm:text-[2.5rem] font-bold text-ink leading-tight tracking-tight">Pricing not yet available</span>
            </div>
            <p class="text-[0.9rem] text-ink-faint mb-8">One simple annual plan — priced for potters, not enterprises. Early testers get 12 months free.</p>

            <!-- BETA-TEMP: was to="/signup" · "Start 30-day free trial" -->
            <NuxtLink to="/early-access" class="inline-flex items-center justify-center gap-2 bg-flame text-parchment px-5 sm:px-8 py-3.5 sm:py-4 rounded text-[0.95rem] sm:text-[1.05rem] font-semibold hover:bg-flame-dark transition-all hover:-translate-y-px">
              Sign up for free early access
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="shrink-0"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </NuxtLink>
            <!-- BETA-TEMP: was "No credit card required to start" -->
            <p class="text-[0.825rem] text-ink-faint mt-3">Free while we're testing — no credit card, ever, until launch.</p>
          </div>

          <div class="hidden md:block w-px bg-parchment-3 self-stretch"/>

          <div class="min-w-0">
            <p class="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-ink-faint mb-4">Everything included:</p>
            <ul class="flex flex-col gap-3 list-none p-0">
              <li v-for="item in pricingItems" :key="item" class="flex items-center gap-3 text-[0.9rem] sm:text-[0.975rem] text-ink-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="shrink-0"><path d="M2 7l3.5 3.5L12 3.5" stroke="#b05c1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {{ item }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- Final CTA -->
    <section class="bg-ink px-5 sm:px-8 lg:px-10 py-16 sm:py-20 lg:py-24" style="background-image: radial-gradient(ellipse at 30% 50%, rgba(176,92,26,0.15) 0%, transparent 60%)">
      <div class="max-w-[1200px] mx-auto text-center flex flex-col items-center gap-4">
        <h2 class="text-[clamp(1.75rem,3.5vw,2.875rem)] font-bold text-parchment leading-[1.2] tracking-tight">Never lose good firing data again.</h2>
        <!-- BETA-TEMP: was "Start your 30-day free trial. No credit card, no commitment." -->
        <p class="text-[1rem] sm:text-[1.1rem] text-ink-muted mb-2">Help us build the kiln app you need — free early access, no credit card.</p>
        <!-- BETA-TEMP: was to="/signup" · "Get started free" -->
        <NuxtLink to="/early-access" class="inline-flex items-center justify-center gap-2 bg-flame text-parchment px-5 sm:px-8 py-3.5 sm:py-4 rounded text-[0.95rem] sm:text-[1.05rem] font-semibold hover:bg-flame-dark transition-all hover:-translate-y-px">
          Sign up for early access
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" class="shrink-0"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </NuxtLink>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-ink border-t border-white/[0.08] px-5 sm:px-8 lg:px-10 py-7 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
      <div class="max-w-[1200px] mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        <span class="text-[0.95rem] font-bold text-parchment">KilnMonitor</span>
        <span class="text-[0.8rem] sm:text-[0.825rem] text-ink-muted">&copy; {{ new Date().getFullYear() }} KilnMonitor. Made by a potter, for potters.</span>
        <div class="flex gap-5 sm:gap-7 text-[0.825rem] text-ink-muted flex-wrap">
          <NuxtLink to="/login" class="hover:text-parchment transition-colors">Sign in</NuxtLink>
          <!-- BETA-TEMP: was <NuxtLink to="/signup">Sign up</NuxtLink> — public
               signup is closed during beta. Restore when going live. -->
          <NuxtLink to="/early-access" class="hover:text-parchment transition-colors">Early access</NuxtLink>
          <NuxtLink to="/privacy" class="hover:text-parchment transition-colors">Privacy</NuxtLink>
          <NuxtLink to="/terms" class="hover:text-parchment transition-colors">Terms</NuxtLink>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup>
// app/pages/index.vue
definePageMeta({ layout: false, middleware: [] })
const mobileMenu = ref(false)
const pricingItems = [
  'Unlimited kiln firings',
  'Planned vs actual chart',
  'Tap-to-log temp readings and cone drops',
  'Full firing history',
  'Schedule library',
  'Works on phone & desktop',
]

// DEMO VIDEOS (Aug 2026)
// `id` is the YouTube video id: the part after youtu.be/ or v=, with any ?si=
// share-tracking suffix stripped. `poster` is a file in public/ — the video is
// not loaded at all until someone presses play (see VideoEmbed.vue), so the
// poster is what every visitor actually pays for.
//
// Add the curve-building walkthrough as a second entry when it is recorded.
// The selector row under the player appears by itself once this array has
// more than one item; no markup change needed.
//
// The video must be Public or Unlisted on YouTube. Private videos refuse to
// play in an embed, and the failure looks like a broken player.
const demoVideos = [
  {
    id:       'GPC4HaF41gg',
    title:    'Getting started',
    duration: '3:25',
    poster:   '/video-poster-getting-started.png',
    blurb:    'Watch the whole setup: pick a firing type, load a preset or draw your own curve, plan a reduction, then start logging at the kiln.',
  },
]

const activeVideoId = ref(demoVideos[0].id)
const activeVideo = computed(() =>
  demoVideos.find(v => v.id === activeVideoId.value) ?? demoVideos[0],
)
</script>

<style scoped>
/* HERO CHART TYPE (Aug 2026)
   These sizes are in SVG user units, so they scale with the card. A 10px label
   is right on a 700px-wide card and unreadable on a 320px phone, where the
   viewBox renders at roughly 0.6 scale — hence the larger default and the
   step down at sm. Set here rather than as font-size attributes because CSS
   overrides presentation attributes anyway, and one place beats twenty. */
.chart-axis   { font-family: Georgia, serif; fill: #a8a29e; font-size: 13px; }
.chart-legend { font-family: Georgia, serif; fill: #57534e; font-size: 13px; }
.chart-note   { font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 700; font-size: 12px; }
.chart-badge  { font-family: ui-sans-serif, system-ui, sans-serif; font-weight: 700; font-size: 12px; fill: #fff; }

@media (min-width: 640px) {
  .chart-axis,
  .chart-legend { font-size: 10px; }
  .chart-note,
  .chart-badge  { font-size: 9.5px; }
}
</style>