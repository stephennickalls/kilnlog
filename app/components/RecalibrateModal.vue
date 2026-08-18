<!-- app/components/RecalibrateModal.vue -->
<!-- Explains recalibration, then confirms it. Extracted from app.vue. -->
<template>
  <Teleport to="body">
    <div v-if="open" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center font-serif" style="background:rgba(26,18,8,0.55)" @click.self="$emit('close')">
      <div
        class="bg-parchment sm:bg-white w-full sm:w-80 sm:rounded-2xl rounded-t-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:pb-5 sm:border sm:border-parchment-3 overflow-y-auto"
        style="max-height:88vh; max-height:min(88vh, 88dvh); box-shadow:0 -8px 40px rgba(26,18,8,0.15)"
      >
        <p class="text-sm font-bold text-ink mb-1.5">When to recalibrate</p>
        <p class="text-sm text-ink-muted leading-relaxed">
          Use this when your kiln has fallen behind the plan — a weak burner, a stall, or after a gas-out.
          It slides the rest of your plan to start from your <strong>current temperature</strong>, keeping every
          ramp rate intact. Your firing just finishes later.
        </p>
        <div class="flex gap-2 mt-4">
          <button class="flex-1 py-2.5 min-h-[44px] bg-celadon hover:bg-celadon-dark text-white text-sm font-bold rounded-lg transition-colors" @click="$emit('confirm')">Recalibrate now</button>
          <button class="px-4 py-2.5 min-h-[44px] border border-parchment-3 text-ink-muted text-sm font-semibold rounded-lg hover:bg-parchment-2 transition-colors" @click="$emit('close')">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// app/components/RecalibrateModal.vue
defineProps({ open: Boolean })
defineEmits(['close', 'confirm'])
</script>