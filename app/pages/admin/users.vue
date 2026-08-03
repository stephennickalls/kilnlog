<!-- app/pages/admin/users.vue -->
<!--
  ADMIN USERS (Aug 2026): every user with usage + auth stats. Search matches
  email or name; status chips filter; sort select reorders. All client-side —
  one fetch, beta-scale data. Row surfaces the signals that matter during
  beta: has the person even signed in, are they actually firing, and when were
  they last active.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <header class="sticky top-0 z-20 bg-parchment/95 backdrop-blur border-b border-parchment-3">
      <div class="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div class="flex items-center gap-3 min-w-0">
          <NuxtLink to="/admin" class="text-base sm:text-lg font-bold flex items-center gap-2 text-ink tracking-tight hover:text-flame transition-colors shrink-0"><BrandFlame class="w-5 h-5 sm:w-6 sm:h-6" />KilnMonitor</NuxtLink>
          <span class="text-parchment-4 shrink-0">/</span>
          <NuxtLink to="/admin" class="text-sm font-semibold text-ink-muted hover:text-ink shrink-0">Admin</NuxtLink>
          <span class="text-parchment-4 shrink-0">/</span>
          <h1 class="text-base sm:text-lg font-bold text-ink tracking-tight truncate">Users</h1>
        </div>
      </div>
    </header>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-5">

      <!-- Controls -->
      <div class="flex flex-col sm:flex-row gap-2.5 sm:items-center mb-4">
        <input
          v-model="search"
          type="search"
          placeholder="Search email or name…"
          class="input sm:max-w-xs !py-2"
        >
        <div class="flex gap-1.5 flex-wrap">
          <button
            v-for="s in statusFilters"
            :key="s.key"
            class="px-3 py-1.5 rounded-full text-xs font-bold border transition-colors"
            :class="statusFilter === s.key
              ? 'bg-ink text-parchment border-ink'
              : 'bg-white text-ink-muted border-parchment-3 hover:bg-parchment-2'"
            @click="statusFilter = s.key"
          >{{ s.label }}</button>
        </div>
        <div class="sm:ml-auto flex items-center gap-2">
          <label class="text-xs font-bold uppercase tracking-widest text-ink-faint shrink-0">Sort</label>
          <select v-model="sortKey" class="input !py-2 !w-auto">
            <option value="last_sign_in_at">Last sign-in</option>
            <option value="last_reading_at">Last activity</option>
            <option value="firing_count">Firings</option>
            <option value="reading_count">Readings</option>
            <option value="signed_up_at">Signed up</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-16">
        <div class="w-7 h-7 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"/>
      </div>

      <div v-else-if="loadError" class="text-center py-16 flex flex-col items-center gap-3">
        <p class="text-sm text-ink-muted">{{ loadError }}</p>
        <button class="text-sm text-flame font-semibold" @click="load">Try again</button>
      </div>

      <p v-else-if="!filtered.length" class="text-center text-sm text-ink-muted py-16">
        No users match.
      </p>

      <!-- User cards -->
      <ul v-else class="flex flex-col gap-2.5">
        <li
          v-for="u in filtered"
          :key="u.id"
          class="bg-white border border-parchment-3 rounded-2xl px-4 sm:px-5 py-3.5"
          style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        >
          <div class="flex items-start sm:items-center gap-3 flex-col sm:flex-row">

            <!-- Identity -->
            <div class="min-w-0 sm:w-64 shrink-0">
              <div class="flex items-center gap-1.5 flex-wrap">
                <p class="text-sm font-bold text-ink truncate">{{ u.full_name || '—' }}</p>
                <span v-if="u.role === 'admin'" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-ink text-parchment">ADMIN</span>
                <span v-if="u.live_firing" class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-celadon-bg text-celadon-dark border border-celadon/30">
                  <span class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>FIRING NOW
                </span>
              </div>
              <p class="text-xs text-ink-muted truncate">{{ u.email }}</p>
              <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border" :class="statusClass(u)">{{ statusLabel(u) }}</span>
            </div>

            <!-- Stats -->
            <div class="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5 w-full">
              <div>
                <p class="stat-label">Last sign-in</p>
                <p class="stat-value" :class="{ 'text-red-500': !u.last_sign_in_at }">{{ ago(u.last_sign_in_at) }}</p>
              </div>
              <div>
                <p class="stat-label">Last reading</p>
                <p class="stat-value">{{ ago(u.last_reading_at) }}</p>
              </div>
              <div>
                <p class="stat-label">Firings</p>
                <p class="stat-value tabular-nums">{{ u.firing_count }} <span class="text-ink-faint font-medium">/ {{ u.reading_count }} readings</span></p>
              </div>
              <div>
                <p class="stat-label">Schedules · cones</p>
                <p class="stat-value tabular-nums">{{ u.schedule_count }} · {{ u.cone_drop_count }}</p>
              </div>
            </div>

          </div>
        </li>
      </ul>

      <p v-if="!loading && !loadError" class="text-xs text-ink-faint mt-3">
        {{ filtered.length }} of {{ users.length }} users
      </p>
    </div>
  </div>
