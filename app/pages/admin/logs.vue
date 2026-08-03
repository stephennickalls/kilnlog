<!-- app/pages/admin/logs.vue -->
<!-- Admin-only application logs viewer. Reads /api/logs (role-gated).
     ADMIN MOVE (Aug 2026): relocated from /logs to /admin/logs with a
     breadcrumb back to the admin landing page. Gains a 24h health strip
     (?stats=1) and a free-text search over the loaded rows. -->
<template>
  <div v-if="isAdmin" class="min-h-screen bg-parchment font-serif">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-parchment-3">
      <div class="flex items-center gap-2 min-w-0">
        <NuxtLink to="/admin" class="text-base sm:text-lg font-bold flex items-center gap-2 text-ink hover:text-flame transition-colors shrink-0"><BrandFlame class="w-5 h-5 sm:w-6 sm:h-6" />KilnMonitor</NuxtLink>
        <span class="text-ink-faint shrink-0">/</span>
        <NuxtLink to="/admin" class="text-sm font-semibold text-ink-muted hover:text-ink shrink-0">Admin</NuxtLink>
        <span class="text-ink-faint shrink-0">/</span>
        <span class="text-sm font-semibold text-ink-muted truncate">Logs</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="btn-ghost !px-3 !py-1.5 !text-xs" :disabled="loading" @click="reload">
          {{ loading ? 'Loading…' : '↻ Refresh' }}
        </button>
        <UserMenu />
      </div>
    </header>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-6">

      <!-- 24h health strip -->
      <div v-if="stats" class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <div class="rounded-xl border bg-white px-4 py-3" :class="stats.day.errors ? 'border-red-200' : 'border-parchment-3'">
          <p class="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Errors · 24h</p>
          <p class="text-2xl font-bold tabular-nums" :class="stats.day.errors ? 'text-red-600' : 'text-celadon-dark'">{{ stats.day.errors }}</p>
          <p class="text-[11px] text-ink-faint">{{ stats.week.errors }}{{ stats.sampled ? '+' : '' }} this week</p>
        </div>
        <div class="rounded-xl border border-parchment-3 bg-white px-4 py-3">
          <p class="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Warns · 24h</p>
          <p class="text-2xl font-bold tabular-nums text-amber-600">{{ stats.day.warns }}</p>
          <p class="text-[11px] text-ink-faint">{{ stats.week.warns }}{{ stats.sampled ? '+' : '' }} this week</p>
        </div>
        <div class="rounded-xl border border-parchment-3 bg-white px-4 py-3">
          <p class="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Client errors · 24h</p>
          <p class="text-2xl font-bold tabular-nums text-ink">{{ stats.day.client }}</p>
          <p class="text-[11px] text-ink-faint">browser-side captures</p>
        </div>
        <div class="rounded-xl border border-parchment-3 bg-white px-4 py-3">
          <p class="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Last error</p>
          <p class="text-sm font-bold text-ink mt-1.5">{{ stats.last_error_at ? formatTime(stats.last_error_at) : 'none this week 🌱' }}</p>
        </div>
      </div>

      <!-- Top error events (24h) -->
      <div v-if="stats?.top_errors_24h?.length" class="mb-5 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3">
        <p class="text-[10px] font-bold uppercase tracking-wide text-red-400 mb-1.5">Loudest errors · 24h</p>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="t in stats.top_errors_24h"
            :key="t.event"
            class="px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-red-200 text-red-700 hover:bg-red-100 transition-colors"
            @click="search = t.event"
          >{{ t.event }} × {{ t.count }}</button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap items-center gap-2 mb-4">
        <div class="flex items-center rounded-lg border border-parchment-3 bg-parchment-2 p-0.5">
          <button
            v-for="lvl in ['all','error','warn','info']" :key="lvl"
            class="px-3 py-1 text-xs font-bold rounded-md transition-colors capitalize"
            :class="levelFilter === lvl ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'"
            @click="setLevel(lvl)"
          >{{ lvl }}</button>
        </div>
        <div class="flex items-center rounded-lg border border-parchment-3 bg-parchment-2 p-0.5">
          <button
            v-for="src in ['all','server','client']" :key="src"
            class="px-3 py-1 text-xs font-bold rounded-md transition-colors capitalize"
            :class="sourceFilter === src ? 'bg-white text-ink shadow-sm' : 'text-ink-faint hover:text-ink'"
            @click="setSource(src)"
          >{{ src }}</button>
        </div>
        <input
          v-model="search"
          type="search"
          placeholder="Search event, message, user id…"
          class="flex-1 min-w-[180px] border border-parchment-3 rounded-lg px-3 py-1.5 text-xs text-ink bg-white focus:outline-none focus:ring-2 focus:ring-celadon/20 focus:border-celadon font-serif"
        >
        <span class="text-xs text-ink-faint">{{ shown.length }} shown</span>
      </div>

      <!-- Error state -->
      <div v-if="loadError" class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {{ loadError }}
      </div>

      <!-- Empty -->
      <div v-else-if="!loading && !shown.length" class="rounded-xl border border-parchment-3 bg-white px-4 py-10 text-center text-sm text-ink-muted">
        No logs match these filters. Quiet is good. 🌱
      </div>

      <!-- List -->
      <ul v-else class="space-y-2">
        <li
          v-for="log in shown" :key="log.id"
          class="rounded-xl border bg-white overflow-hidden transition-colors"
          :class="rowBorder(log.level)"
        >
          <button class="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-parchment-2/40 transition-colors" @click="toggle(log.id)">
            <span class="shrink-0 mt-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full" :class="levelPill(log.level)">{{ log.level }}</span>
            <span class="shrink-0 mt-0.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full bg-parchment-2 text-ink-faint border border-parchment-3">{{ log.source }}</span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold text-ink truncate">{{ log.event || '(no event)' }}</p>
              <p v-if="log.message" class="text-xs text-ink-muted truncate mt-0.5">{{ log.message }}</p>
            </div>
            <span class="shrink-0 text-[11px] text-ink-faint tabular-nums mt-0.5">{{ formatTime(log.created_at) }}</span>
          </button>

          <!-- Expanded context -->
          <div v-if="expanded.has(log.id)" class="border-t border-parchment-3 bg-parchment-2/30 px-4 py-3">
            <p v-if="log.message" class="text-sm text-ink mb-2">{{ log.message }}</p>
            <pre v-if="log.context" class="text-[11px] leading-relaxed text-ink-muted whitespace-pre-wrap break-words font-mono bg-white rounded-lg border border-parchment-3 p-3 overflow-x-auto">{{ pretty(log.context) }}</pre>
            <p v-if="log.user_id" class="text-[11px] text-ink-faint mt-2">user: {{ log.user_id }}</p>
            <p class="text-[11px] text-ink-faint mt-1">{{ new Date(log.created_at).toLocaleString() }}</p>
          </div>
        </li>
      </ul>

      <!-- Load more -->
      <div v-if="logs.length >= limit && !loading" class="text-center mt-4">
        <button class="btn-ghost !px-4 !py-2 !text-xs" @click="loadMore">Load older</button>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['auth'] })

