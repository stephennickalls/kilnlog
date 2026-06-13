<!-- File: app/components/ConfirmDialog.vue -->
<!--
  PACKAGE 4 — generic destructive-action confirm (G4).
  Styled to match the existing End-firing confirm modal.

  Usage:
    <ConfirmDialog
      :open="!!pendingDeleteFiring"
      :title="`Delete ${pendingDeleteFiring?.name}?`"
      message="This permanently removes the firing, its schedule, and every logged reading. This cannot be undone."
      confirm-label="Delete firing"
      @confirm="reallyDeleteFiring"
      @cancel="pendingDeleteFiring = null"
    />
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      style="background:rgba(26,18,8,0.6)"
      @click.self="$emit('cancel')"
    >
      <div
        class="bg-parchment w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl p-6 flex flex-col gap-4 border border-parchment-3"
        style="box-shadow:0 -8px 40px rgba(26,18,8,0.15)"
      >
        <div class="flex flex-col gap-1.5">
          <h2 class="text-base font-bold text-ink">{{ title }}</h2>
          <p class="text-sm text-ink-muted leading-relaxed">{{ message }}</p>
        </div>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-lg transition-colors"
            @click="$emit('confirm')"
          >{{ confirmLabel }}</button>
          <button
            class="px-4 py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-lg hover:bg-parchment-2 transition-colors"
            @click="$emit('cancel')"
          >Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// app/components/ConfirmDialog.vue
defineProps({
  open:         { type: Boolean, default: false },
  title:        { type: String,  required: true },
  message:      { type: String,  required: true },
  confirmLabel: { type: String,  default: 'Confirm' },
})
defineEmits(['confirm', 'cancel'])
</script>