<!-- app/pages/admin/announcements.vue -->
<!--
  ANNOUNCEMENTS (Aug 2026): admin management page — list every banner with its
  computed status (Scheduled / Live / Ended / Stopped) and dismissal count,
  plus create, edit, stop/restart, duplicate, delete. The server enforces
  admin (403); this page just also hides itself from non-admins.
  Editing a live banner does not reset dismissals; Duplicate exists for
  "re-notify everyone" (stop the old, tweak the copy, go).
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <header class="sticky top-0 z-20 bg-parchment/95 backdrop-blur border-b border-parchment-3">
      <div class="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div class="flex items-center gap-3 min-w-0">
          <NuxtLink to="/app" class="text-base sm:text-lg font-bold flex items-center gap-2 text-ink tracking-tight hover:text-flame transition-colors shrink-0"><BrandFlame class="w-5 h-5 sm:w-6 sm:h-6" />KilnMonitor</NuxtLink>
          <span class="text-parchment-4 shrink-0">/</span>
          <h1 class="text-base sm:text-lg font-bold text-ink tracking-tight truncate">Announcements</h1>
        </div>
        <button class="btn-primary !py-2" @click="openCreate">+ New announcement</button>
      </div>
    </header>

    <div class="max-w-4xl mx-auto px-4 sm:px-6 py-6">

      <div v-if="loading" class="flex justify-center py-16">
        <div class="w-7 h-7 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"/>
      </div>

      <div v-else-if="loadError" class="text-center py-16 flex flex-col items-center gap-3">
        <p class="text-sm text-ink-muted">{{ loadError }}</p>
        <button class="text-sm text-flame font-semibold" @click="load">Try again</button>
      </div>

      <p v-else-if="!items.length" class="text-center text-sm text-ink-muted py-16">
        No announcements yet. Create one to notify your beta testers.
      </p>

      <ul v-else class="flex flex-col gap-3">
        <li
          v-for="a in items"
          :key="a.id"
          class="bg-white border border-parchment-3 rounded-2xl px-5 py-4"
          style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        >
          <div class="flex items-start gap-3">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="px-2 py-0.5 rounded-full text-[11px] font-bold border" :class="statusClass(a)">{{ statusLabel(a) }}</span>
                <p class="text-sm font-bold text-ink truncate">{{ a.title || '(no title)' }}</p>
              </div>
              <p class="text-sm text-ink-muted mt-1 leading-relaxed">{{ a.message }}</p>
              <p class="text-xs text-ink-faint mt-1.5">
                {{ fmt(a.starts_at) }} → {{ fmt(a.ends_at) }}
                · dismissed by {{ a.dismissal_count }}
                <template v-if="a.link_url"> · <a :href="a.link_url" target="_blank" rel="noopener" class="text-flame hover:underline">link</a></template>
              </p>
            </div>
            <div class="flex flex-col sm:flex-row gap-1.5 shrink-0">
              <button class="btn-ghost !px-3 !py-1.5 !text-xs" @click="openEdit(a)">Edit</button>
              <button class="btn-ghost !px-3 !py-1.5 !text-xs" @click="duplicate(a)">Duplicate</button>
              <button
                v-if="a.active"
                class="btn-ghost !px-3 !py-1.5 !text-xs !border-amber-300 !text-amber-700 hover:!bg-amber-50"
                @click="setActive(a, false)"
              >Stop</button>
              <button
                v-else
                class="btn-ghost !px-3 !py-1.5 !text-xs"
                @click="setActive(a, true)"
              >Restart</button>
              <button class="btn-danger !px-3 !py-1.5 !text-xs" @click="remove(a)">Delete</button>
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Create / edit modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center px-0 sm:px-4" style="background:rgba(26,18,8,0.6)" @click.self="closeModal">
        <div class="bg-parchment w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl p-5 sm:p-6 flex flex-col gap-3 border border-parchment-3" style="box-shadow:0 -8px 40px rgba(26,18,8,0.15)">
          <h2 class="text-base font-bold text-ink">{{ editing ? 'Edit announcement' : 'New announcement' }}</h2>

          <div class="flex flex-col gap-1">
            <label class="label">Title <span class="normal-case tracking-normal font-medium text-ink-faint">(optional)</span></label>
            <input v-model="form.title" maxlength="120" class="input" placeholder="Cone drops are here!">
          </div>

          <div class="flex flex-col gap-1">
            <label class="label">Message</label>
            <textarea v-model="form.message" rows="3" maxlength="500" class="input !py-2 resize-y leading-relaxed" placeholder="What changed and why testers should care…"/>
          </div>

          <div class="flex flex-col gap-1">
            <label class="label">Link <span class="normal-case tracking-normal font-medium text-ink-faint">(optional)</span></label>
            <input v-model="form.link_url" maxlength="500" class="input" placeholder="https://…">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="label">Starts</label>
              <input v-model="form.starts_at" type="datetime-local" class="input">
            </div>
            <div class="flex flex-col gap-1">
              <label class="label">Ends</label>
              <input v-model="form.ends_at" type="datetime-local" class="input">
            </div>
          </div>

          <p v-if="formError" class="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{{ formError }}</p>

          <div class="flex justify-end gap-2 mt-1">
            <button class="btn-ghost !py-2" :disabled="saving" @click="closeModal">Cancel</button>
            <button class="btn-primary !py-2" :disabled="saving" @click="save">
              {{ saving ? 'Saving…' : (editing ? 'Save changes' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
// app/pages/admin/announcements.vue
definePageMeta({ middleware: 'auth' })

const items     = ref([])
const loading   = ref(true)
const loadError = ref('')

const showModal = ref(false)
const editing   = ref(null)     // announcement being edited, or null = create
const saving    = ref(false)
const formError = ref('')
const form      = ref(blankForm())

function blankForm() {
  const now = new Date()
  const week = new Date(now.getTime() + 7 * 86400000)
  return {
    title: '',
    message: '',
    link_url: '',
    starts_at: toLocalInput(now),
    ends_at:   toLocalInput(week),
  }
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in LOCAL time.
function toLocalInput(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

function fmt(iso) {
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function statusLabel(a) {
  const now = new Date()
  if (!a.active) return 'Stopped'
  if (new Date(a.starts_at) > now) return 'Scheduled'
  if (new Date(a.ends_at) < now) return 'Ended'
  return 'Live'
}

function statusClass(a) {
  const s = statusLabel(a)
  if (s === 'Live')      return 'bg-celadon-bg text-celadon-dark border-celadon/30'
  if (s === 'Scheduled') return 'bg-cobalt-bg text-cobalt-dark border-cobalt/30'
  if (s === 'Stopped')   return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-parchment-2 text-ink-faint border-parchment-3'
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    items.value = await $fetch('/api/admin/announcements')
  } catch (err) {
    loadError.value = err?.status === 403
      ? 'Admins only.'
      : (err?.data?.statusMessage ?? 'Could not load announcements.')
  } finally {
    loading.value = false
  }
}
onMounted(load)

function openCreate() {
  editing.value = null
  form.value = blankForm()
  formError.value = ''
  showModal.value = true
}

function openEdit(a) {
  editing.value = a
  form.value = {
    title:     a.title ?? '',
    message:   a.message,
    link_url:  a.link_url ?? '',
    starts_at: toLocalInput(new Date(a.starts_at)),
    ends_at:   toLocalInput(new Date(a.ends_at)),
  }
  formError.value = ''
  showModal.value = true
}

function duplicate(a) {
  editing.value = null
  form.value = {
    title:     a.title ?? '',
    message:   a.message,
    link_url:  a.link_url ?? '',
    ...(({ starts_at, ends_at }) => ({ starts_at, ends_at }))(blankForm()),
  }
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  if (!saving.value) showModal.value = false
}

async function save() {
  formError.value = ''
  const body = {
    title:     form.value.title,
    message:   form.value.message,
    link_url:  form.value.link_url,
    starts_at: form.value.starts_at ? new Date(form.value.starts_at).toISOString() : undefined,
    ends_at:   form.value.ends_at ? new Date(form.value.ends_at).toISOString() : undefined,
  }
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/admin/announcements/${editing.value.id}`, { method: 'PUT', body })
    } else {
      await $fetch('/api/admin/announcements', { method: 'POST', body })
    }
    showModal.value = false
    await load()
  } catch (err) {
    formError.value = err?.data?.statusMessage ?? 'Could not save.'
  } finally {
    saving.value = false
  }
}

async function setActive(a, active) {
  try {
    await $fetch(`/api/admin/announcements/${a.id}`, { method: 'PUT', body: { active } })
    await load()
  } catch (err) {
    loadError.value = err?.data?.statusMessage ?? 'Could not update.'
  }
}

async function remove(a) {
  if (!confirm(`Delete "${a.title || a.message.slice(0, 40)}"? This cannot be undone.`)) return
  try {
    await $fetch(`/api/admin/announcements/${a.id}`, { method: 'DELETE' })
    await load()
  } catch (err) {
    loadError.value = err?.data?.statusMessage ?? 'Could not delete.'
  }
}
</script>

<style>
.btn-primary { @apply px-4 py-1.5 bg-celadon hover:bg-celadon-dark text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed; }
.btn-danger  { @apply px-4 py-1.5 border border-red-300 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors; }
.btn-ghost   { @apply px-4 py-1.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-medium rounded-lg transition-colors; }
.input       { @apply w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-celadon/20 focus:border-celadon font-serif; }
.label       { @apply text-xs font-bold uppercase tracking-widest text-ink-faint; }
</style>