<!-- File: app/pages/schedules/[id].vue -->
<!--
  MOBILE (Aug 2026): brought in line with schedules/new.vue, which this page is
  a near-twin of. Same four fixes:
    - the hand-rolled header replaced with the shared AppNav
    - text-sm controls swapped for the shared .input (sub-16px controls make
      iOS Safari zoom the page in on focus and never zoom back out)
    - the curve header's flex-1 spacer, which forced label + badge + unit
      toggle + reduction button onto one line, replaced with two wrapping groups
    - grid-cols-2 type+cone stacked below 380px, and the toast lifted clear of
      the home indicator
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <AppNav
      :crumbs="[
        { label: 'Schedules', to: '/schedules' },
        { label: form.name || 'Edit schedule' },
      ]"
      container="max-w-2xl"
    >
      <template #lead>
        <!-- Phones get a back chevron instead of the full crumb trail. -->
        <NuxtLink
          to="/schedules"
          class="lg:hidden p-2 -ml-1 rounded-lg text-ink-muted active:bg-parchment-2 transition-colors shrink-0"
          aria-label="All schedules"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </NuxtLink>
      </template>
    </AppNav>

    <div v-if="loading" class="flex justify-center items-center py-24 text-ink-muted">
      <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
      </svg>
    </div>

    <main v-else class="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-safe flex flex-col gap-5 min-w-0">

      <!-- Name -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Name</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="e.g. Cone 10 reduction"
          class="input rounded-xl px-4 py-2.5 focus:border-flame focus:ring-flame/10"
        />
      </div>

      <!-- Type + Cone -->
      <!-- Side by side at 320px leaves ~140px each, which truncates every cone
           label; stacked below 380px. -->
      <div class="grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
        <FiringTypeSelect v-model="form.type" />
        <ConeSelect v-model="form.cone" />
      </div>

      <!-- Description (G10) -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Description <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
        <textarea
          v-model="form.description"
          rows="2"
          maxlength="500"
          placeholder="Notes about this schedule — when to use it, glaze pairings, quirks…"
          class="input rounded-xl px-4 py-2.5 resize-none focus:border-flame focus:ring-flame/10"
        />
      </div>

      <!-- Curve -->
      <div class="flex flex-col gap-2">
        <!-- Two groups with justify-between, so the row wraps instead of
             running off the screen. -->
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div class="flex items-center gap-2 min-w-0">
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Curve</label>
            <span v-if="form.type" class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" :class="theme.badgeText">{{ form.type }}</span>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <!-- G1: the unit toggle lives here as well as in StartFiringModal. The
                 Steps table asks for a RATE (°C/hr vs °F/hr), so someone editing a
                 schedule they pasted in Fahrenheit needs to flip back and check
                 against their source without leaving the page. -->
            <TempUnitToggle />
            <!-- Reduction planner trigger (above the curve/table) -->
            <button
              class="flex items-center gap-1.5 py-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
              @click="showReductionPlanner = true"
            >
              <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
              <!-- Short label on phones: "Edit reduction (3)" is the widest
                   string in this row. -->
              <span class="min-[380px]:hidden">{{ editReductions.length ? `Reduction (${editReductions.length})` : 'Reduction' }}</span>
              <span class="hidden min-[380px]:inline">{{ editReductions.length ? `Edit reduction (${editReductions.length})` : 'Add reduction' }}</span>
            </button>
          </div>
        </div>
        <ScheduleCurveEditor v-model="editPoints" :reductions="editReductions" :stroke="theme.stroke" :fill="theme.fill" />
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-2 pt-2 border-t border-parchment-3">
        <button
          class="flex-1 min-h-[44px] py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
          :disabled="saving || !form.name.trim()"
          @click="save"
        >{{ saving ? 'Saving…' : 'Save schedule' }}</button>
        <button
          class="flex-1 min-h-[44px] py-2.5 border border-celadon/40 bg-celadon-bg/60 text-celadon-dark hover:bg-celadon-bg text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
          :disabled="saving || !form.name.trim()"
          @click="saveAndStart"
        >Save &amp; start firing →</button>
      </div>

    </main>

    <!-- Reduction planner -->
    <ReductionPlannerModal
      :open="showReductionPlanner"
      :reductions="editReductions"
      @close="showReductionPlanner = false"
      @save="onReductionsSaved"
    />

    <Teleport to="body">
      <Transition name="toast">
        <!-- Clears the iPhone home indicator; bottom-6 alone sat on top of it. -->
        <div
          v-if="status"
          class="fixed left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold font-serif bg-celadon-dark text-white max-w-sm w-[calc(100%-2rem)] text-center"
          style="bottom: max(1.5rem, calc(env(safe-area-inset-bottom) + 0.75rem))"
        >
          {{ status }}
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
// app/pages/schedules/[id].vue
import { themeForType } from '~/composables/useScheduleTheme'