</template>

<script setup>
// app/pages/admin/users.vue
definePageMeta({ middleware: 'auth' })

const users     = ref([])
const loading   = ref(true)
const loadError = ref('')

const search       = ref('')
const statusFilter = ref('all')
const sortKey      = ref('last_sign_in_at')

const statusFilters = [
  { key: 'all',      label: 'All' },
  { key: 'beta',     label: 'Beta' },
  { key: 'trialing', label: 'Trialing' },
  { key: 'active',   label: 'Active' },
  { key: 'never',    label: 'Never signed in' },
  { key: 'lapsed',   label: 'Lapsed' },
]

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    users.value = await $fetch('/api/admin/users')
  } catch (err) {
    loadError.value = err?.status === 403
      ? 'Admins only.'
      : (err?.data?.statusMessage ?? 'Could not load users.')
  } finally {
    loading.value = false
  }
}
onMounted(load)

function statusLabel(u) {
  const s = u.subscription_status
  if (s === 'beta') return 'Beta'
  if (s === 'active') return 'Active'
  if (s === 'trialing') {
    return u.trial_ends_at && new Date(u.trial_ends_at) > new Date() ? 'Trialing' : 'Trial ended'
  }
  return s ? s.replace('_', ' ') : 'No profile'
}

function statusClass(u) {
  const label = statusLabel(u)
  if (label === 'Beta')     return 'bg-cobalt-bg text-cobalt-dark border-cobalt/30'
  if (label === 'Active')   return 'bg-celadon-bg text-celadon-dark border-celadon/30'
  if (label === 'Trialing') return 'bg-flame-bg text-flame border-flame/30'
  return 'bg-parchment-2 text-ink-faint border-parchment-3'
}

function isLapsed(u) {
  const s = u.subscription_status
  if (s === 'beta' || s === 'active') return false
  if (s === 'trialing') return !u.trial_ends_at || new Date(u.trial_ends_at) <= new Date()
  return true
}

function ago(iso) {
  if (!iso) return 'never'
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 31) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const filtered = computed(() => {
  let list = users.value

  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(u =>
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q))
  }

  if (statusFilter.value === 'never')      list = list.filter(u => !u.last_sign_in_at)
  else if (statusFilter.value === 'lapsed') list = list.filter(isLapsed)
  else if (statusFilter.value !== 'all')    list = list.filter(u => u.subscription_status === statusFilter.value)

  const k = sortKey.value
  const numeric = k === 'firing_count' || k === 'reading_count'
  return [...list].sort((a, b) => {
    if (numeric) return (b[k] ?? 0) - (a[k] ?? 0)
    const av = a[k] ? new Date(a[k]).getTime() : 0
    const bv = b[k] ? new Date(b[k]).getTime() : 0
    return bv - av
  })
})
</script>

<style scoped>
.input { @apply w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-celadon/20 focus:border-celadon font-serif; }
.stat-label { @apply text-[10px] font-bold uppercase tracking-wide text-ink-faint; }
.stat-value { @apply text-sm font-semibold text-ink; }
</style>