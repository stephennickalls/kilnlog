<template>
  <div class="min-h-screen bg-parchment font-serif flex flex-col items-center justify-start p-6 pt-10">

    <div class="w-full max-w-xl">

      <!-- Header -->
      <div class="mb-8">
        <NuxtLink to="/app" class="text-sm text-flame font-semibold hover:underline">← Back to Kiln.Log</NuxtLink>
        <h1 class="text-2xl font-bold text-ink mt-3 tracking-tight">ESP32 Setup</h1>
        <p class="text-sm text-ink-muted mt-1">Flash firmware and configure your kiln sensor in one go.</p>
      </div>

      <!-- Browser warning -->
      <div v-if="!webSerialSupported" class="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex gap-3">
        <svg class="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
        <div>
          <p class="text-sm font-bold text-yellow-800">Chrome or Edge required</p>
          <p class="text-xs text-yellow-700 mt-0.5">Web Serial API isn't supported in Firefox or Safari. Open this page in Chrome or Edge.</p>
        </div>
      </div>

      <!-- Steps -->
      <div class="flex flex-col gap-4">

        <!-- ── STEP 1: CONNECT ── -->
        <div class="bg-white border rounded-xl overflow-hidden" :class="step >= 1 ? 'border-parchment-3' : 'border-parchment-3 opacity-60'">
          <div class="flex items-center gap-3 px-5 py-4 border-b border-parchment-3">
            <StepBadge :n="1" :done="step > 1" :active="step === 1" />
            <div>
              <p class="text-sm font-bold text-ink">Connect ESP32</p>
              <p class="text-xs text-ink-muted">Plug in via USB and select the serial port</p>
            </div>
            <div class="ml-auto">
              <span v-if="step > 1" class="text-xs font-bold text-green-600 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                Connected
              </span>
            </div>
          </div>
          <div v-if="step === 1" class="px-5 py-4">
            <p class="text-xs text-ink-muted mb-3">Make sure your ESP32 is plugged in via USB, then click Connect. A browser dialog will ask you to pick the serial port — choose the one labelled <strong>CP210x</strong> or <strong>CH340</strong>.</p>
            <button
              class="px-4 py-2.5 bg-flame text-parchment text-sm font-bold rounded-lg hover:bg-flame-dark transition-colors disabled:opacity-40 flex items-center gap-2"
              :disabled="!webSerialSupported || connecting"
              @click="connectSerial"
            >
              <svg v-if="connecting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              {{ connecting ? 'Connecting…' : 'Connect ESP32' }}
            </button>
            <p v-if="connectError" class="text-xs text-red-500 mt-2">{{ connectError }}</p>
          </div>
        </div>

        <!-- ── STEP 2: FLASH ── -->
        <div class="bg-white border rounded-xl overflow-hidden" :class="step >= 2 ? 'border-parchment-3' : 'border-parchment-3 opacity-40 pointer-events-none'">
          <div class="flex items-center gap-3 px-5 py-4 border-b border-parchment-3">
            <StepBadge :n="2" :done="step > 2" :active="step === 2" />
            <div>
              <p class="text-sm font-bold text-ink">Flash firmware</p>
              <p class="text-xs text-ink-muted">Upload Kiln.Log firmware to the ESP32</p>
            </div>
            <div class="ml-auto">
              <span v-if="step > 2" class="text-xs font-bold text-green-600 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
                Flashed
              </span>
            </div>
          </div>
          <div v-if="step === 2" class="px-5 py-4 flex flex-col gap-4">

            <!-- Firmware file picker -->
            <div class="flex flex-col gap-2">
              <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Firmware .bin file</label>
              <div
                class="border-2 border-dashed rounded-xl p-6 text-center transition-colors"
                :class="firmwareFile ? 'border-flame bg-flame-bg' : 'border-parchment-3 hover:border-flame/50'"
                @dragover.prevent
                @drop.prevent="onFirmwareDrop"
              >
                <input ref="firmwareInput" type="file" accept=".bin" class="hidden" @change="onFirmwareFile" />
                <template v-if="firmwareFile">
                  <p class="text-sm font-bold text-flame">{{ firmwareFile.name }}</p>
                  <p class="text-xs text-ink-muted mt-0.5">{{ (firmwareFile.size / 1024).toFixed(0) }} KB</p>
                  <button class="mt-2 text-xs text-ink-faint hover:text-red-400 transition-colors" @click="firmwareFile = null">Remove</button>
                </template>
                <template v-else>
                  <svg class="w-8 h-8 text-parchment-4 mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                  <p class="text-sm text-ink-muted">Drop <strong>kiln_sensor.bin</strong> here</p>
                  <button class="mt-2 text-xs text-flame font-semibold" @click="firmwareInput.click()">or browse</button>
                </template>
              </div>
            </div>

            <!-- Flash address -->
            <div class="flex items-center gap-3">
              <div class="flex flex-col gap-1 flex-1">
                <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Flash offset</label>
                <input v-model="flashOffset" class="border border-parchment-3 rounded-lg px-3 py-1.5 text-sm font-mono text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10" />
              </div>
              <p class="text-xs text-ink-muted mt-4">Standard ESP32 app address</p>
            </div>

            <!-- Flash progress -->
            <div v-if="flashing" class="flex flex-col gap-2">
              <div class="flex justify-between text-xs text-ink-muted">
                <span>Flashing…</span>
                <span>{{ flashProgress }}%</span>
              </div>
              <div class="h-2 bg-parchment-2 rounded-full overflow-hidden">
                <div class="h-full bg-flame rounded-full transition-all" :style="{ width: flashProgress + '%' }"></div>
              </div>
            </div>

            <button
              class="px-4 py-2.5 bg-flame text-parchment text-sm font-bold rounded-lg hover:bg-flame-dark transition-colors disabled:opacity-40 flex items-center gap-2 self-start"
              :disabled="!firmwareFile || flashing"
              @click="flashFirmware"
            >
              <svg v-if="flashing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              {{ flashing ? 'Flashing…' : 'Flash firmware' }}
            </button>

            <p v-if="flashError" class="text-xs text-red-500">{{ flashError }}</p>

            <button class="text-xs text-ink-faint hover:text-flame transition-colors self-start" @click="step = 3">
              Skip (already flashed) →
            </button>
          </div>
        </div>

        <!-- ── STEP 3: CONFIGURE ── -->
        <div class="bg-white border rounded-xl overflow-hidden" :class="step >= 3 ? 'border-parchment-3' : 'border-parchment-3 opacity-40 pointer-events-none'">
          <div class="flex items-center gap-3 px-5 py-4 border-b border-parchment-3">
            <StepBadge :n="3" :done="step > 3" :active="step === 3" />
            <div>
              <p class="text-sm font-bold text-ink">Configure</p>
              <p class="text-xs text-ink-muted">Set WiFi credentials and API endpoint</p>
            </div>
          </div>
          <div v-if="step === 3" class="px-5 py-4 flex flex-col gap-4">

            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">WiFi network (SSID)</label>
                <input v-model="config.ssid" type="text" placeholder="YourWiFiName" class="border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">WiFi password</label>
                <input v-model="config.password" type="password" placeholder="••••••••" class="border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif" />
              </div>
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Kiln.Log API URL</label>
                <input v-model="config.apiUrl" type="url" placeholder="https://kilnlog.netlify.app" class="border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif" />
                <p class="text-xs text-ink-muted">Leave blank to use mDNS (same local network only)</p>
              </div>
            </div>

            <button
              class="px-4 py-2.5 bg-flame text-parchment text-sm font-bold rounded-lg hover:bg-flame-dark transition-colors disabled:opacity-40 flex items-center gap-2 self-start"
              :disabled="!config.ssid.trim() || sending"
              @click="sendConfig"
            >
              <svg v-if="sending" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              {{ sending ? 'Sending…' : 'Send config & reboot →' }}
            </button>
            <p v-if="configError" class="text-xs text-red-500">{{ configError }}</p>
          </div>
        </div>

        <!-- ── STEP 4: DONE ── -->
        <div v-if="step === 4" class="bg-green-50 border border-green-200 rounded-xl px-5 py-6 text-center flex flex-col items-center gap-3">
          <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
          </div>
          <div>
            <p class="font-bold text-green-800">ESP32 configured!</p>
            <p class="text-sm text-green-700 mt-1">The sensor is rebooting and will connect to <strong>{{ config.ssid }}</strong> shortly. The LED will go solid when it's ready.</p>
          </div>
          <NuxtLink to="/app" class="mt-2 px-4 py-2 bg-flame text-parchment text-sm font-bold rounded-lg hover:bg-flame-dark transition-colors">
            Go to Kiln.Log →
          </NuxtLink>
        </div>

      </div>

      <!-- Serial log -->
      <div v-if="serialLog.length" class="mt-6">
        <div class="flex items-center justify-between mb-2">
          <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Serial log</p>
          <button class="text-xs text-ink-faint hover:text-flame" @click="serialLog = []">Clear</button>
        </div>
        <div ref="logEl" class="bg-ink rounded-xl px-4 py-3 font-mono text-xs text-green-400 max-h-48 overflow-y-auto space-y-0.5">
          <div v-for="(line, i) in serialLog" :key="i" :class="line.type === 'error' ? 'text-red-400' : line.type === 'info' ? 'text-yellow-300' : 'text-green-400'">{{ line.text }}</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['auth'] })