definePageMeta({ middleware: ['auth'] })

const route  = useRoute()
const router = useRouter()

const loading            = ref(true)
const saving             = ref(false)
const status             = ref('')
const form               = reactive({ name: '', type: 'bisque', cone: '', description: '' })
const editPoints         = ref([])
const editReductions     = ref([])   // [{ startTemp, endTemp|null }] °C
const showReductionPlanner = ref(false)

const id    = computed(() => Number(route.params.id))
const theme = computed(() => themeForType(form.type))

function flash(msg) {
  status.value = msg
  setTimeout(() => { if (status.value === msg) status.value = '' }, 2800)
}

function onReductionsSaved(list) {
  editReductions.value = list
  showReductionPlanner.value = false
}

watch(id, load, { immediate: true })

async function load() {
  if (isNaN(id.value) || id.value <= 0) {
    router.replace('/schedules/new')
    return
  }

  loading.value = true

  if (route.query.copyOf) {
    flash(`Editing your own copy of "${route.query.copyOf}"`)
    router.replace({ params: route.params, query: {} })
  }

  try {
    const s = await $fetch(`/api/schedules/${id.value}`)

    if (s.user_id === null) {
      const pts = (s.points ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
      const reds = (s.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null }))
      const copy = await $fetch('/api/schedules', {
        method: 'POST',
        body: { name: `${s.name} (copy)`, type: s.type ?? 'bisque', cone: s.cone ?? null, description: s.description ?? null, source: 'preset_copy', points: pts, reductions: reds },
      })
      router.replace(`/schedules/${copy.id}?copyOf=${encodeURIComponent(s.name)}`)
      return
    }

    form.name            = s.name
    form.type            = s.type ?? 'bisque'
    form.cone            = s.cone ?? ''
    form.description     = s.description ?? ''
    editPoints.value     = (s.points ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
    editReductions.value = (s.reductions ?? []).map(r => ({ startTemp: r.start_temp, endTemp: r.end_temp ?? null }))
  } catch (err) {
    flash(`Couldn't load: ${err?.data?.message ?? err.message ?? 'error'}`)
  }
  loading.value = false
}

function saveBody() {
  return {
    name: form.name.trim(),
    type: form.type,
    cone: form.cone?.trim() || null,
    description: form.description?.trim() || null,
    points: editPoints.value,
    reductions: editReductions.value,   // [{ startTemp, endTemp|null }] °C
  }
}

async function save() {
  if (!form.name.trim() || saving.value) return
  saving.value = true
  try {
    await $fetch(`/api/schedules/${id.value}`, { method: 'PUT', body: saveBody() })
    flash('Saved')
  } catch (err) {
    flash(`Couldn't save: ${err?.data?.message ?? err.message ?? 'error'}`)
  } finally {
    saving.value = false
  }
}

async function saveAndStart() {
  if (!form.name.trim() || saving.value) return
  saving.value = true
  try {
    await $fetch(`/api/schedules/${id.value}`, { method: 'PUT', body: saveBody() })
    router.push(`/app?startSchedule=${id.value}`)
  } catch (err) {
    flash(`Couldn't save: ${err?.data?.message ?? err.message ?? 'error'}`)
    saving.value = false
  }
}
</script>