<!-- app/pages/sensors.vue -->
<template>
  <div class="min-h-screen bg-parchment font-serif flex flex-col" :class="connectedSensor ? 'lg:flex-row' : ''">

    <!-- ── Main content ─────────────────────────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-h-screen">

      <!-- Nav -->
      <header class="sticky top-0 z-40 bg-parchment/95 backdrop-blur border-b border-parchment-3 px-6 h-14 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/app" class="text-ink-faint hover:text-flame transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          </NuxtLink>
          <span class="text-sm font-bold text-ink tracking-tight">Sensors</span>
        </div>
        <button
          class="flex items-center gap-2 px-4 py-2 bg-flame text-parchment text-xs font-bold rounded-lg hover:bg-flame-dark transition-colors"
          @click="openAddModal"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
          Add sensor
        </button>
      </header>

      <!-- Body -->
      <main class="flex-1 px-6 py-8 max-w-2xl w-full mx-auto">

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-24">
          <svg class="w-6 h-6 text-flame animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
        </div>

        <!-- Empty state -->
        <div v-else-if="!sensors.length" class="flex flex-col items-center justify-center py-24 text-center gap-4">
          <div class="w-14 h-14 bg-flame-bg border border-parchment-3 rounded-2xl flex items-center justify-center">
            <svg class="w-7 h-7 text-flame" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18"/></svg>
          </div>
          <div>
            <p class="text-sm font-bold text-ink">No sensors yet</p>
            <p class="text-xs text-ink-muted mt-1">Add a sensor to start monitoring your kiln.</p>
          </div>
          <button
            class="px-5 py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors"
            @click="openAddModal"
          >
            Add your first sensor →
          </button>
        </div>

        <!-- Sensor list -->
        <div v-else class="flex flex-col gap-4">
          <div
            v-for="sensor in sensors"
            :key="sensor.id"
            class="bg-white border border-parchment-3 rounded-2xl overflow-hidden"
            style="box-shadow: 0 2px 12px rgba(58,30,8,0.06)"
          >
            <!-- Header row -->
            <div class="flex items-start justify-between px-5 pt-5 pb-3 gap-3">

              <!-- Name / edit -->
              <div class="flex-1 min-w-0">
                <div v-if="editingId !== sensor.id" class="flex items-center gap-2">
                  <p class="text-sm font-bold text-ink truncate">{{ sensor.name }}</p>
                  <button
                    class="p-1 rounded-md text-ink-faint hover:text-flame hover:bg-flame-bg transition-colors shrink-0"
                    @click="startEdit(sensor)"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
                <div v-else class="flex items-center gap-2">
                  <input
                    ref="nameInput"
                    v-model="editName"
                    type="text"
                    class="flex-1 border border-parchment-3 rounded-lg px-2.5 py-1 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
                    @keydown.enter="saveEdit(sensor)"
                    @keydown.escape="cancelEdit"
                  >
                  <button class="p-1.5 rounded-md bg-flame text-parchment hover:bg-flame-dark transition-colors" @click="saveEdit(sensor)">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                  </button>
                  <button class="p-1.5 rounded-md text-ink-muted hover:bg-parchment-2 transition-colors" @click="cancelEdit">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <p class="text-[11px] text-ink-faint mt-0.5">Added {{ formatDate(sensor.created_at) }}</p>
              </div>

              <!-- Status pill -->
              <div class="shrink-0 pt-0.5">
                <span
                  v-if="connectedSensor?.id === sensor.id"
                  class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-50 text-blue-600 border border-blue-200"
                >
                  <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"/>
                  Serial open
                </span>
                <span
                  v-else-if="sensorIsOnline(sensor)"
                  class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-green-50 text-green-700 border border-green-200"
                >
                  <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"/>
                  Online
                </span>
                <span
                  v-else
                  class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-parchment-2 text-ink-faint border border-parchment-3"
                >
                  <span class="w-1.5 h-1.5 bg-parchment-4 rounded-full"/>
                  Offline
                </span>
              </div>

            </div>

            <!-- Token row -->
            <div class="mx-5 mb-4 flex items-center gap-1.5 bg-parchment rounded-lg px-3 py-2 border border-parchment-3">
              <svg class="w-3 h-3 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <span class="font-mono text-[10px] text-ink-muted truncate flex-1">{{ masked(sensor.token) }}</span>
              <button
                class="text-[10px] font-semibold shrink-0 transition-colors"
                :class="copiedId === sensor.id ? 'text-green-600' : 'text-ink-faint hover:text-flame'"
                @click="copyToken(sensor)"
              >
                {{ copiedId === sensor.id ? 'Copied!' : 'Copy' }}
              </button>
            </div>

            <!-- Action row -->
            <div class="flex items-center gap-2 px-5 pb-4 flex-wrap">

              <!-- Serial connect/disconnect -->
              <button
                v-if="connectedSensor?.id === sensor.id"
                class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                @click="disconnectSerial"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M9.172 15.536a5 5 0 010-7.072M12 12h.01"/></svg>
                Disconnect
              </button>
              <button
                v-else
                class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-ink-muted bg-parchment border border-parchment-3 rounded-lg hover:bg-parchment-2 transition-colors"
                :disabled="!!connectedSensor && connectedSensor.id !== sensor.id"
                :class="!!connectedSensor && connectedSensor.id !== sensor.id ? 'opacity-40 cursor-not-allowed' : ''"
                @click="connectSerial(sensor)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Serial
              </button>

              <!-- Flash link -->
              <NuxtLink
                :to="`/sensor-setup?sensorId=${sensor.id}&sensorName=${encodeURIComponent(sensor.name)}&token=${sensor.token}`"
                class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-parchment bg-flame rounded-lg hover:bg-flame-dark transition-colors"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                Flash
              </NuxtLink>

              <!-- Delete -->
              <div class="ml-auto">
                <button
                  v-if="confirmDeleteId !== sensor.id"
                  class="p-2 rounded-lg text-parchment-4 hover:text-red-400 hover:bg-red-50 transition-colors"
                  @click="confirmDeleteId = sensor.id"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
                <div v-else class="flex items-center gap-1.5">
                  <span class="text-xs text-ink-muted">Sure?</span>
                  <button
                    class="px-2.5 py-1.5 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                    @click="deleteSensor(sensor)"
                  >Delete</button>
                  <button
                    class="px-2.5 py-1.5 text-[11px] font-semibold text-ink-muted border border-parchment-3 rounded-lg hover:bg-parchment-2 transition-colors"
                    @click="confirmDeleteId = null"
                  >Cancel</button>
                </div>
              </div>

            </div>
          </div>
        </div>

      </main>
    </div>

    <!-- ── Serial sidebar ───────────────────────────────────────────────────── -->
    <transition name="slide">
      <aside
        v-if="connectedSensor"
        class="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-parchment-3 flex flex-col bg-ink"
        style="min-height: 260px"
      >
        <!-- Sidebar header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-parchment-4">Serial</p>
            <p class="text-[11px] text-parchment-4/60 mt-0.5 truncate max-w-[180px]">{{ connectedSensor.name }}</p>
          </div>
          <div class="flex items-center gap-3">
            <button class="text-[10px] text-parchment-4 hover:text-flame transition-colors" @click="copyLog">
              <span v-if="logCopied" class="text-green-400">Copied!</span>
              <span v-else>Copy</span>
            </button>
            <span class="text-white/20">|</span>
            <button class="text-[10px] text-parchment-4 hover:text-flame transition-colors" @click="serialLog = []">Clear</button>
          </div>
        </div>

        <!-- Log output -->
        <div ref="logEl" class="flex-1 overflow-y-auto px-4 py-3 font-mono text-[10px] flex flex-col gap-0.5">
          <div
            v-for="(line, i) in serialLog"
            :key="i"
            class="leading-relaxed"
            :class="line.type === 'error' ? 'text-red-400' : line.type === 'info' ? 'text-yellow-300' : 'text-green-400'"
          >{{ line.text }}</div>
          <div v-if="!serialLog.length" class="text-parchment-4/40 italic">Waiting for output…</div>
        </div>

        <!-- Command input -->
        <div class="px-3 pb-3 pt-2 border-t border-white/10">
          <div class="flex gap-2">
            <input
              v-model="serialCmd"
              class="flex-1 bg-white/10 text-parchment font-mono text-[11px] rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-flame/60 placeholder-parchment-4/40"
              placeholder="Send command…"
              @keydown.enter="sendCmd"
            >
            <button
              class="px-3 py-2 bg-flame text-parchment text-xs font-bold rounded-lg hover:bg-flame-dark transition-colors"
              @click="sendCmd"
            >Send</button>
          </div>
        </div>
      </aside>
    </transition>

    <!-- ── Add sensor modal ─────────────────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showAddModal"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center font-serif"
        style="background: rgba(26,18,8,0.6)"
        @click.self="showAddModal = false"
      >
        <div class="bg-parchment w-full sm:w-[420px] sm:rounded-2xl rounded-t-2xl border border-parchment-3 overflow-hidden" style="box-shadow: 0 -8px 40px rgba(26,18,8,0.15)">

          <div class="flex items-center justify-between px-6 pt-5 pb-4 border-b border-parchment-3">
            <h2 class="text-sm font-bold text-ink">Add sensor</h2>
            <button class="p-1.5 rounded-lg hover:bg-parchment-2 text-ink-muted transition-colors" @click="showAddModal = false">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="px-6 py-5 flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Sensor name</label>
              <input
                v-model="newSensorName"
                type="text"
                placeholder="e.g. Top shelf, Bottom shelf…"
                class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
                @keydown.enter="createSensor"
              >
            </div>
            <p class="text-xs text-ink-muted leading-relaxed">
              A token will be generated for this sensor. You can then flash it to your ESP32 from the sensor card.
            </p>
            <p v-if="createError" class="text-xs text-red-500">{{ createError }}</p>
          </div>

          <div class="flex justify-end gap-2 px-6 pb-5 pt-2">
            <button
              class="px-4 py-2 text-sm font-semibold text-ink-muted border border-parchment-3 rounded-lg hover:bg-parchment-2 transition-colors"
              @click="showAddModal = false"
            >Cancel</button>
            <button
              class="px-4 py-2 text-sm font-bold text-parchment bg-flame rounded-lg hover:bg-flame-dark transition-colors disabled:opacity-40"
              :disabled="!newSensorName.trim() || saving"
              @click="createSensor"
            >
              <span v-if="saving" class="flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                Creating…
              </span>
              <span v-else>Create sensor</span>
            </button>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
