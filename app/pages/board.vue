<!-- app/pages/board.vue -->
<script setup>
definePageMeta({ auth: false })

useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })

const WORDS = ['hello', 'world']

const route = useRoute()
const router = useRouter()
const supabase = useSupabaseClient()

const word = String(route.query.word || '').toLowerCase()
const groupId = Number(route.query.id)
const wantsWrite = route.query.word !== undefined || route.query.id !== undefined

// Write first (runs once, during server render on a direct visit)
const { data: writeResult } = await useAsyncData(`board-write-${word}-${groupId}`, async () => {
  if (!wantsWrite) return null
  if (!WORDS.includes(word)) return { error: `word must be one of: ${WORDS.join(', ')}` }
  if (!Number.isInteger(groupId) || groupId < 1) return { error: 'id must be a positive whole number' }

  const { data, error } = await supabase.rpc('add_board_word', { p_group_id: groupId, p_word: word })
  if (error) return { error: error.message }
  return { row: data }
})

// Then read the board
const { data: messages, pending, error, refresh } = await useAsyncData('board-messages', async () => {
  const { data, error } = await supabase
    .from('board_messages')
    .select('group_id, message, word_count, started_at, updated_at')
    .order('group_id', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})

const errorText = computed(() => {
  const e = error.value
  if (!e) return ''
  return e.data?.statusMessage || e.statusMessage || e.message || 'Unknown error'
})

// Clear the query so a reload does not add the word again
onMounted(() => {
  if (wantsWrite) router.replace({ path: '/board' })
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
      <code class="px-1 bg-gray-100 rounded">/board?word=hello&amp;id=1</code>
      or
      <code class="px-1 bg-gray-100 rounded">/board?word=world&amp;id=1</code>
    </p>

    <p
      v-if="writeResult?.row"
      class="mb-4 p-2 rounded bg-green-50 text-green-800 text-sm"
    >
      Added "{{ writeResult.row.word }}" to #{{ writeResult.row.group_id }}
    </p>
    <p
      v-else-if="writeResult?.error"
      class="mb-4 p-2 rounded bg-red-50 text-red-700 text-sm"
    >
      Not added: {{ writeResult.error }}
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