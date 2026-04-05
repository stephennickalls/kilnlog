<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      @click.self="$emit('close')"
    >
      <div class="bg-white rounded-xl shadow-xl w-[340px] p-6 flex flex-col gap-5">

        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ isEdit ? 'Edit Reading' : 'Log Reading' }}</h2>
          <button
            class="p-1.5 rounded-md hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            @click="$emit('close')"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Time display — read only -->
        <div class="bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-0.5">Time from start</p>
            <p class="text-2xl font-bold text-stone-700 tabular-nums">{{ minuteLabel }}</p>
          </div>
          <div class="text-right">
            <p class="text-xs font-semibold uppercase tracking-wide text-stone-400 mb-0.5">Clock</p>
            <p class="text-sm font-medium text-stone-500">{{ clockTime }}</p>
          </div>
        </div>

        <!-- Temperature input -->
        <div class="flex flex-col gap-1">
          <label class="label">Temperature</label>
          <div class="flex items-center gap-2">
            <input
              ref="tempInput"
              v-model.number="tempValue"
              class="input text-2xl font-bold tabular-nums"
              type="number"
              min="0"
              max="1400"
              placeholder="0"
              @keydown.enter="submit"
            />
            <span class="text-lg font-semibold text-stone-400 shrink-0">°C</span>
          </div>
        </div>

        <div class="flex gap-2 pt-1 border-t border-stone-100" :class="isEdit ? 'justify-between' : 'justify-end'">
          <!-- Delete button — edit mode only -->
          <button
            v-if="isEdit"
            class="px-4 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors"
            @click="$emit('delete')"
          >
            Delete reading
          </button>
          <div class="flex gap-2">
            <button class="btn-ghost" @click="$emit('close')">Cancel</button>
            <button
              class="btn-primary"
              :disabled="!tempValue || tempValue <= 0"
              @click="submit"
            >
              {{ isEdit ? 'Save' : 'Log →' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  open:       boolean
  startedAt:  number        // unix seconds
  isEdit:     boolean
  editTemp?:  number | null // prefill when editing
  editTs?:    number | null // unix ts of the reading being edited
}>()

const emit = defineEmits<{
  close:  []
  save:   [payload: { temperature: number; timestamp: number }]
  delete: []
}>()

const tempInput = ref<HTMLInputElement | null>(null)
const tempValue = ref<number | null>(null)

// The timestamp this reading will be logged at — "now" for new, original ts for edit
const effectiveTimestamp = computed(() =>
  props.isEdit && props.editTs ? props.editTs : Math.floor(Date.now() / 1000)
)

const minuteLabel = computed(() => {
  const mins = Math.round((effectiveTimestamp.value - props.startedAt) / 60)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
})

const clockTime = computed(() =>
  new Date(effectiveTimestamp.value * 1000).toLocaleTimeString('en-NZ', {
    hour:   '2-digit',
    minute: '2-digit',
  })
)

// Prefill when editing, reset when opening new
watch(() => props.open, (val) => {
  if (val) {
    tempValue.value = props.isEdit && props.editTemp ? props.editTemp : null
    nextTick(() => tempInput.value?.focus())
  }
})

function submit() {
  if (!tempValue.value || tempValue.value <= 0) return
  emit('save', {
    temperature: tempValue.value,
    timestamp:   effectiveTimestamp.value,
  })
}
</script>