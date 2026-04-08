<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 flex items-end sm:items-center justify-center z-50 font-serif"
      style="background: rgba(26,18,8,0.6)"
      @click.self="$emit('close')"
    >
      <!-- Sheet on mobile, centered modal on desktop -->
      <div class="bg-parchment w-full sm:w-[360px] sm:rounded-2xl rounded-t-2xl p-6 flex flex-col gap-5 border border-parchment-3"
        style="box-shadow: 0 -8px 40px rgba(26,18,8,0.15)">

        <div class="flex items-center justify-between">
          <h2 class="text-base font-bold text-ink">{{ isEdit ? 'Edit reading' : 'Log reading' }}</h2>
          <button class="p-1.5 rounded-lg hover:bg-parchment-2 text-ink-muted hover:text-ink transition-colors" @click="$emit('close')">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Time info -->
        <div class="bg-parchment-2 border border-parchment-3 rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mb-0.5">Time from start</p>
            <p class="text-2xl font-bold text-ink tabular-nums">{{ minuteLabel }}</p>
          </div>
          <div class="text-right">
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint mb-0.5">Clock</p>
            <p class="text-sm font-semibold text-ink-muted">{{ clockTime }}</p>
          </div>
        </div>

        <!-- Temp input -->
        <div class="flex flex-col gap-2">
          <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Temperature</label>
          <div class="flex items-center gap-3">
            <input
              ref="tempInput"
              v-model.number="tempValue"
              type="number"
              min="0"
              max="1400"
              placeholder="0"
              class="flex-1 border border-parchment-3 rounded-xl px-4 py-3 text-3xl font-bold tabular-nums text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
              @keydown.enter="submit"
            />
            <span class="text-xl font-bold text-ink-faint shrink-0">°C</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2 pt-1 border-t border-parchment-3" :class="isEdit ? 'justify-between' : 'justify-end'">
          <button
            v-if="isEdit"
            class="px-4 py-2 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-semibold rounded-lg transition-colors"
            @click="$emit('delete')"
          >Delete reading</button>
          <div class="flex gap-2">
            <button class="px-4 py-2 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-semibold rounded-lg transition-colors" @click="$emit('close')">Cancel</button>
            <button
              class="px-4 py-2 bg-flame text-parchment text-sm font-bold rounded-lg hover:bg-flame-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="!tempValue || tempValue <= 0"
              @click="submit"
            >{{ isEdit ? 'Save' : 'Log →' }}</button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  open:      Boolean,
  startedAt: { type: Number, default: 0 },
  isEdit:    Boolean,
  editTemp:  { type: Number, default: null },
  editTs:    { type: Number, default: null },
})

const emit = defineEmits(['close', 'save', 'delete'])

const tempInput = ref(null)
const tempValue = ref(null)

const effectiveTimestamp = computed(() =>
  props.isEdit && props.editTs ? props.editTs : Math.floor(Date.now() / 1000)
)

const minuteLabel = computed(() => {
  const mins = Math.round((effectiveTimestamp.value - props.startedAt) / 60)
  const h = Math.floor(mins / 60), m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

const clockTime = computed(() =>
  new Date(effectiveTimestamp.value * 1000).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })
)

watch(() => props.open, (val) => {
  if (val) {
    tempValue.value = props.isEdit && props.editTemp ? props.editTemp : null
    nextTick(() => tempInput.value?.focus())
  }
})

function submit() {
  if (!tempValue.value || tempValue.value <= 0) return
  emit('save', { temperature: tempValue.value, timestamp: effectiveTimestamp.value })
}
</script>