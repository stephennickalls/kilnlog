<!-- app/components/FiringConsole.vue -->
<!--
  Live firing console. Desktop (lg+): compact row. Below lg: tight strip.

  Cone-first ranking on the mobile pill:
    line 1  hero temp + live rate
    line 2  next cone, its rating, ETA at this rate
    line 3  target + delta chip (demoted, not removed)
    line 4  atmosphere state and next transition (only when the plan has bands)

  BRAND: the hero card is ink with a flame radial glow, so state colours use
  their LIGHT variants there; the delta chip keeps light state-pill styling.
  The desktop rate card is white, hence two rate palettes.

  UNITS: currentTemp / targetTempC are raw °C. The on-track window is ±15°C and
  stays °C; the number shown converts via displayDelta.

  Mobile: the ⋮ menu is a Teleported sheet outside the overflow-hidden pill,
  padded past the home indicator, capped in dvh. On-track renders as a bare tick
  at every mobile width (delta.iconOnly) since it has no shorter form; ahead and
  behind fall back to delta.short below 380px.
-->
<template>
  <div class="flex flex-col gap-2">

    <!-- ─────────────── Desktop (lg+) ─────────────── -->
    <div class="hidden lg:flex gap-2 items-stretch">

      <div
        class="bg-ink border border-white/10 rounded-xl flex items-center gap-5 px-5 py-2"
        style="box-shadow:0 2px 12px rgba(34,23,8,0.25); background-image: radial-gradient(ellipse at 22% 45%, rgba(184,85,28,0.35) 0%, transparent 62%)"
      >
        <button class="flex items-end gap-5 text-left" @click="$emit('open-temp')">
          <div>
            <div class="text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Current</div>
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-bold tabular-nums leading-none transition-colors" :class="currentColorClass">{{ currentDisplay ?? '—' }}</span>
              <span class="text-sm font-medium" :class="currentTemp !== null ? currentColorClass : 'text-parchment-4/50'">{{ unitLabel }}</span>
            </div>
          </div>
          <template v-if="targetTemp !== null">
            <svg class="w-4 h-4 mb-1.5 shrink-0" :class="delta ? delta.textClass : 'text-parchment-4/60'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            <div>
              <div class="text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Target</div>
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-bold tabular-nums leading-none text-parchment-4">{{ targetTemp }}</span>
                <span class="text-sm font-medium text-parchment-4/70">{{ unitLabel }}</span>
              </div>
            </div>
          </template>

          <div v-if="coneInfo" class="pl-4 border-l border-white/10">
            <div class="text-[10px] font-semibold uppercase tracking-widest text-parchment-4/70">Next cone</div>
            <div class="flex items-baseline gap-1.5">
              <svg class="w-4 h-4 self-center shrink-0 text-celadon-light" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>
              <span class="text-2xl font-bold tabular-nums leading-none text-celadon-light">{{ coneInfo.name }}</span>
              <span class="text-xs font-medium text-parchment-4/70 tabular-nums">{{ coneInfo.tempLabel }}</span>
            </div>
            <div v-if="coneInfo.eta" class="text-[11px] font-semibold text-celadon-light/90 tabular-nums">{{ coneInfo.eta }}</div>
          </div>
        </button>

        <div v-if="delta" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold shrink-0" :class="delta.class">
          <span>{{ delta.icon }}</span> {{ delta.label }}
        </div>
      </div>

      <div class="bg-white border border-parchment-3 rounded-xl px-3 py-2 flex flex-col justify-center w-36 shrink-0" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Rate act</span>
          <span class="text-base font-bold tabular-nums" :class="rateColorClass">{{ rateOfChange }}</span>
        </div>
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">tgt</span>
          <span class="text-base font-bold tabular-nums text-ink-muted">{{ targetRate }}</span>
        </div>
        <div class="flex items-center justify-between border-t border-parchment-3 mt-1 pt-1">
          <span class="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">Readings</span>
          <span class="text-base font-bold tabular-nums text-ink">{{ readingCount }}</span>
        </div>
      </div>

      <button v-if="isLive" class="w-28 shrink-0 bg-flame hover:bg-flame-dark active:bg-flame-dark text-parchment rounded-xl flex flex-col items-center justify-center gap-1 transition-colors" @click="$emit('log-reading')">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        <span class="text-xs font-bold uppercase tracking-wide">Log reading</span>
      </button>

      <!-- The filled glyph is the same mark the chart draws at each drop. -->
      <button
        v-if="isLive"
        class="w-28 shrink-0 bg-celadon hover:bg-celadon-dark active:bg-celadon-dark text-white rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
        @click="$emit('cone-drop')"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>
        <span class="text-xs font-bold uppercase tracking-wide">Cone down</span>
      </button>

      <button
        v-if="isLive"
        class="w-28 shrink-0 bg-cobalt hover:bg-cobalt-dark active:bg-cobalt-dark text-white rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
        @click="$emit('reduction')"
      >
        <span class="text-xl leading-none flex items-center gap-1.5">
          <span v-if="reductionOpen" class="w-2 h-2 rounded-full bg-white animate-pulse"/>{{ reductionOpen ? '⊟' : '⊞' }}
        </span>
        <span class="text-xs font-bold uppercase tracking-wide">{{ reductionOpen ? 'End reduction' : 'Reduction' }}</span>
      </button>

      <div class="flex-1"/>

      <div class="relative shrink-0 flex">
        <button class="bg-white border border-parchment-3 rounded-xl flex items-center justify-center w-11 text-ink-muted hover:text-ink hover:border-flame/40 transition-colors" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)" @click="menuOpen = !menuOpen">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
        </button>

        <div v-if="menuOpen" class="fixed inset-0 z-40" @click="menuOpen = false" />
        <div v-if="menuOpen" class="absolute right-0 top-full mt-2 w-52 z-50 bg-white border border-parchment-3 rounded-xl p-1.5 flex flex-col gap-0.5" style="box-shadow:0 4px 20px rgba(58,30,8,0.12)">
          <!-- No cone or reduction entries at lg+: both are standalone buttons. -->
          <button class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink hover:bg-parchment-2 transition-colors text-left" @click="emitAction('readings')">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            Edit readings
          </button>
          <button class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink hover:bg-parchment-2 transition-colors text-left" @click="emitAction('notes')">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>
            Notes
          </button>
          <button v-if="isLive && !isPaused" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-muted hover:bg-parchment-2 transition-colors text-left" @click="emitAction('recalibrate')"><span class="text-base">↻</span> Recalibrate</button>
          <button v-if="isLive && !isPaused" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-muted hover:bg-parchment-2 transition-colors text-left" @click="emitAction('pause')"><span class="text-base">⏸</span> Pause firing</button>
          <button v-if="isPaused" class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-flame hover:bg-flame-bg transition-colors text-left" @click="emitAction('resume')"><span class="text-base">▶</span> Resume firing</button>
          <div class="h-px bg-parchment-3 my-0.5 mx-2"/>
          <button class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors text-left" @click="emitAction('end')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5.64 5.64a9 9 0 1012.72 0M12 3v9"/></svg>
            End firing
          </button>
        </div>
      </div>
    </div>

    <!-- ─────────────── Compact (below lg) ─────────────── -->
    <div class="lg:hidden flex items-stretch gap-2">

      <div
        class="flex-1 min-w-0 md:max-w-[460px] bg-ink border border-white/10 rounded-2xl flex items-stretch overflow-hidden"
        style="box-shadow:0 2px 12px rgba(34,23,8,0.25); background-image: radial-gradient(ellipse at 18% 40%, rgba(184,85,28,0.35) 0%, transparent 60%)"
      >
        <button class="flex-1 min-w-0 overflow-hidden px-3.5 py-3 text-left flex flex-col justify-center gap-1" @click="$emit('open-temp')">
          <div class="flex items-baseline gap-1 min-w-0">
            <span class="text-[9px] font-semibold uppercase tracking-wide text-parchment-4/70 mr-0.5">Now</span>
            <span class="text-4xl font-bold tabular-nums leading-none transition-colors" :class="currentColorClass">{{ currentDisplay ?? '—' }}</span>
            <span class="text-sm font-medium" :class="currentTemp !== null ? currentColorClass : 'text-parchment-4/50'">{{ unitLabel }}</span>
            <span class="text-[11px] font-semibold tabular-nums ml-1.5 truncate" :class="rateColorClassDark">{{ rateShort }}</span>
          </div>

          <div v-if="coneInfo" class="flex items-center gap-1.5 min-w-0">
            <svg class="w-3 h-3 shrink-0 text-celadon-light" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>
            <span class="text-xs font-bold text-parchment-3 whitespace-nowrap">cone {{ coneInfo.name }}</span>
            <span class="text-xs text-parchment-4/80 tabular-nums whitespace-nowrap">· {{ coneInfo.tempLabel }}</span>
            <span v-if="coneInfo.eta" class="text-xs font-semibold text-celadon-light tabular-nums truncate min-w-0">· {{ coneInfo.eta }}</span>
          </div>

          <div v-if="targetTemp !== null" class="flex items-center gap-1.5 min-w-0">
            <span class="text-xs text-parchment-4/80 whitespace-nowrap truncate min-w-0">target <b class="font-bold text-parchment-3 tabular-nums">{{ targetTemp }}{{ unitLabel }}</b></span>
            <span v-if="delta" class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[11px] font-bold shrink-0 whitespace-nowrap" :class="delta.class">
              {{ delta.icon }}
              <template v-if="!delta.iconOnly">
                <span class="min-[380px]:hidden">{{ delta.short }}</span>
                <span class="hidden min-[380px]:inline">{{ delta.label }}</span>
              </template>
            </span>
            <span v-if="reductionOpen" class="inline-flex items-center gap-1 text-[11px] font-bold text-cobalt-light shrink-0"><span class="w-1.5 h-1.5 rounded-full bg-cobalt-light animate-pulse"/>Live</span>
          </div>

          <div v-if="atmosphereInfo" class="flex items-center gap-1.5 min-w-0 mt-0.5">
            <span v-if="atmosphereInfo.stateLabel" class="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide shrink-0" :class="atmosphereInfo.stateClass">{{ atmosphereInfo.stateLabel }}</span>
            <span v-if="atmosphereInfo.nextLabel" class="text-[11px] text-parchment-4/80 truncate min-w-0">{{ atmosphereInfo.nextLabel }}</span>
          </div>
        </button>

        <button v-if="isLive" class="w-[76px] shrink-0 bg-flame active:bg-flame-dark text-parchment flex flex-col items-center justify-center gap-1 transition-colors" @click="$emit('log-reading')">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          <span class="text-[10px] font-bold uppercase">Log</span>
        </button>
      </div>

      <button
        v-if="isLive && showConeButton"
        class="hidden md:flex shrink-0 w-[88px] bg-celadon active:bg-celadon-dark text-white rounded-2xl flex-col items-center justify-center gap-1 transition-colors"
        @click="$emit('cone-drop')"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>
        <span class="text-[10px] font-bold uppercase">Cone down</span>
      </button>

      <button
        v-if="isLive && showConeButton"
        class="hidden md:flex shrink-0 w-[88px] bg-cobalt active:bg-cobalt-dark text-white rounded-2xl flex-col items-center justify-center gap-1 transition-colors"
        @click="$emit('reduction')"
      >
        <span class="text-base leading-none flex items-center gap-1">
          <span v-if="reductionOpen" class="w-1.5 h-1.5 rounded-full bg-white animate-pulse"/>{{ reductionOpen ? '⊟' : '⊞' }}
        </span>
        <span class="text-[10px] font-bold uppercase">{{ reductionOpen ? 'End red.' : 'Reduce' }}</span>
      </button>

      <button class="shrink-0 w-12 bg-white border border-parchment-3 rounded-2xl flex items-center justify-center text-ink-muted active:bg-parchment-2 transition-colors" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)" @click="menuOpen = !menuOpen">
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>
      </button>
    </div>

    <Teleport to="body">
      <div v-if="menuOpen" class="lg:hidden fixed inset-0 z-[80] flex flex-col justify-end font-serif" style="background:rgba(26,18,8,0.6)" @click.self="menuOpen = false">
        <div
          class="bg-parchment rounded-t-2xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex flex-col gap-2 overflow-y-auto"
          style="max-height:85vh; max-height:min(85vh, 85dvh)"
        >
          <div class="flex justify-center pb-1"><div class="w-10 h-1 bg-parchment-3 rounded-full"/></div>
          <!-- Firing events are loud solids (celadon heat-work, cobalt
               atmosphere); utilities silent white. Cone entry hides when the
               standalone button is broken out beside the pill. -->
          <button v-if="isLive && !showConeButton" class="w-full py-3 bg-celadon active:bg-celadon-dark text-white text-sm font-bold rounded-xl transition-colors" @click="emitAction('cone-drop')">
            <svg class="w-4 h-4 inline -mt-0.5 mr-1.5" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6 h16 L12 20 Z" stroke-linejoin="round"/></svg>Cone down
          </button>
          <button v-if="isLive && !showConeButton" class="w-full py-3 bg-cobalt active:bg-cobalt-dark text-white text-sm font-bold rounded-xl transition-colors" @click="emitAction('reduction')">
            {{ reductionOpen ? '⊟ End reduction' : '⊞ Start reduction' }}
          </button>
          <button class="w-full py-3 border border-parchment-3 bg-white text-ink text-sm font-bold rounded-xl" @click="emitAction('readings')">
            <svg class="w-4 h-4 inline -mt-0.5 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>Edit readings
          </button>
          <button class="w-full py-3 border border-parchment-3 bg-white text-ink text-sm font-bold rounded-xl" @click="emitAction('notes')">
            <svg class="w-4 h-4 inline -mt-0.5 mr-1.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>Notes
          </button>
          <button v-if="isLive && !isPaused" class="w-full py-3 border border-parchment-3 bg-white text-ink-muted text-sm font-bold rounded-xl" @click="emitAction('recalibrate')">↻ Recalibrate</button>
          <button v-if="isLive && !isPaused" class="w-full py-3 border border-parchment-3 bg-white text-ink-muted text-sm font-bold rounded-xl" @click="emitAction('pause')">⏸ Pause firing</button>
          <button v-if="isPaused" class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-xl active:bg-flame-dark" @click="emitAction('resume')">▶ Resume firing</button>
          <button class="w-full py-3 border border-red-300 text-red-500 text-sm font-bold rounded-xl" @click="emitAction('end')">End firing</button>
          <button class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl mt-1" @click="menuOpen = false">Cancel</button>
        </div>
      </div>
    </Teleport>

    <div v-if="atmosphereInfo" class="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-parchment-3 text-xs">
      <span v-if="atmosphereInfo.stateLabel" class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide" :class="atmosphereInfo.stateClassLight">{{ atmosphereInfo.stateLabel }}</span>
      <span v-else class="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Neutral</span>
      <span v-if="atmosphereInfo.nextLabel" class="text-ink-muted">{{ atmosphereInfo.nextLabel }}</span>
    </div>

    <div v-if="isPaused" class="flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold">
      ⏸ Paused — resume when your kiln is firing again
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  currentTemp:    { type: Number, default: null },   // raw °C
  targetTemp:     { type: Number, default: null },   // already in display unit
  rateOfChange:   { type: String, default: '—' },
  targetRate:     { type: String, default: '—' },
  rateC:          { type: Number, default: null },   // raw °C/min
  targetRateC:    { type: Number, default: null },   // raw °C/min
  targetTempC:    { type: Number, default: null },   // raw °C
  readingCount:   { type: Number, default: 0 },
  isLive:         Boolean,
  isPaused:       Boolean,
  reductionOpen:  { type: Boolean, default: false },
  showConeButton: { type: Boolean, default: false },
  nextCone:       { type: Object, default: null },   // { name, tempC, etaMinutes|null }
  atmosphere:     { type: Object, default: null },   // { state, next }
})

