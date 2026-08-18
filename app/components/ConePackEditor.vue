<!-- app/components/ConePackEditor.vue -->
<!--
  The witness cones planned for a firing. A cone pack is built and placed
  before the door closes, so this is planning data, not something logged live.

  Convention (Orton / Arbuckle): a simple firing uses guide / target / guard —
  one cone below the target, the target, one above. Gas and wood add a low
  cluster (010, 08) that times the atmosphere change rather than the peak.
  Suggest fills guide/target/guard; everything else is the potter's call.

  v-model is an array of cone NAMES, unsorted on the way in; emitted sorted
  cold-to-hot so the stored order matches how the cones sit in the pack.
-->
<template>
  <div class="flex flex-col gap-2">
    <div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
        Cone pack
        <span class="text-parchment-4 font-normal normal-case tracking-normal">({{ modelValue.length }})</span>
      </label>
      <div class="flex items-center gap-3 shrink-0">
        <button
          v-if="suggestion.length"
          class="text-xs font-semibold text-celadon-dark hover:text-celadon transition-colors py-1"
          @click="applySuggestion"
        >Suggest {{ suggestion.join(' · ') }}</button>
        <button
          v-if="modelValue.length"
          class="text-xs font-semibold text-ink-faint hover:text-red-500 transition-colors py-1"
          @click="$emit('update:modelValue', [])"
        >Clear</button>
      </div>
    </div>

    <!-- Selected pack, cold to hot: the row you'd read through the peep hole. -->
    <div v-if="selected.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="c in selected" :key="c.name"
        class="px-2.5 py-1.5 min-h-[34px] rounded-lg text-sm font-bold tabular-nums border transition-colors"
        :class="c.name === targetCone
          ? 'bg-celadon text-white border-celadon'
          : 'bg-celadon-bg text-celadon-dark border-celadon/30'"
        :title="`Remove cone ${c.name}`"
        @click="toggle(c.name)"
      >
        {{ c.name }}
        <span class="font-normal opacity-70">{{ displayTemp(c.tempC) }}°</span>
      </button>
    </div>
    <p v-else class="text-[11px] text-ink-muted leading-snug">
      No cones planned. The pack is what you can actually witness — pick the cones
      going into the kiln.
    </p>

    <button
      class="flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink transition-colors py-1 self-start"
      @click="open = !open"
    >
      <svg class="w-3.5 h-3.5 transition-transform" :class="open ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
      {{ open ? 'Done choosing' : 'Choose cones' }}
    </button>

    <div v-if="open" class="grid grid-cols-5 min-[380px]:grid-cols-6 gap-1.5 p-2 rounded-xl bg-parchment-2 border border-parchment-3 max-h-64 overflow-y-auto">
      <button
        v-for="c in cones" :key="c.id ?? c.name"
        class="py-2 min-h-[38px] rounded-lg text-sm font-bold tabular-nums border transition-colors"
        :class="isPicked(c.name)
          ? 'bg-celadon text-white border-celadon'
          : 'bg-white text-ink border-parchment-3 active:bg-parchment-2'"
        @click="toggle(c.name)"
      >{{ c.name }}</button>
    </div>
  </div>
</template>

<script setup>
// app/components/ConePackEditor.vue
const props = defineProps({
  modelValue: { type: Array, default: () => [] },   // cone names
  targetCone: { type: String, default: '' },        // the schedule's cone, emphasised
})
const emit = defineEmits(['update:modelValue'])

const { displayTemp } = useTempUnit()

const cones = ref([])
const open  = ref(false)

onMounted(async () => {
  try { cones.value = await $fetch('/api/cones') } catch {}
})

// Cold to hot, so both the chips and the stored array read in melting order.
const byTemp = computed(() =>
  [...cones.value]
    .filter(c => Number.isFinite(Number(c.temp_c)))
    .map(c => ({ name: c.name, tempC: Number(c.temp_c) }))
    .sort((a, b) => a.tempC - b.tempC)
)

const picked   = computed(() => new Set(props.modelValue))
const isPicked = (name) => picked.value.has(name)
const selected = computed(() => byTemp.value.filter(c => picked.value.has(c.name)))

function toggle(name) {
  const next = picked.value.has(name)
    ? props.modelValue.filter(n => n !== name)
    : [...props.modelValue, name]
  const order = new Map(byTemp.value.map((c, i) => [c.name, i]))
  emit('update:modelValue', next.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)))
}

// Guide / target / guard around the schedule's cone. Only offered when the
// target is known and nothing is picked yet.
const suggestion = computed(() => {
  if (props.modelValue.length || !props.targetCone || !byTemp.value.length) return []
  const i = byTemp.value.findIndex(c => c.name === props.targetCone)
  if (i === -1) return []
  return [byTemp.value[i - 1], byTemp.value[i], byTemp.value[i + 1]].filter(Boolean).map(c => c.name)
})

function applySuggestion() {
  emit('update:modelValue', [...suggestion.value])
}
</script>