const supabase = useSupabaseClient()

// Admin gate. Role lives server-side on profiles; we read it for the current
// user (same direct-profile read account.vue uses). Non-admins — and anyone not
// logged in — get a real 404, so the logs UI never renders for them. `isAdmin`
// stays false until confirmed, so nothing flashes during the check.
const isAdmin = ref(false)

async function gateAdmin() {
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user) return showError({ statusCode: 404, statusMessage: 'Page not found' })

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || data?.role !== 'admin') {
    return showError({ statusCode: 404, statusMessage: 'Page not found' })
  }
  isAdmin.value = true
}

const logs        = ref([])
const stats       = ref(null)
const loading     = ref(false)
const loadError   = ref('')
const levelFilter = ref('all')
const sourceFilter= ref('all')
const search      = ref('')
const limit       = ref(100)
const expanded    = ref(new Set())

async function fetchLogs() {
  loading.value = true
  loadError.value = ''
  try {
    const q = new URLSearchParams()
    q.set('limit', String(limit.value))
    if (levelFilter.value  !== 'all') q.set('level',  levelFilter.value)
    if (sourceFilter.value !== 'all') q.set('source', sourceFilter.value)

    // Patched $fetch attaches the Bearer token — no manual header needed.
    logs.value = await $fetch(`/api/logs?${q.toString()}`)
  } catch (e) {
    if (e?.statusCode === 403) loadError.value = 'Admin access required.'
    else loadError.value = e?.data?.statusMessage ?? e?.message ?? 'Could not load logs.'
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    stats.value = await $fetch('/api/logs?stats=1')
  } catch {
    stats.value = null   // strip just doesn't render; rows still work
  }
}

function reload()        { limit.value = 100; fetchLogs(); fetchStats() }
function loadMore()      { limit.value += 100; fetchLogs() }
function setLevel(l)     { levelFilter.value = l; reload() }
function setSource(s)    { sourceFilter.value = s; reload() }
function toggle(id)      { const n = new Set(expanded.value); n.has(id) ? n.delete(id) : n.add(id); expanded.value = n }

function pretty(ctx)     { try { return JSON.stringify(ctx, null, 2) } catch { return String(ctx) } }

// Free-text search over the loaded rows (event, message, user id, context).
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return logs.value
  return logs.value.filter(l =>
    (l.event ?? '').toLowerCase().includes(q) ||
    (l.message ?? '').toLowerCase().includes(q) ||
    (l.user_id ?? '').toLowerCase().includes(q) ||
    JSON.stringify(l.context ?? '').toLowerCase().includes(q))
})

function formatTime(iso) {
  const d = new Date(iso), now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function levelPill(level) {
  return {
    error: 'bg-red-100 text-red-700',
    warn:  'bg-amber-100 text-amber-700',
    info:  'bg-blue-100 text-blue-700',
  }[level] ?? 'bg-parchment-2 text-ink-faint'
}
function rowBorder(level) {
  return {
    error: 'border-red-200',
    warn:  'border-amber-200',
    info:  'border-parchment-3',
  }[level] ?? 'border-parchment-3'
}

onMounted(async () => {
  await gateAdmin()   // throws 404 for non-admins before anything renders
  await Promise.all([fetchLogs(), fetchStats()])
})
</script>