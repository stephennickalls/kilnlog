<!-- app/pages/admin/users.vue -->
<!--
  ADMIN USERS (Aug 2026): every user with usage + auth stats. Search matches
  email or name; status chips filter; sort select reorders. All client-side —
  one fetch, beta-scale data. Row surfaces the signals that matter during
  beta: has the person even signed in, are they actually firing, and when were
  they last active.

  EDITING (Aug 2026): role and subscription status are now changeable inline,
  via PATCH /api/admin/users/:id. Changes save on select — no Save button —
  because a single field with an immediate, reversible effect does not need a
  commit step. The row updates optimistically and rolls back if the server
  says no.

  Two rules the server enforces and the UI mirrors, so the reason is visible
  before the click rather than as an error after it:
    - You cannot change your own role (the self row's control is disabled).
    - The last admin cannot be demoted.

  ADMINS ARE NOT COUNTED AS USERS. hasAccess() returns true for admins
  regardless of subscription_status, so their status is inert — the row says
  so, and the footer counts them separately from the customer total.

  DEMO FIRINGS (Aug 2026): "FIRING NOW" was true for a demo firing as well as
  a real one, so a tester who loaded a demo and never deleted it looked like an
  active potter forever. The badge now distinguishes them: flame and static for
  a demo (nothing is actually in a kiln), pulsing green for a real firing.
  live_firing_is_demo comes from /api/admin/users, which merges it in from the
  firings table.

  Notices are a local banner rather than useToast: the toast host lives in
  app.vue and is not mounted on admin pages, so a toast here would be
  silently swallowed.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <AppNav :crumbs="[{ label: 'Admin', to: '/admin' }, { label: 'Users' }]" container="max-w-5xl">
      <template #actions>
        <button class="btn-ghost !px-3 !py-1.5 !text-xs shrink-0" :disabled="loading" @click="load">
          {{ loading ? '…' : '↻' }}
        </button>
      </template>
    </AppNav>

    <div class="max-w-5xl mx-auto px-4 sm:px-6 py-5">

      <!-- Save feedback -->
      <p
        v-if="notice"
        class="mb-4 text-sm rounded-lg px-3.5 py-2.5 border"
        :class="noticeType === 'error'
          ? 'text-red-600 bg-red-50 border-red-200'
          : 'text-celadon-dark bg-celadon-bg border-celadon/30'"
      >{{ notice }}</p>

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
                <span v-if="u.id === selfId" class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-parchment-2 text-ink-faint border border-parchment-3">YOU</span>

                <!-- A demo holds the active slot exactly like a real firing, so
                     it must not read as one: flame, and no pulse, because
                     nothing is actually happening in a kiln. -->
                <span
                  v-if="u.live_firing"
                  class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border"
                  :class="u.live_firing_is_demo
                    ? 'bg-flame-bg text-flame border-flame/30'
                    : 'bg-celadon-bg text-celadon-dark border-celadon/30'"
                  :title="u.live_firing_is_demo
                    ? 'Demo firing left running - it holds the active slot until deleted'
                    : 'Real firing in progress'"
                >
                  <span
                    class="w-1.5 h-1.5 rounded-full"
                    :class="u.live_firing_is_demo ? 'bg-flame' : 'bg-green-500 animate-pulse'"
                  />
                  {{ u.live_firing_is_demo ? 'DEMO FIRING' : 'FIRING NOW' }}
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

          <!-- Access controls -->
          <div class="mt-3 pt-3 border-t border-parchment-3 flex flex-wrap items-end gap-x-4 gap-y-2.5">

            <div class="min-w-0">
              <label class="stat-label block mb-1" :for="`role-${u.id}`">Role</label>
              <select
                :id="`role-${u.id}`"
                class="input !py-1.5 !w-auto !text-xs"
                :value="u.role || 'user'"
                :disabled="u.id === selfId || saving === u.id"
                :title="u.id === selfId ? 'You cannot change your own role' : ''"
                @change="setRole(u, $event.target.value)"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div class="min-w-0">
              <label class="stat-label block mb-1" :for="`status-${u.id}`">Status</label>
              <select
                :id="`status-${u.id}`"
                class="input !py-1.5 !w-auto !text-xs"
                :value="u.subscription_status || 'trialing'"
                :disabled="saving === u.id"
                @change="setStatus(u, $event.target.value)"
              >
                <option v-for="s in editableStatuses" :key="s.value" :value="s.value">{{ s.label }}</option>
              </select>
            </div>

            <button
              v-if="u.role !== 'admin' && u.subscription_status === 'trialing'"
              class="text-xs font-semibold text-flame hover:underline disabled:opacity-50 pb-1.5"
              :disabled="saving === u.id"
              @click="extendTrial(u)"
            >Reset trial to 1 year</button>

            <p v-if="u.role === 'admin'" class="text-xs text-ink-faint pb-1.5">
              Admins keep full access regardless of status.
            </p>

            <span v-if="saving === u.id" class="pb-1.5 w-4 h-4 border-2 border-parchment-3 border-t-flame rounded-full animate-spin"/>
          </div>
        </li>
      </ul>

      <p v-if="!loading && !loadError" class="text-xs text-ink-faint mt-3">
        {{ filtered.length }} shown · {{ userCount }} users · {{ adminCount }} admin
        <template v-if="demoFiringCount"> · {{ demoFiringCount }} demo firing{{ demoFiringCount === 1 ? '' : 's' }} still running</template>
      </p>
    </div>
  </div>
</template>

<script setup>
// app/pages/admin/users.vue
definePageMeta({ middleware: 'auth' })

const supabase = useSupabaseClient()

const users     = ref([])
const loading   = ref(true)
const loadError = ref('')
const saving    = ref(null)      // id of the row currently writing
const notice    = ref('')
const noticeType = ref('success')
const selfId    = ref(null)      // to disable self role editing

const search       = ref('')
const statusFilter = ref('all')
const sortKey      = ref('last_sign_in_at')

const statusFilters = [
  { key: 'all',      label: 'All' },
  { key: 'beta',     label: 'Beta' },
  { key: 'trialing', label: 'Trialing' },
  { key: 'active',   label: 'Active' },
  { key: 'admin',    label: 'Admins' },
  { key: 'never',    label: 'Never signed in' },
  { key: 'lapsed',   label: 'Lapsed' },
]

// Must match STATUSES in server/api/admin/users/[id].patch.js.
const editableStatuses = [
  { value: 'trialing', label: 'Trialing' },
  { value: 'beta',     label: 'Beta' },
  { value: 'active',   label: 'Active' },
  { value: 'past_due', label: 'Past due' },
  { value: 'canceled', label: 'Canceled' },
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

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  selfId.value = session?.user?.id ?? null
  await load()
})

