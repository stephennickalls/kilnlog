{{!-- pages/sensors.vue --}}
<template>
  <div class="min-h-screen bg-parchment font-serif flex flex-col">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-parchment border-b border-parchment-3 px-4 py-3 flex items-center gap-3">
      <NuxtLink to="/app" class="p-1.5 rounded-lg text-ink-muted hover:bg-parchment-2 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </NuxtLink>
      <h1 class="text-base font-bold text-ink tracking-tight">Sensors</h1>
      <button
        class="ml-auto flex items-center gap-1.5 px-3 py-2 bg-flame text-parchment text-xs font-bold rounded-lg hover:bg-flame-dark transition-colors"
        @click="openAddModal"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
        Add sensor
      </button>
    </header>

    <!-- Body -->
    <div class="flex-1 flex gap-0">

      <!-- Sensor list -->
      <div class="flex-1 flex flex-col gap-3 p-4 lg:p-6 min-w-0">

        <!-- Empty state -->
        <div
          v-if="!sensors.length && !loading"
          class="flex-1 flex flex-col items-center justify-center gap-4 py-20 text-center"
        >
          <div class="w-16 h-16 rounded-full bg-parchment-2 border border-parchment-3 flex items-center justify-center">
            <svg class="w-7 h-7 text-ink-faint" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
            </svg>
          </div>
          <div>
            <p class="text-sm font-semibold text-ink">No sensors yet</p>
            <p class="text-xs text-ink-muted mt-1">Add a sensor to get started — you'll be taken through flashing and setup.</p>
          </div>
          <button
            class="flex items-center gap-1.5 px-4 py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors"
            @click="openAddModal"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
            Add your first sensor
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-20">
          <div class="w-7 h-7 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"></div>
        </div>

        <!-- Sensor cards -->
        <div
          v-for="sensor in sensors"
          :key="sensor.id"
          class="bg-white border rounded-2xl overflow-hidden transition-all duration-150"
          :class="connectedSensor?.id === sensor.id ? 'border-blue-300 shadow-sm' : 'border-parchment-3'"
          style="box-shadow: 0 2px 12px rgba(58,30,8,0.05)"
        >
          <!-- Card top row -->
          <div class="flex items-center gap-4 px-5 py-4">

            <!-- Icon -->
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors"
              :class="connectedSensor?.id === sensor.id
                ? 'bg-blue-50 border-blue-200'
                : sensorIsOnline(sensor)
                  ? 'bg-green-50 border-green-200'
                  : 'bg-parchment-2 border-parchment-3'"
            >
              <svg
                class="w-4 h-4"
                :class="connectedSensor?.id === sensor.id ? 'text-blue-500' : sensorIsOnline(sensor) ? 'text-green-600' : 'text-ink-faint'"
                fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"
              >
                <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
              </svg>
            </div>

            <!-- Name (editable) -->
            <div class="flex-1 min-w-0">
              <div v-if="editingId !== sensor.id" class="flex items-center gap-2">
                <span class="text-sm font-semibold text-ink truncate">{{ sensor.name }}</span>
                <button
                  class="p-1 rounded-md text-parchment-4 hover:text-ink-muted hover:bg-parchment-2 transition-colors opacity-0 group-hover:opacity-100"
                  title="Rename"
                  @click="startEdit(sensor)"
                >
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
              </div>
              <div v-else class="flex items-center gap-2">
                <input
                  ref="nameInput"
                  v-model="editName"
                  class="text-sm font-semibold text-ink bg-parchment rounded-lg px-2 py-0.5 border border-flame focus:outline-none focus:ring-2 focus:ring-flame/20 w-40"
                  @keydown.enter="saveEdit(sensor)"
                  @keydown.escape="cancelEdit"
                />
                <button class="p-1 rounded-md bg-flame text-parchment hover:bg-flame-dark transition-colors" @click="saveEdit(sensor)">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                </button>
                <button class="p-1 rounded-md text-ink-muted hover:bg-parchment-2 transition-colors" @click="cancelEdit">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <p class="text-[11px] text-ink-faint mt-0.5">Added {{ formatDate(sensor.created_at) }}</p>
            </div>

            <!-- Status pill -->
            <div class="shrink-0">
              <span
                v-if="connectedSensor?.id === sensor.id"
                class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-50 text-blue-600 border border-blue-200"
              >
                <span class="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                Serial open
              </span>
              <span
                v-else-if="sensorIsOnline(sensor)"
                class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-green-50 text-green-700 border border-green-200"
              >
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                Online
              </span>
              <span
                v-else
                class="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full bg-parchment-2 text-ink-faint border border-parchment-3"
              >
                <span class="w-1.5 h-1.5 bg-parchment-4 rounded-full"></span>
                Offline
              </span>
            </div>

          </div>

          <!-- Token row + actions -->
          <div class="flex items-center gap-2 px-5 pb-4">

            <!-- Token -->
            <div class="flex items-center gap-1.5 flex-1 min-w-0 bg-parchment rounded-lg px-3 py-2 border border-parchment-3">
              <svg class="w-3 h-3 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              <span class="font-mono text-[10px] text-ink-muted truncate flex-1">{{ masked(sensor.token) }}</span>
              <button
                class="text-[10px] text-ink-faint hover:text-flame transition-colors shrink-0 font-semibold"
                @click="copyToken(sensor)"
              >
                {{ copiedId === sensor.id ? 'Copied!' : 'Copy' }}
              </button>
            </div>

            <!-- Serial connect/disconnect -->
            <button
              v-if="connectedSensor?.id === sensor.id"
              class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors shrink-0"
              @click="disconnectSerial"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 17.657a9 9 0 010-12.728M9.172 15.536a5 5 0 010-7.072M12 12h.01"/></svg>
              Disconnect
            </button>
            <button
              v-else
              class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-ink-muted bg-parchment border border-parchment-3 rounded-lg hover:bg-parchment-2 transition-colors shrink-0"
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
              class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-parchment bg-flame rounded-lg hover:bg-flame-dark transition-colors shrink-0"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Flash
            </NuxtLink>

            <!-- Delete -->
            <button
              v-if="confirmDeleteId !== sensor.id"
              class="p-2 rounded-lg text-parchment-4 hover:text-red-400 hover:bg-red-50 transition-colors shrink-0"
              @click="confirmDeleteId = sensor.id"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
            </button>
            <button
              v-else
              class="px-2.5 py-1.5 text-[11px] font-bold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors shrink-0"
              @click="deleteSensor(sensor)"
            >
              Delete?
            </button>

          </div>

        </div>

      </div>

      <!-- Serial sidebar — only shown when a sensor is connected via USB -->
      <transition name="slide">
        <aside
          v-if="connectedSensor"
          class="w-80 shrink-0 border-l border-parchment-3 flex flex-col bg-ink hidden lg:flex"
        >
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

          <div ref="logEl" class="flex-1 overflow-y-auto px-4 py-3 font-mono text-[10px] flex flex-col gap-0.5">
            <div
              v-for="(line, i) in serialLog"
              :key="i"
              class="leading-relaxed"
              :class="line.type === 'error' ? 'text-red-400' : line.type === 'info' ? 'text-yellow-300' : 'text-green-400'"
            >{{ line.text }}</div>
            <div v-if="!serialLog.length" class="text-parchment-4/40 italic">Waiting for output…</div>
          </div>

          <div class="px-3 pb-3 pt-2 border-t border-white/10">
            <div class="flex gap-2">
              <input
                v-model="serialCmd"
                class="flex-1 bg-white/10 text-parchment font-mono text-[11px] rounded-lg px-3 py-2 border border-white/10 focus:outline-none focus:border-flame/60 placeholder-parchment-4/40"
                placeholder="Send command…"
                @keydown.enter="sendCmd"
              />
              <button
                class="px-3 py-2 bg-flame text-parchment text-xs font-bold rounded-lg hover:bg-flame-dark transition-colors"
                @click="sendCmd"
              >
                Send
              </button>
            </div>
          </div>
        </aside>
      </transition>

    </div>

    <!-- Add sensor modal -->
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
              />
            </div>
            <p class="text-xs text-ink-muted leading-relaxed">
              A token will be generated for this sensor. You can then flash it to your ESP32 from the sensor card.
            </p>
          </div>

          <div class="flex justify-end gap-2 px-6 pb-5 pt-2">
            <button class="px-4 py-2 text-sm font-semibold text-ink-muted border border-parchment-3 rounded-lg hover:bg-parchment-2 transition-colors" @click="showAddModal = false">Cancel</button>
            <button
              class="px-4 py-2 text-sm font-bold text-parchment bg-flame rounded-lg hover:bg-flame-dark transition-colors disabled:opacity-40"
              :disabled="!newSensorName.trim() || saving"
              @click="createSensor"
            >
              {{ saving ? 'Creating…' : 'Create sensor' }}
            </button>
          </div>

        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
