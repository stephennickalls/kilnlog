<!-- app/components/FiringNotesModal.vue -->
<!-- Owns its own draft, seeded from `notes` each time it opens, so cancelling
     discards cleanly. Emits save(text|null); the parent does the PUT. -->
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center font-serif" style="background:rgba(26,18,8,0.6)" @click.self="!saving && $emit('close')">
      <div
        class="bg-parchment w-full sm:w-[440px] sm:rounded-2xl rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 flex flex-col gap-3 border border-parchment-3 overflow-y-auto"
        style="max-height:92vh; max-height:min(92vh, 88dvh); box-shadow:0 -8px 40px rgba(26,18,8,0.15)"
      >
        <div class="flex flex-col gap-0.5">
          <h2 class="text-base font-bold text-ink">Notes</h2>
          <p class="text-xs text-ink-muted truncate">{{ firingName }}</p>
        </div>

        <textarea
          v-model="draft"
          rows="7"
          :maxlength="MAX"
          class="input !py-2 resize-y leading-relaxed"
          placeholder="Load, atmosphere, glaze tests, anything worth remembering…"
        />

        <div class="flex items-center justify-between gap-2">
          <span class="text-[11px] text-ink-faint tabular-nums shrink-0">{{ draft.length }}/{{ MAX }}</span>
          <div class="flex gap-2 shrink-0">
            <button class="btn-ghost !py-2" :disabled="saving" @click="$emit('close')">Cancel</button>
            <button class="btn-primary !py-2" :disabled="saving" @click="$emit('save', draft.trim() || null)">
              {{ saving ? 'Saving…' : 'Save notes' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// app/components/FiringNotesModal.vue
const MAX = 5000

const props = defineProps({
  open:       Boolean,
  firingName: { type: String, default: '' },
  notes:      { type: String, default: '' },
  saving:     Boolean,
})
defineEmits(['close', 'save'])

const draft = ref('')
watch(() => props.open, (isOpen) => { if (isOpen) draft.value = props.notes ?? '' })
</script>