const emit = defineEmits(['open-temp', 'log-reading', 'pause', 'resume', 'recalibrate', 'end', 'reduction', 'notes', 'cone-drop', 'readings'])

const { displayTemp, displayDelta, unitLabel } = useTempUnit()

const menuOpen = ref(false)
function emitAction(name) { menuOpen.value = false; emit(name) }
watch(() => [props.isLive, props.isPaused], () => { menuOpen.value = false })

const currentDisplay = computed(() =>
  props.currentTemp === null ? null : displayTemp(props.currentTemp)
)

// The ETA is an estimate against the cone's ~60C/hr rating, never authoritative
// over the witness cone, hence the "~" and "at this rate".
const coneInfo = computed(() => {
  const c = props.nextCone
  if (!c) return null
  return {
    name: c.name,
    tempLabel: `${displayTemp(c.tempC)}°`,
    eta: c.etaMinutes == null ? null : `~${c.etaMinutes} min at this rate`,
  }
})

const atmosphereInfo = computed(() => {
  const a = props.atmosphere
  if (!a) return null
  const verb = a.next?.kind === 'oxidation' ? 'oxidise' : 'reduce'
  return {
    stateLabel: a.state ? a.state.toUpperCase() : null,
    stateClass: a.state === 'oxidation' ? 'bg-amber-400/20 text-amber-300' : 'bg-cobalt/40 text-cobalt-light',
    stateClassLight: a.state === 'oxidation' ? 'bg-amber-50 text-amber-700' : 'bg-cobalt-bg text-cobalt-dark',
    nextLabel: a.next
      ? `${verb} from ${a.next.cone ? `cone ${a.next.cone} · ` : ''}${displayTemp(a.next.tempC)}°`
      : null,
  }
})

