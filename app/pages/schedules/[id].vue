<!-- app/pages/schedules/[id].vue -->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <header class="sticky top-0 z-20 bg-parchment/95 backdrop-blur border-b border-parchment-3">
      <div class="max-w-2xl mx-auto flex items-center gap-2 px-4 sm:px-6 py-3">
        <NuxtLink to="/schedules" class="p-1.5 -ml-1 rounded-lg text-ink-muted hover:text-flame hover:bg-parchment-2 transition-colors shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
        </NuxtLink>
        <h1 class="flex-1 text-base font-bold text-ink truncate">{{ form.name || 'Edit schedule' }}</h1>
      </div>
    </header>

    <div v-if="loading" class="flex justify-center items-center py-24 text-ink-muted">
      <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
        <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
      </svg>
    </div>

    <main v-else class="max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">

      <!-- Name -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Name</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="e.g. Cone 10 reduction"
          class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
        />
      </div>

      <!-- Type + Cone -->
      <div class="grid grid-cols-2 gap-3">
        <FiringTypeSelect v-model="form.type" />
        <ConeSelect v-model="form.cone" />
      </div>

      <!-- Curve -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Curve</label>
          <span v-if="form.type" class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="theme.badgeText">{{ form.type }}</span>
          <div class="flex-1" />
          <!-- G11: plan reduction periods -->
          <button
            class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-[11px] font-bold transition-colors"
            @click="showReductionModal = true"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Reduction{{ editReductions.length ? ` (${editReductions.length})` : '' }}
          </button>
          <!-- G1: unit toggle right where temps are entered -->
          <TempUnitToggle />
        </div>
        <ScheduleCurveEditor v-model="editPoints" :reductions="editReductions" :stroke="theme.stroke" :fill="theme.fill" />
      </div>

      <!-- G11: reduction planner -->
      <ReductionPlannerModal
        :open="showReductionModal"
        :reductions="editReductions"
        @close="showReductionModal = false"
        @save="onReductionsSaved"
      />

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-2 pt-2 border-t border-parchment-3">
        <button
          class="flex-1 py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
          :disabled="saving || !form.name.trim()"
          @click="save"
        >{{ saving ? 'Saving…' : 'Save schedule' }}</button>
        <button
          class="flex-1 py-2.5 border border-celadon/40 bg-celadon-bg/60 text-celadon-dark hover:bg-celadon-bg text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="saving || !form.name.trim() || !!activeFiring"
          :title="activeFiring ? 'A firing is already active — only one at a time' : ''"
          @click="saveAndStart"
        >Save &amp; start firing →</button>
      </div>

      <!-- G5: explain the disabled Save & start -->
      <NuxtLink
        v-if="activeFiring"
        to="/app"
        class="flex items-center gap-2 px-3 py-2 -mt-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs hover:bg-amber-100 transition-colors"
      >
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        <span><strong>{{ activeFiring.name }}</strong> is still firing — end it before starting another. You can still save this schedule.</span>
      </NuxtLink>

    </main>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="status" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold font-serif bg-celadon-dark text-white max-w-sm w-[calc(100%-2rem)] text-center">
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

// G5: know whether a firing is active so "Save & start" can be disabled.
const { activeFiring, loadActiveFiring } = useActiveFiring()
onMounted(loadActiveFiring)

const loading    = ref(true)
const saving     = ref(false)
const status     = ref('')
const form       = reactive({ name: '', type: 'bisque', cone: '' })
const editPoints = ref([])
const editReductions  = ref([])     // G11: [{ startTemp, endTemp|null }] in °C
const showReductionModal = ref(false)

function onReductionsSaved(list) {
  editReductions.value = list
  showReductionModal.value = false
}

const id    = computed(() => Number(route.params.id))
const theme = computed(() => themeForType(form.type))

function flash(msg) {
  status.value = msg
  setTimeout(() => { if (status.value === msg) status.value = '' }, 2800)
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
      const copy = await $fetch('/api/schedules', {
        method: 'POST',
        body: { name: `${s.name} (copy)`, type: s.type ?? 'bisque', cone: s.cone ?? null, source: 'preset_copy', points: pts },
      })
      router.replace(`/schedules/${copy.id}?copyOf=${encodeURIComponent(s.name)}`)
      return
    }

    form.name = s.name
    form.type = s.type ?? 'bisque'
    form.cone = s.cone ?? ''
    editPoints.value = (s.points ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
    // G11: hydrate planned reductions (stored as start_temp/end_temp °C)
    editReductions.value = (s.reductions ?? []).map(r => ({
      startTemp: r.start_temp,
      endTemp:   r.end_temp ?? null,
    }))
  } catch (err) {
    flash(`Couldn't load: ${err?.data?.message ?? err.message ?? 'error'}`)
  }
  loading.value = false
}

async function save() {
  if (!form.name.trim() || saving.value) return
  saving.value = true
  try {
    await $fetch(`/api/schedules/${id.value}`, {
      method: 'PUT',
      body: { name: form.name.trim(), type: form.type, cone: form.cone?.trim() || null, points: editPoints.value, reductions: editReductions.value },
    })
    flash('Saved')
  } catch (err) {
    flash(`Couldn't save: ${err?.data?.message ?? err.message ?? 'error'}`)
  } finally {
    saving.value = false
  }
}

async function saveAndStart() {
  if (!form.name.trim() || saving.value) return
  // G5 fallback — the button is disabled when active, but guard anyway.
  if (activeFiring.value) {
    flash(`"${activeFiring.value.name}" is still firing — end it before starting another.`)
    return
  }
  saving.value = true
  try {
    await $fetch(`/api/schedules/${id.value}`, {
      method: 'PUT',
      body: { name: form.name.trim(), type: form.type, cone: form.cone?.trim() || null, points: editPoints.value, reductions: editReductions.value },
    })
    router.push(`/app?startSchedule=${id.value}`)
  } catch (err) {
    flash(`Couldn't save: ${err?.data?.message ?? err.message ?? 'error'}`)
    saving.value = false
  }
}
</script>