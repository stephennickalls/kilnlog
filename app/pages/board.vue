<!-- app/pages/board.vue -->
<script setup>
definePageMeta({ auth: false })

useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const { data: messages, pending, error, refresh } = await useFetch('/api/board')

const errorText = computed(() => {
  const e = error.value
  if (!e) return ''
  return e.data?.statusMessage || e.data?.message || e.statusMessage || e.message || 'Unknown error'
})
</script>

<template>
  <div class="max-w-2xl mx-auto p-6">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold">Message board</h1>
      <button
        class="px-3 py-1.5 rounded bg-gray-800 text-white text-sm hover:bg-gray-700"
        @click="refresh()"
      >
        Refresh
      </button>
    </div>

    <p class="mb-6 text-sm text-gray-600">
      Add a word by visiting
      <code class="px-1 bg-gray-100 rounded">/api/board/hello?id=1</code>
      or
      <code class="px-1 bg-gray-100 rounded">/api/board/world?id=1</code>
    </p>

    <p v-if="pending" class="text-gray-500">Loading...</p>
    <div v-else-if="error" class="text-red-600">
      <p>Could not load messages.</p>
      <pre class="mt-2 p-2 bg-red-50 rounded text-xs whitespace-pre-wrap">{{ errorText }}</pre>
    </div>
    <p v-else-if="!messages?.length" class="text-gray-500">No messages yet.</p>

    <ul v-else class="space-y-3">
      <li
        v-for="m in messages"
        :key="m.group_id"
        class="flex items-center gap-4 p-4 rounded border border-gray-200 bg-white"
      >
        <span class="shrink-0 px-2 py-1 rounded bg-gray-100 font-mono text-sm">
          #{{ m.group_id }}
        </span>
        <span class="text-lg">{{ m.message }}</span>
      </li>
    </ul>
  </div>
</template>