// app/pages/sensors.vue
definePageMeta({ middleware: 'auth' })

// ── State ──────────────────────────────────────────────────────────────────────
const sensors         = ref([])
const loading         = ref(true)
const saving          = ref(false)
const createError     = ref('')
const showAddModal    = ref(false)
const newSensorName   = ref('')
const confirmDeleteId = ref(null)
const copiedId        = ref(null)
const logCopied       = ref(false)
const editingId       = ref(null)
const editName        = ref('')
const nameInput       = ref(null)

// Serial
const connectedSensor = ref(null)
const serialLog       = ref([])
const serialCmd       = ref('')
const logEl           = ref(null)

let port          = null
let activeReader  = null
let writer        = null
let readingActive = false

const nowUnix = ref(Math.floor(Date.now() / 1000))

// ── Lifecycle ──────────────────────────────────────────────────────────────────
let sensorRefreshInterval = null
let clockInterval         = null

onMounted(async () => {
  await loadSensors(true)
  sensorRefreshInterval = setInterval(() => loadSensors(false), 15000)
  clockInterval         = setInterval(() => { nowUnix.value = Math.floor(Date.now() / 1000) }, 1000)
})

onUnmounted(async () => {
  if (sensorRefreshInterval) clearInterval(sensorRefreshInterval)
  if (clockInterval)         clearInterval(clockInterval)
  readingActive = false
  try { if (activeReader) { await activeReader.cancel(); activeReader = null } } catch {}
  try { if (writer) { writer.releaseLock(); writer = null } } catch {}
  try { if (port) await port.close() } catch {}
})

