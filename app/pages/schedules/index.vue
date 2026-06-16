<!-- app/pages/schedules/index.vue -->
<!--
  Schedules library. Manages schedules; never starts a firing itself (Start opens
  the modal preselected — Slice D). Two groups: "Your schedules" (browse-by-shape)
  and "Presets" (search-by-attribute → filter chips). Primary card tap = Edit.
  Card colour follows firing type via useScheduleTheme.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <header class="sticky top-0 z-20 bg-parchment/95 backdrop-blur border-b border-parchment-3">
      <div class="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div class="flex items-center gap-2 min-w-0">
          <NuxtLink to="/app" class="p-1.5 -ml-1 rounded-lg text-ink-muted hover:text-flame hover:bg-parchment-2 transition-colors shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          </NuxtLink>
          <h1 class="text-base sm:text-lg font-bold text-ink tracking-tight truncate">Schedules</h1>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <NuxtLink to="/schedules/new" class="btn-primary shrink-0">+ New schedule</NuxtLink>
          <UserMenu />
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-10">

      <!-- G5: one firing at a time — note when starting is blocked -->
      <NuxtLink
        v-if="activeFiring"
        to="/app"
        class="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm hover:bg-amber-100 transition-colors"
      >
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        <span><strong>{{ activeFiring.name }}</strong> is still firing — only one firing at a time. End it before starting another.</span>
      </NuxtLink>

      <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-ink-muted gap-2">
        <svg class="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>
        <span class="text-sm">Loading schedules…</span>
      </div>

      <template v-else>

        <!-- Your schedules -->
        <section class="flex flex-col gap-3">
          <div class="flex items-baseline gap-2 px-0.5">
            <h2 class="text-sm font-bold text-ink">Your schedules</h2>
            <span v-if="mySchedules.length" class="text-[11px] text-ink-faint tabular-nums">{{ mySchedules.length }}</span>
          </div>

          <div v-if="mySchedules.length" class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(232px,1fr))">
            <ScheduleCard
              v-for="s in mySchedules" :key="s.id"
              :schedule="s"
              :start-disabled="!!activeFiring"
              @edit="goEdit(s)"
              @start="startFromSchedule(s)"
              @duplicate="duplicate(s)"
              @confirm-delete="remove(s)"
            />
          </div>

          <div v-else class="border border-dashed border-parchment-3 rounded-xl px-6 py-10 text-center flex flex-col items-center gap-3 bg-white/30">
            <div class="w-10 h-10 rounded-full bg-flame-bg flex items-center justify-center text-flame">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8"/></svg>
            </div>
            <p class="text-sm text-ink-muted max-w-xs">No schedules of your own yet. Build one from scratch, or turn a firing you loved into a plan you can repeat.</p>
            <div class="flex flex-wrap gap-2 justify-center">
              <NuxtLink to="/schedules/new" class="btn-primary">+ New schedule</NuxtLink>
              <NuxtLink to="/app" class="btn-ghost">Browse firings</NuxtLink>
            </div>
          </div>
        </section>

        <!-- Presets -->
        <section v-if="presets.length" class="flex flex-col gap-3">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-2 px-0.5">
            <h2 class="text-sm font-bold text-ink">Presets</h2>
            <span class="text-[11px] text-ink-faint">starting points — editing one makes your own copy</span>
            <div class="flex gap-1 ml-auto">
              <button
                v-for="f in filters" :key="f.key"
                class="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors"
                :class="activeFilter === f.key ? 'bg-flame text-parchment' : 'bg-white border border-parchment-3 text-ink-muted hover:bg-parchment-2'"
                @click="activeFilter = f.key"
              >{{ f.label }}</button>
            </div>
          </div>

          <div class="grid gap-3" style="grid-template-columns:repeat(auto-fill,minmax(232px,1fr))">
            <ScheduleCard
              v-for="s in filteredPresets" :key="s.id"
              :schedule="s"
              :is-preset="true"
              :start-disabled="!!activeFiring"
              @edit="goEdit(s)"
              @start="startFromSchedule(s)"
              @duplicate="duplicate(s)"
            />
          </div>
          <p v-if="!filteredPresets.length" class="text-sm text-ink-muted px-0.5 py-4">No {{ activeFilter }} presets.</p>
        </section>

      </template>
    </main>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="status" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold font-serif bg-green-600 text-white max-w-sm w-[calc(100%-2rem)] text-center">
          {{ status }}
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
// app/pages/schedules/index.vue
definePageMeta({ middleware: ['auth'] })

const router = useRouter()

// G5: know whether a firing is active so we can disable Start affordances.
const { activeFiring, loadActiveFiring } = useActiveFiring()

const schedules   = ref([])
const loading     = ref(true)
const status      = ref('')
const activeFilter = ref('all')

// Filter by the same firing types the user can assign. "All" + the two most
// common; bisque/glaze cover the bulk, others fall under whichever they match.
const filters = [
  { key: 'all',    label: 'All' },
  { key: 'bisque', label: 'Bisque' },
  { key: 'glaze',  label: 'Glaze' },
]

const mySchedules = computed(() => schedules.value.filter(s => s.user_id !== null))
const presets     = computed(() => schedules.value.filter(s => s.user_id === null))
const filteredPresets = computed(() =>
  activeFilter.value === 'all' ? presets.value : presets.value.filter(s => s.type === activeFilter.value)
)

onMounted(() => { load(); loadActiveFiring() })

async function load() {
  loading.value = true
  try {
    schedules.value = await $fetch('/api/schedules')
  } catch (err) {
    flash(`Couldn't load schedules: ${err?.data?.message ?? err.message ?? 'error'}`)
  } finally {
    loading.value = false
  }
}

function flash(msg) {
  status.value = msg
  setTimeout(() => { if (status.value === msg) status.value = '' }, 2600)
}

function goEdit(s) { router.push(`/schedules/${s.id}`) }
function startFromSchedule(s) {
  // G5 fallback — the card disables this when active, but guard anyway.
  if (activeFiring.value) {
    flash(`"${activeFiring.value.name}" is still firing — end it first.`)
    return
  }
  router.push(`/app?startSchedule=${s.id}`)
}

async function duplicate(s) {
  try {
    const points = (s.points ?? s.schedule_library_points ?? []).map(p => ({
      offsetMinutes: p.offset_minutes, targetTemp: p.target_temp,
    }))
    const copy = await $fetch('/api/schedules', {
      method: 'POST',
      body: {
        name: `${s.name} (copy)`,
        type: s.type ?? null,
        cone: s.cone ?? null,
        source: s.user_id === null ? 'preset_copy' : 'custom',
        points,
      },
    })
    flash('Duplicated')
    router.push(`/schedules/${copy.id}`)
  } catch (err) {
    flash(`Couldn't duplicate: ${err?.data?.message ?? err.message ?? 'error'}`)
  }
}

async function remove(s) {
  try {
    await $fetch(`/api/schedules/${s.id}`, { method: 'DELETE' })
    schedules.value = schedules.value.filter(x => x.id !== s.id)
    flash('Deleted')
  } catch (err) {
    flash(`Couldn't delete: ${err?.data?.message ?? err.message ?? 'error'}`)
  }
}
</script>