// ── Web Serial support ────────────────────────────────────────────────────────
const webSerialSupported = computed(() => typeof navigator !== 'undefined' && 'serial' in navigator)

// ── State ─────────────────────────────────────────────────────────────────────
const step          = ref(1)
const connecting    = ref(false)
const connectError  = ref('')
const flashing      = ref(false)
const flashProgress = ref(0)
const flashError    = ref('')
const sending       = ref(false)
const configError   = ref('')
const serialLog     = ref([])
const logEl         = ref(null)

const firmwareFile  = ref(null)
const firmwareInput = ref(null)
const flashOffset   = ref('0x10000')

const config = reactive({ ssid: '', password: '', apiUrl: window?.location?.origin ?? '' })

let port   = null
let writer = null
let reader = null

// ── Serial log helper ─────────────────────────────────────────────────────────
function log(text, type = 'normal') {
  serialLog.value.push({ text, type })
  nextTick(() => { if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight })
}

// ── Step 1: Connect ───────────────────────────────────────────────────────────
async function connectSerial() {
  connecting.value = true
  connectError.value = ''
  try {
    port = await navigator.serial.requestPort()
    await port.open({ baudRate: 115200 })
    writer = port.writable.getWriter()
    log('✅ Port opened at 115200 baud', 'info')
    startReading()
    step.value = 2
  } catch (e) {
    connectError.value = e.message ?? 'Could not open port'
    log('❌ ' + connectError.value, 'error')
  }
  connecting.value = false
}