// Thresholds are °C/min; comparing two °C rates needs no conversion.
const rateColorClass = computed(() => {
  const actual = props.rateC, target = props.targetRateC
  if (actual === null) return 'text-ink-faint'
  if (target === null) return 'text-celadon'
  const diff = actual - target
  if (diff > 1.5)  return 'text-amber-600'
  if (diff < -1.5) return 'text-blue-600'
  return 'text-celadon'
})

const rateColorClassDark = computed(() => {
  const actual = props.rateC, target = props.targetRateC
  if (actual === null) return 'text-parchment-4/60'
  if (target === null) return 'text-celadon-light'
  const diff = actual - target
  if (diff > 1.5)  return 'text-amber-400'
  if (diff < -1.5) return 'text-blue-400'
  return 'text-celadon-light'
})

const rateShort = computed(() => props.rateOfChange ?? '—')

const currentColorClass = computed(() => {
  if (props.currentTemp === null) return 'text-parchment-4/50'
  if (!delta.value) return 'text-flame-light'
  return delta.value.textClass
})

// Computed in °C; the ±15 window is a °C threshold. iconOnly is read only by
// the mobile status line, where on-track renders as a bare tick.
const delta = computed(() => {
  if (props.currentTemp === null || props.targetTempC === null) return null
  const dC = Math.round(props.currentTemp - props.targetTempC)
  const absDisplay = Math.abs(displayDelta(dC))
  if (Math.abs(dC) <= 15) return { icon: '✓', label: 'On track', short: 'on track', iconOnly: true, class: 'bg-celadon-bg text-celadon-dark', textClass: 'text-celadon-light' }
  if (dC > 15) return { icon: '↑', label: `${absDisplay}° ahead`, short: `${absDisplay}°`, class: 'bg-amber-50 text-amber-700', textClass: 'text-amber-400' }
  return { icon: '↓', label: `${absDisplay}° behind`, short: `${absDisplay}°`, class: 'bg-blue-50 text-blue-700', textClass: 'text-blue-400' }
})

defineExpose({ closeMenu: () => { menuOpen.value = false } })
</script>