function say(msg, type = 'success') {
  notice.value = msg
  noticeType.value = type
}

// Single write path. Applies the change optimistically, rolls the row back on
// failure, and reports what the server said rather than a generic message —
// "Cannot demote the last admin" is the useful sentence, not "Update failed".
async function patchUser(u, body, applied, describe) {
  const before = { role: u.role, subscription_status: u.subscription_status, trial_ends_at: u.trial_ends_at }
  Object.assign(u, applied)
  saving.value = u.id
  notice.value = ''
  try {
    const updated = await $fetch(`/api/admin/users/${u.id}`, { method: 'PATCH', body })
    u.role                = updated.role
    u.subscription_status = updated.subscription_status
    u.trial_ends_at       = updated.trial_ends_at
    say(describe(updated))
  } catch (err) {
    Object.assign(u, before)
    say(err?.data?.statusMessage ?? 'Could not save that change.', 'error')
  } finally {
    saving.value = null
  }
}

function setRole(u, role) {
  if (role === u.role) return
  patchUser(u, { role }, { role }, up => `${up.email} is now ${up.role === 'admin' ? 'an admin' : 'a user'}.`)
}

function setStatus(u, subscriptionStatus) {
  if (subscriptionStatus === u.subscription_status) return
  patchUser(
    u,
    { subscriptionStatus },
    { subscription_status: subscriptionStatus },
    up => `${up.email} set to ${up.subscription_status.replace('_', ' ')}.`,
  )
}

function extendTrial(u) {
  patchUser(u, { trialDays: 365 }, {}, up => `${up.email} trial runs to ${new Date(up.trial_ends_at).toLocaleDateString('en-NZ')}.`)
}

function statusLabel(u) {
  const s = u.subscription_status
  if (u.role === 'admin') return 'Admin access'
  if (s === 'beta') return 'Beta'
  if (s === 'active') return 'Active'
  if (s === 'trialing') {
    return u.trial_ends_at && new Date(u.trial_ends_at) > new Date() ? 'Trialing' : 'Trial ended'
  }
  return s ? s.replace('_', ' ') : 'No profile'
}

function statusClass(u) {
  const label = statusLabel(u)
  if (label === 'Admin access') return 'bg-ink text-parchment border-ink'
  if (label === 'Beta')     return 'bg-cobalt-bg text-cobalt-dark border-cobalt/30'
  if (label === 'Active')   return 'bg-celadon-bg text-celadon-dark border-celadon/30'
  if (label === 'Trialing') return 'bg-flame-bg text-flame border-flame/30'
  return 'bg-parchment-2 text-ink-faint border-parchment-3'
}

function isLapsed(u) {
  if (u.role === 'admin') return false      // admins never expire
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

// Staff are not customers: the headline number counts non-admins only, and
// matches /api/admin/stats (and public.beta_slots_used) by construction.
const adminCount = computed(() => users.value.filter(u => u.role === 'admin').length)
const userCount  = computed(() => users.value.length - adminCount.value)

// Worth a footer number: an abandoned demo blocks that person from starting a
// real firing, so a rising count is a support signal, not trivia.
const demoFiringCount = computed(() =>
  users.value.filter(u => u.live_firing && u.live_firing_is_demo).length
)

const filtered = computed(() => {
  let list = users.value

  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter(u =>
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.full_name ?? '').toLowerCase().includes(q))
  }

  if (statusFilter.value === 'never')       list = list.filter(u => !u.last_sign_in_at)
  else if (statusFilter.value === 'lapsed') list = list.filter(isLapsed)
  else if (statusFilter.value === 'admin')  list = list.filter(u => u.role === 'admin')
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
.input { @apply w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-celadon/20 focus:border-celadon font-serif disabled:opacity-50 disabled:cursor-not-allowed; }
.stat-label { @apply text-[10px] font-bold uppercase tracking-wide text-ink-faint; }
.stat-value { @apply text-sm font-semibold text-ink; }
</style>