// ── Serial reader (streams log lines) ────────────────────────────────────────
async function startReading() {
  const decoder = new TextDecoderStream()
  port.readable.pipeTo(decoder.writable)
  reader = decoder.readable.getReader()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        const t = line.trim()
        if (!t) continue
        const type = t.startsWith('KILN_LOG:') ? 'info' : 'normal'
        log(t, type)
        // Detect config confirmed
        if (t === 'KILN_LOG:CONFIG_OK') {
          step.value = 4
        }
      }
    }
  } catch {}
}

// ── Step 2: Flash ─────────────────────────────────────────────────────────────
function onFirmwareFile(e) { firmwareFile.value = e.target.files[0] ?? null }
function onFirmwareDrop(e) { firmwareFile.value = e.dataTransfer.files[0] ?? null }

async function flashFirmware() {
  if (!firmwareFile.value || !port) return
  flashing.value  = true
  flashError.value = ''
  flashProgress.value = 0

  try {
    // We use esptool-js loaded from CDN
    if (!window.esptooljs) {
      log('Loading esptool-js…', 'info')
      await loadScript('https://unpkg.com/esptool-js@0.4.3/bundle.js')
    }

    const { ESPLoader, Transport } = window.esptooljs ?? window

    // Close the port we opened for serial reading, esptool needs exclusive access
    if (reader) { try { await reader.cancel() } catch {} reader = null }
    if (writer) { try { writer.releaseLock() } catch {} writer = null }
    await port.close()

    // Re-open via esptool transport
    const transport = new Transport(port, true)
    const loader = new ESPLoader({
      transport,
      baudrate:  115200,
      romBaudrate: 115200,
      terminal: {
        clean: () => {},
        writeLine: (s) => log(s, 'info'),
        write: (s) => log(s, 'info'),
      },
    })

    log('Connecting to ROM bootloader…', 'info')
    await loader.main()
    log('Chip: ' + loader.chip.CHIP_NAME, 'info')

    const fileData  = await firmwareFile.value.arrayBuffer()
    const binary    = Array.from(new Uint8Array(fileData))
    const offset    = parseInt(flashOffset.value, 16)

    log(`Flashing ${(binary.length / 1024).toFixed(0)} KB at ${flashOffset.value}…`, 'info')

    await loader.writeFlash({
      fileArray: [{ data: binary, address: offset }],
      flashSize: 'keep',
      flashMode: 'keep',
      flashFreq: 'keep',
      eraseAll:  false,
      compress:  true,
      reportProgress: (fileIndex, written, total) => {
        flashProgress.value = Math.round((written / total) * 100)
      },
    })

    await loader.hardReset()
    log('✅ Flash complete — ESP32 rebooting', 'info')

    // Re-open for config step
    await port.open({ baudRate: 115200 })
    writer = port.writable.getWriter()
    startReading()

    step.value = 3
  } catch (e) {
    flashError.value = e.message ?? 'Flash failed'
    log('❌ Flash error: ' + flashError.value, 'error')
    // Try to re-open for at least logging
    try {
      if (!port.readable) await port.open({ baudRate: 115200 })
      writer = port.writable.getWriter()
      startReading()
    } catch {}
  }

  flashing.value = false
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}

// ── Step 3: Configure ─────────────────────────────────────────────────────────
async function sendConfig() {
  if (!config.ssid.trim()) return
  sending.value = true
  configError.value = ''
  try {
    const payload = JSON.stringify({
      ssid:     config.ssid.trim(),
      password: config.password,
      apiUrl:   config.apiUrl.trim(),
    }) + '\n'

    const encoded = new TextEncoder().encode(payload)
    await writer.write(encoded)
    log('→ Config sent, waiting for ESP32…', 'info')
    // Step 4 is triggered by KILN_LOG:CONFIG_OK in the serial reader
    // Fallback timeout
    setTimeout(() => {
      if (step.value === 3) {
        log('⚠️  No confirmation received — check serial log', 'error')
        configError.value = 'No confirmation. The ESP32 may still be booting — wait 10 seconds and try again.'
        sending.value = false
      }
    }, 15000)
  } catch (e) {
    configError.value = e.message ?? 'Send failed'
    log('❌ ' + configError.value, 'error')
    sending.value = false
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
onUnmounted(async () => {
  try { if (reader) await reader.cancel() } catch {}
  try { if (writer) writer.releaseLock() } catch {}
  try { if (port?.readable) await port.close() } catch {}
})
</script>