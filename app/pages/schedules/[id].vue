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

      <!-- Description (G10) -->
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Description <span class="text-ink-faint/60 normal-case font-normal tracking-normal">(optional)</span></label>
        <textarea
          v-model="form.description"
          rows="2"
          maxlength="500"
          placeholder="Notes about this schedule — when to use it, glaze pairings, quirks…"
          class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif resize-none"
        />
      </div>

      <!-- Curve -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center gap-2">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Curve</label>
          <span v-if="form.type" class="text-[10px] font-bold px-2 py-0.5 rounded-full" :class="theme.badgeText">{{ form.type }}</span>
        </div>
        <ScheduleCurveEditor v-model="editPoints" :stroke="theme.stroke" :fill="theme.fill" />
      </div>

      <!-- Actions -->
      <div class="flex flex-col sm:flex-row gap-2 pt-2 border-t border-parchment-3">
        <button
          class="flex-1 py-2.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors disabled:opacity-40"
          :disabled="saving || !form.name.trim()"
          @click="save"
        >{{ saving ? 'Saving…' : 'Save schedule' }}</button>
        <button
          class="flex-1 py-2.5 border border-celadon/40 bg-celadon-bg/60 text-celadon-dark hover:bg-celadon-bg text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
          :disabled="saving || !form.name.trim()"
          @click="saveAndStart"
        >Save &amp; start firing →</button>
      </div>

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

const loading    = ref(true)
const saving     = ref(false)
const status     = ref('')
const form       = reactive({ name: '', type: 'bisque', cone: '', description: '' })
const editPoints = ref([])

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
        body: { name: `${s.name} (copy)`, type: s.type ?? 'bisque', cone: s.cone ?? null, description: s.description ?? null, source: 'preset_copy', points: pts },
      })
      router.replace(`/schedules/${copy.id}?copyOf=${encodeURIComponent(s.name)}`)
      return
    }

    form.name        = s.name
    form.type        = s.type ?? 'bisque'
    form.cone        = s.cone ?? ''
    form.description = s.description ?? ''
    editPoints.value = (s.points ?? []).map(p => ({ offsetMinutes: p.offset_minutes, targetTemp: p.target_temp }))
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
      body: { name: form.name.trim(), type: form.type, cone: form.cone?.trim() || null, description: form.description?.trim() || null, points: editPoints.value },
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
  saving.value = true
  try {
    await $fetch(`/api/schedules/${id.value}`, {
      method: 'PUT',
      body: { name: form.name.trim(), type: form.type, cone: form.cone?.trim() || null, description: form.description?.trim() || null, points: editPoints.value },
    })
    router.push(`/app?startSchedule=${id.value}`)
  } catch (err) {
    flash(`Couldn't save: ${err?.data?.message ?? err.message ?? 'error'}`)
    saving.value = false
  }
}
</script>