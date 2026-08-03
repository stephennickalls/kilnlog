<!-- app/pages/admin/feedback.vue -->
<!-- Admin-only feedback viewer. Mirrors /admin/logs: same gate, breadcrumb,
     and card styling. Filters by status/type, expand for full message,
     mark done / dismiss inline. -->
<template>
  <div v-if="isAdmin" class="min-h-screen bg-parchment font-serif">
    <header class="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-parchment-3">
      <div class="flex items-center gap-2 min-w-0">
        <NuxtLink to="/admin" class="text-base sm:text-lg font-bold flex items-center gap-2 text-ink hover:text-flame transition-colors shrink-0">🔥 KilnMonitor</NuxtLink>
        <span class="text-ink-faint shrink-0">/</span>
        <NuxtLink to="/admin" class="text-sm font-semibold text-ink-muted hover:text-ink shrink-0">Admin</NuxtLink>
        <span class="text-ink-faint shrink-0">/</span>
        <span class="text-sm font-semibold text-ink-muted truncate">Feedback</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-ghost !px-3 !py-1.5 !text-xs" :disabled="loading" @click="fetchFeedback">
          {{ loading ? 'Loading…' : '↻ Refresh' }}
        </button>
        <UserMenu />
      </div>
    </header>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2 mb-5">
        <div class="flex gap-1 bg-white border border-parchment-3 rounded-lg p-1">
          <button v-for="s in ['open', 'done', 'dismissed', 'all']" :key="s"
            class="px-3 py-1 text-xs font-bold rounded-md transition-colors capitalize"
            :class="statusFilter === s ? 'bg-flame text-parchment' : 'text-ink-muted hover:bg-parchment-2'"
            @click="statusFilter = s; fetchFeedback()"
          >{{ s }}</button>
        </div>
        <div class="flex gap-1 bg-white border border-parchment-3 rounded-lg p-1">
          <button v-for="t in ['all', 'bug', 'feature']" :key="t"
            class="px-3 py-1 text-xs font-bold rounded-md transition-colors capitalize"
            :class="typeFilter === t ? 'bg-flame text-parchment' : 'text-ink-muted hover:bg-parchment-2'"
            @click="typeFilter = t; fetchFeedback()"
          >{{ t }}</button>
        </div>
      </div>

      <p v-if="loadError" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 mb-4">{{ loadError }}</p>

      <div v-if="!loading && !items.length" class="text-center py-16 text-sm text-ink-muted">
        No feedback here. Quiet is good. 🌱
      </div>

      <ul v-else class="space-y-2">
        <li v-for="f in items" :key="f.id" class="rounded-xl border bg-white overflow-hidden" :class="f.type === 'bug' ? 'border-red-200' : 'border-celadon/40'">
          <button class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-parchment-2/40 transition-colors" @click="toggle(f.id)">
            <span class="shrink-0 mt-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full" :class="f.type === 'bug' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-celadon-bg text-celadon-dark border border-celadon/30'">
              {{ f.type === 'bug' ? '🐞 bug' : '💡 feature' }}
            </span>
            <span class="shrink-0 mt-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-parchment-2 text-ink-faint border border-parchment-3">{{ f.status }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-ink truncate">{{ f.message }}</p>
              <p class="text-xs text-ink-muted truncate mt-0.5">{{ f.email || f.user_id || 'unknown user' }}</p>
            </div>
            <span class="shrink-0 text-[11px] text-ink-faint tabular-nums mt-0.5">{{ formatTime(f.created_at) }}</span>
          </button>

          <div v-if="expanded.has(f.id)" class="border-t border-parchment-3 bg-parchment-2/30 px-4 py-3">
            <p class="text-sm text-ink whitespace-pre-wrap mb-3">{{ f.message }}</p>
            <p v-if="f.page" class="text-[11px] text-ink-faint">page: {{ f.page }}</p>
            <p v-if="f.context?.userAgent" class="text-[11px] text-ink-faint mt-0.5 break-all">ua: {{ f.context.userAgent }}</p>
            <p class="text-[11px] text-ink-faint mt-0.5">{{ new Date(f.created_at).toLocaleString() }} · {{ f.email || f.user_id }}</p>
            <div class="flex gap-2 mt-3">
              <button v-if="f.status !== 'done'" class="btn-primary !px-3 !py-1.5 !text-xs" @click="setStatus(f, 'done')">✓ Mark done</button>
              <button v-if="f.status !== 'dismissed'" class="btn-ghost !px-3 !py-1.5 !text-xs" @click="setStatus(f, 'dismissed')">Dismiss</button>
              <button v-if="f.status !== 'open'" class="btn-ghost !px-3 !py-1.5 !text-xs" @click="setStatus(f, 'open')">↺ Reopen</button>
            </div>
          </div>
        </li>
      </ul>

    </div>
  </div>
</template>

<script setup>
// app/pages/admin/feedback.vue
definePageMeta({ middleware: ['auth'] })

const supabase = useSupabaseClient()

// Same admin gate as /admin/logs — 404 for non-admins, no flash.
const isAdmin = ref(false)
async function gateAdmin() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return showError({ statusCode: 404, statusMessage: 'Page not found' })
  const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (error || data?.role !== 'admin') return showError({ statusCode: 404, statusMessage: 'Page not found' })
  isAdmin.value = true
}

const items        = ref([])
const loading      = ref(false)
const loadError    = ref('')
const statusFilter = ref('open')
const typeFilter   = ref('all')
const expanded     = ref(new Set())

async function fetchFeedback() {
  loading.value = true
  loadError.value = ''
  try {
    const q = new URLSearchParams()
    if (statusFilter.value !== 'all') q.set('status', statusFilter.value)
    if (typeFilter.value   !== 'all') q.set('type', typeFilter.value)
    items.value = await $fetch(`/api/feedback?${q.toString()}`)
  } catch (e) {
    loadError.value = e?.data?.statusMessage ?? e?.message ?? 'Could not load feedback.'
  } finally {
    loading.value = false
  }
}

async function setStatus(f, status) {
  try {
    await $fetch(`/api/feedback/${f.id}`, { method: 'PUT', body: { status } })
    f.status = status
    if (statusFilter.value !== 'all' && statusFilter.value !== status) {
      items.value = items.value.filter(i => i.id !== f.id)
    }
  } catch (e) {
    loadError.value = e?.data?.statusMessage ?? 'Could not update status.'
  }
}

function toggle(id) { const n = new Set(expanded.value); n.has(id) ? n.delete(id) : n.add(id); expanded.value = n }

function formatTime(iso) {
  const d = new Date(iso), now = new Date()
  return d.toDateString() === now.toDateString()
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

onMounted(async () => { await gateAdmin(); if (isAdmin.value) fetchFeedback() })
</script>