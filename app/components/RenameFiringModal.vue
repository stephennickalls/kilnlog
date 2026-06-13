<!-- File: app/components/RenameFiringModal.vue -->
<!--
  PACKAGE 4 — G2 rename UI. Self-contained: does its own PUT and emits
  `renamed` with the updated firing row, so app.vue wiring is minimal:

    <RenameFiringModal
      :open="showRenameModal"
      :firing="selectedFiring"
      @close="showRenameModal = false"
      @renamed="onFiringRenamed"
    />

    function onFiringRenamed(updated) {
      showRenameModal.value = false
      if (selectedFiring.value?.id === updated.id) {
        selectedFiring.value = { ...selectedFiring.value, name: updated.name }
      }
      const i = allFirings.value.findIndex(f => f.id === updated.id)
      if (i !== -1) allFirings.value[i] = { ...allFirings.value[i], name: updated.name }
    }
-->
<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
      style="background:rgba(26,18,8,0.55)"
      @click.self="$emit('close')"
    >
      <div
        class="bg-parchment sm:bg-white w-full sm:w-96 sm:rounded-2xl rounded-t-2xl p-5 sm:border sm:border-parchment-3 flex flex-col gap-4"
        style="box-shadow:0 -8px 40px rgba(26,18,8,0.15)"
      >
        <p class="text-sm font-bold text-ink">Rename firing</p>

        <input
          ref="inputEl"
          v-model="name"
          type="text"
          maxlength="120"
          class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame font-serif"
          placeholder="Firing name"
          @keyup.enter="save"
        >

        <p v-if="error" class="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ error }}</p>

        <div class="flex gap-2">
          <button
            class="flex-1 py-2.5 bg-flame hover:bg-flame-dark text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-40"
            :disabled="saving || !name.trim() || name.trim() === firing?.name"
            @click="save"
          >{{ saving ? 'Saving…' : 'Save' }}</button>
          <button
            class="px-4 py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-lg hover:bg-parchment-2 transition-colors"
            @click="$emit('close')"
          >Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
// app/components/RenameFiringModal.vue
const props = defineProps({
  open:   { type: Boolean, default: false },
  firing: { type: Object,  default: null },
})
const emit = defineEmits(['close', 'renamed'])

const name    = ref('')
const saving  = ref(false)
const error   = ref('')
const inputEl = ref(null)

watch(() => props.open, async (val) => {
  if (val) {
    name.value  = props.firing?.name ?? ''
    error.value = ''
    await nextTick()
    inputEl.value?.focus()
    inputEl.value?.select()
  }
})

async function save() {
  const trimmed = name.value.trim()
  if (!trimmed || !props.firing?.id || saving.value) return
  saving.value = true
  error.value  = ''
  try {
    const updated = await $fetch(`/api/firings/${props.firing.id}`, {
      method: 'PUT',
      body: { name: trimmed },
    })
    emit('renamed', updated)
  } catch (err) {
    error.value = err?.data?.statusMessage ?? err?.data?.message ?? 'Could not rename. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>