// ── Load ───────────────────────────────────────────────────────────────────────
async function loadSensors(showSpinner = false) {
  if (showSpinner) loading.value = true
  try {
    sensors.value = await $fetch('/api/sensors')
  } catch {
    sensors.value = []
  } finally {
    loading.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return ''
  return new Date(typeof ts === 'number' ? ts * 1000 : ts).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function masked(token) {
  if (!token) return ''
  return token.slice(0, 8) + '-****-****-****-' + token.slice(-4)
}

const ONLINE_TIMEOUT = 30 // seconds

function sensorIsOnline(sensor) {
  if (!sensor.last_seen) return false
  return (nowUnix.value - Number(sensor.last_seen)) <= ONLINE_TIMEOUT
}

// ── Copy token ─────────────────────────────────────────────────────────────────
async function copyToken(sensor) {
  await navigator.clipboard.writeText(sensor.token)
  copiedId.value = sensor.id
  setTimeout(() => { copiedId.value = null }, 2000)
}

// ── Inline rename ──────────────────────────────────────────────────────────────
function startEdit(sensor) {
  editingId.value = sensor.id
  editName.value  = sensor.name
  nextTick(() => nameInput.value?.focus())
}

function cancelEdit() {
  editingId.value = null
  editName.value  = ''
}

async function saveEdit(sensor) {
  const name = editName.value.trim()
  if (!name || name === sensor.name) { cancelEdit(); return }
  try {
    await $fetch(`/api/sensors/${sensor.id}`, { method: 'PUT', body: { name } })
    sensor.name = name
  } catch { /* silent — name stays unchanged */ }
  cancelEdit()
}

// ── Add sensor ─────────────────────────────────────────────────────────────────
function openAddModal() {
  newSensorName.value = ''
  createError.value   = ''
  showAddModal.value  = true
}

async function createSensor() {
  const name = newSensorName.value.trim()
  if (!name) return
  saving.value      = true
  createError.value = ''
  try {
    const data = await $fetch('/api/sensors', { method: 'POST', body: { name } })
    sensors.value.push(data)
    showAddModal.value = false
  } catch (e) {
    createError.value = e?.data?.message ?? 'Could not create sensor. Try again.'
  } finally {
    saving.value = false
  }
}

// ── Delete sensor ──────────────────────────────────────────────────────────────
async function deleteSensor(sensor) {
  if (connectedSensor.value?.id === sensor.id) await disconnectSerial()
  try {
    await $fetch(`/api/sensors/${sensor.id}`, { method: 'DELETE' })
    sensors.value = sensors.value.filter(s => s.id !== sensor.id)
  } catch { /* silent */ }
  confirmDeleteId.value = null
}

watch(sensors, () => { confirmDeleteId.value = null })

// ── Serial ─────────────────────────────────────────────────────────────────────
function log(text, type = 'normal') {
  serialLog.value.push({ text, type })
  nextTick(() => { if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight })
}

async function connectSerial(sensor) {
  try {
    port = await navigator.serial.requestPort()
    await port.open({ baudRate: 115200 })
    writer = port.writable.getWriter()
    connectedSensor.value = sensor
    serialLog.value = []
    log(`Connected to ${sensor.name}`, 'info')
    startReading()
  } catch (e) {
    log('❌ ' + (e.message ?? 'Could not open port'), 'error')
  }
}

async function disconnectSerial() {
  readingActive = false
  try { if (activeReader) { await activeReader.cancel(); activeReader = null } } catch {}
  try { if (writer) { writer.releaseLock(); writer = null } } catch {}
  try { if (port) { await port.close(); port = null } } catch {}
  log('Disconnected', 'info')
  connectedSensor.value = null
}

async function startReading() {
  readingActive = true
  let buffer = ''
  try {
    while (readingActive && port?.readable) {
      activeReader = port.readable.getReader()
      try {
        while (true) {
          const { value, done } = await activeReader.read()
          if (done) break
          buffer += new TextDecoder().decode(value)
          const lines = buffer.split('\n')
          buffer = lines.pop()
          for (const line of lines) {
            const t = line.trim()
            if (!t) continue
            log(t, t.startsWith('KILN_LOG:') ? 'info' : 'normal')
          }
        }
      } catch { /* read cancelled */ }
      finally {
        try { activeReader?.releaseLock() } catch {}
        activeReader = null
      }
      if (!readingActive) break
    }
  } catch { /* port gone */ }
}

async function sendCmd() {
  const cmd = serialCmd.value.trim()
  if (!cmd || !writer) return
  try {
    await writer.write(new TextEncoder().encode(cmd + '\n'))
    log('→ ' + cmd, 'info')
    serialCmd.value = ''
  } catch (e) {
    log('❌ Send failed: ' + e.message, 'error')
  }
}

async function copyLog() {
  const text = serialLog.value.map(l => l.text).join('\n')
  await navigator.clipboard.writeText(text)
  logCopied.value = true
  setTimeout(() => { logCopied.value = false }, 2000)
}
</script>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: width 0.2s ease, opacity 0.2s ease;
}
.slide-enter-from,
.slide-leave-to {
  width: 0;
  opacity: 0;
}
</style>