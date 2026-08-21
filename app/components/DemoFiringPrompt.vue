<!-- File: app/components/DemoFiringPrompt.vue -->
<!--
  The demo offer in the /app empty state: a single button, with the choices
  behind it in a sheet.

  This started as an always-open card with a select and a submit button, which
  put a form in front of someone who hadn't yet decided they wanted one. The
  empty state's job is to present two or three clear moves; a form is not a
  move, it's what happens after you pick one.

  ONE ACTIVE FIRING. A demo takes that slot, so the button explains itself
  rather than opening a sheet that can only refuse. Deleting the demo before
  the first real firing is the rule we want learned on fake data.

  Sheet follows the house pattern: bottom sheet on phones, centred on desktop,
  dvh cap, safe-area padding, 44px targets.

  Emits @created once the firing exists. The parent hard-navigates rather than
  patching state — reloadReadings does not re-read started_at, fuel or
  cone_pack, and a demo's backdated clock is the whole point of it.
-->
<template>
  <div class="w-full max-w-md mx-auto flex flex-col items-center gap-2.5">

    <button
      class="w-full flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-xl border border-flame/35 bg-flame-bg text-flame text-sm font-bold hover:bg-flame hover:text-parchment transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-flame-bg disabled:hover:text-flame"
      :disabled="loading || blocked"
      @click="open = true"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22c4.4 0 8-3.6 8-8 0-5-4-8-5.5-11C13 6 10 7 10 10c-1.5-1-2-2.5-2-4-2.5 2-4 5-4 8 0 4.4 3.6 8 8 8z"/></svg>
      Try a demo firing
    </button>

    <p v-if="blocked" class="text-[11px] text-ink-faint text-center leading-snug px-2">
      <strong class="text-ink-muted">{{ activeFiring.name }}</strong> is still running.
      A demo takes the same slot, so end that one first.
    </p>
    <p v-else class="text-[11px] text-ink-faint text-center leading-snug px-2">
      See a firing already underway and try everything safely. Delete it any time.
    </p>

    <!-- ── Sheet ─────────────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-[70] flex flex-col justify-end sm:justify-center sm:items-center font-serif"
        style="background:rgba(26,18,8,0.6)"
        @click.self="close"
      >
        <div
          class="bg-parchment w-full sm:w-[440px] sm:rounded-2xl rounded-t-2xl flex flex-col border border-parchment-3"
          style="max-height:85vh; max-height:min(85vh, 85dvh); box-shadow:0 -8px 40px rgba(26,18,8,0.15)"
        >

          <div class="flex justify-center pt-3 pb-1 sm:hidden shrink-0"><div class="w-10 h-1 bg-parchment-3 rounded-full"/></div>

          <div class="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-parchment-3 shrink-0">
            <div class="min-w-0">
              <h2 class="text-base font-bold text-ink">Try a demo firing</h2>
              <p class="text-xs text-ink-muted mt-0.5 leading-relaxed">
                A firing that's already a few hours in, with readings logged and a cone about to fall.
              </p>
            </div>
            <button class="p-2 -mr-1 -mt-1 text-ink-muted hover:text-ink shrink-0" aria-label="Close" @click="close">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-4">

            <div v-if="loading" class="py-8 flex justify-center">
              <div class="w-6 h-6 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"/>
            </div>

            <template v-else>
              <label class="flex flex-col gap-1.5">
                <span class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">What kind of firing?</span>
                <select v-model="presetId" class="input rounded-xl px-3.5 py-3 text-sm min-h-[44px]">
                  <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.name }}</option>
                </select>
              </label>

              <div v-if="chosen" class="rounded-xl border border-parchment-3 bg-white px-3.5 py-3 flex flex-col gap-1.5">
                <p class="text-xs text-ink-muted">
                  <span class="font-semibold text-ink capitalize">{{ chosen.fuel }}</span> ·
                  target cone <span class="font-semibold text-ink">{{ chosen.cone }}</span>
                </p>
                <p class="text-xs text-ink-muted">
                  Witness cones <span class="font-semibold text-ink">{{ chosen.cone_pack.join(', ') }}</span>
                </p>
                <p v-if="chosen.description" class="text-[11px] text-ink-faint leading-relaxed pt-0.5">
                  {{ chosen.description }}
                </p>
              </div>

              <button
                class="w-full min-h-[44px] py-3 bg-flame hover:bg-flame-dark text-parchment text-sm font-bold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="busy || !presetId"
                @click="create"
              >
                {{ busy ? 'Loading the demo…' : 'Load demo firing' }}
              </button>

              <p class="text-[11px] text-ink-faint text-center leading-snug">
                Nothing here is real. You can delete it in one tap.
              </p>

              <p v-if="error" class="text-xs text-red-600 font-semibold text-center">{{ error }}</p>
            </template>

          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
// app/components/DemoFiringPrompt.vue
const emit = defineEmits(['created'])

const open         = ref(false)
const presets      = ref([])
const presetId     = ref(null)
const activeFiring = ref(null)
const loading      = ref(true)
const busy         = ref(false)
const error        = ref('')

const blocked = computed(() => !!activeFiring.value)
const chosen  = computed(() => presets.value.find(p => p.id === presetId.value) ?? null)

onMounted(load)

async function load() {
  loading.value = true
  try {
    const state = await $fetch('/api/demo-firing')
    presets.value      = state.presets ?? []
    activeFiring.value = state.activeFiring ?? null
    // Default to a gas reduction preset when one exists: it carries the low
    // cone cluster and the atmosphere bands, so it shows the most.
    presetId.value =
      (presets.value.find(p => /reduction/i.test(p.name)) ?? presets.value[0])?.id ?? null
  } catch (err) {
    error.value = err?.data?.statusMessage ?? 'Could not load the demo options.'
  } finally {
    loading.value = false
  }
}

function close() {
  if (busy.value) return
  open.value = false
  error.value = ''
}

async function create() {
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch('/api/demo-firing', {
      method: 'POST',
      body: { presetId: presetId.value, name: 'Demo firing' },
    })
    emit('created', result.firing)
  } catch (err) {
    error.value = err?.data?.statusMessage ?? err?.data?.message ?? 'Could not load the demo.'
    // A 409 means the state moved under us; refresh so the button matches
    // reality rather than offering something the server will refuse again.
    if ((err?.statusCode ?? err?.status) === 409) load()
    busy.value = false
  }
}
</script>