// pages/sensors.vue

definePageMeta({ middleware: 'auth' })

const supabase = useSupabaseClient()

// ── State ──────────────────────────────────────────────────────────────────────
const sensors         = ref([])
const loading         = ref(true)
const saving          = ref(false)
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

// ── Load sensors ───────────────────────────────────────────────────────────────
onMounted(async () => {
  await loadSensors()
})

async function loadSensors() {
  loading.value = true
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  const { data, error } = await supabase
    .from('sensors')
    .select('id, name, token, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
  if (!error) sensors.value = data ?? []
  loading.value = false
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

function masked(token) {
  if (!token) return ''
  return token.slice(0, 8) + '-****-****-****-' + token.slice(-4)
}

function sensorIsOnline(sensor) {
  // Placeholder — will be driven by last seen timestamp once backend wired up
  return false
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
  const { error } = await supabase.from('sensors').update({ name }).eq('id', sensor.id)
  if (!error) sensor.name = name
  cancelEdit()
}

// ── Add sensor ─────────────────────────────────────────────────────────────────
function openAddModal() {
  newSensorName.value = ''
  showAddModal.value  = true
}

async function createSensor() {
  const name = newSensorName.value.trim()
  if (!name) return
  saving.value = true
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('sensors')
    .insert({ name, user_id: user.id })
    .select('id, name, token, created_at')
    .single()
  if (!error && data) {
    sensors.value.push(data)
    showAddModal.value = false
  }
  saving.value = false
}

// ── Delete sensor ──────────────────────────────────────────────────────────────
async function deleteSensor(sensor) {
  if (connectedSensor.value?.id === sensor.id) await disconnectSerial()
  const { error } = await supabase.from('sensors').delete().eq('id', sensor.id)
  if (!error) sensors.value = sensors.value.filter(s => s.id !== sensor.id)
  confirmDeleteId.value = null
}

// Clear confirm on list change
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

// ── Cleanup ────────────────────────────────────────────────────────────────────
onUnmounted(async () => {
  readingActive = false
  try { if (activeReader) { await activeReader.cancel(); activeReader = null } } catch {}
  try { if (writer) { writer.releaseLock(); writer = null } } catch {}
  try { if (port) await port.close() } catch {}
})
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