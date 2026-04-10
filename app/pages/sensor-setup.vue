<template>
  <div class="min-h-screen bg-parchment font-serif">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-parchment border-b border-parchment-3 px-4 py-3 flex items-center gap-3">
      <NuxtLink to="/account" class="p-1.5 rounded-lg text-ink-muted hover:bg-parchment-2 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </NuxtLink>
      <h1 class="text-base font-bold text-ink tracking-tight">Sensor Setup</h1>
    </header>

    <!-- Browser warning -->
    <div v-if="!webSerialSupported" class="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
      <svg class="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
      <div>
        <p class="text-sm font-bold text-yellow-800">Chrome or Edge required</p>
        <p class="text-xs text-yellow-700 mt-0.5">Web Serial isn't supported in Safari or Firefox. Open this page in Chrome or Edge to flash and configure your sensor.</p>
      </div>
    </div>

    <div class="max-w-lg mx-auto px-4 py-6 flex flex-col gap-4">

      <!-- Intro -->
      <div class="bg-white border border-parchment-3 rounded-2xl px-5 py-4" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
        <p class="text-sm font-semibold text-ink mb-1">MAX31855 + ESP32</p>
        <p class="text-xs text-ink-muted leading-relaxed">Connect your ESP32 via USB, then follow the steps below to flash the Kiln.Log firmware and configure your WiFi credentials. Once set up, the sensor will stream temperature readings automatically.</p>
      </div>

      <!-- ── STEP 1: CONNECT ── -->
      <div
        class="bg-white border border-parchment-3 rounded-2xl overflow-hidden"
        style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
      >
        <div class="px-5 py-4 border-b border-parchment-3 flex items-center gap-3">
          <StepBadge :n="1" :done="step > 1" :active="step === 1" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-ink">Connect ESP32</p>
            <p class="text-xs text-ink-muted">Plug in via USB and select the serial port</p>
          </div>
          <span v-if="step > 1" class="text-xs font-bold text-green-600 flex items-center gap-1 shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
            Connected
          </span>
        </div>
        <div v-if="step === 1" class="px-5 py-4 flex flex-col gap-3">
          <p class="text-xs text-ink-muted">Make sure your ESP32 is plugged in via USB. A browser dialog will ask you to pick a port — look for <strong>CP210x</strong> or <strong>CH340</strong>.</p>
          <button
            class="self-start px-4 py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-40 flex items-center gap-2"
            :disabled="!webSerialSupported || connecting"
            @click="connectSerial"
          >
            <svg v-if="connecting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            {{ connecting ? 'Connecting…' : 'Connect ESP32' }}
          </button>
          <p v-if="connectError" class="text-xs text-red-500">{{ connectError }}</p>
        </div>
      </div>

      <!-- ── STEP 2: FLASH ── -->
      <div
        class="bg-white border border-parchment-3 rounded-2xl overflow-hidden transition-opacity"
        :class="step < 2 ? 'opacity-40 pointer-events-none' : ''"
        style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
      >
        <div class="px-5 py-4 border-b border-parchment-3 flex items-center gap-3">
          <StepBadge :n="2" :done="step > 2" :active="step === 2" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-ink">Flash firmware</p>
            <p class="text-xs text-ink-muted">Upload Kiln.Log firmware to the ESP32</p>
          </div>
          <span v-if="step > 2" class="text-xs font-bold text-green-600 flex items-center gap-1 shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
            Flashed
          </span>
        </div>
        <div v-if="step === 2" class="px-5 py-4 flex flex-col gap-4">

          <!-- File drop zone -->
          <div>
            <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint block mb-2">Firmware .bin file</label>
            <div
              class="border-2 border-dashed rounded-xl p-5 text-center transition-colors"
              :class="firmwareFile ? 'border-flame bg-flame-bg' : 'border-parchment-3 hover:border-flame/40'"
              @dragover.prevent
              @drop.prevent="onFirmwareDrop"
              @click="firmwareInput?.click()"
            >
              <input ref="firmwareInput" type="file" accept=".bin" class="hidden" @change="onFirmwareFile" />
              <template v-if="firmwareFile">
                <p class="text-sm font-bold text-flame">{{ firmwareFile.name }}</p>
                <p class="text-xs text-ink-muted mt-0.5">{{ (firmwareFile.size / 1024).toFixed(0) }} KB</p>
                <button class="mt-2 text-xs text-ink-faint hover:text-red-400 transition-colors" @click.stop="firmwareFile = null">Remove</button>
              </template>
              <template v-else>
                <svg class="w-7 h-7 text-parchment-4 mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                <p class="text-sm text-ink-muted">Drop <strong>kiln_sensor.bin</strong> here</p>
                <p class="text-xs text-flame font-semibold mt-1">or tap to browse</p>
              </template>
            </div>
          </div>

          <!-- Flash offset -->
          <div class="flex items-center gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Flash offset</label>
              <input
                v-model="flashOffset"
                class="border border-parchment-3 rounded-lg px-3 py-1.5 text-sm font-mono text-ink bg-white focus:outline-none focus:border-flame w-32"
              />
            </div>
            <p class="text-xs text-ink-muted mt-4">Standard ESP32 app partition</p>
          </div>

          <!-- Progress bar -->
          <div v-if="flashing" class="flex flex-col gap-1.5">
            <div class="flex justify-between text-xs text-ink-muted">
              <span>Flashing…</span><span>{{ flashProgress }}%</span>
            </div>
            <div class="h-2 bg-parchment-2 rounded-full overflow-hidden">
              <div class="h-full bg-flame rounded-full transition-all duration-150" :style="{ width: flashProgress + '%' }"></div>
            </div>
          </div>

          <div class="flex items-center gap-4">
            <button
              class="px-4 py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-40 flex items-center gap-2"
              :disabled="!firmwareFile || flashing"
              @click="flashFirmware"
            >
              <svg v-if="flashing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              {{ flashing ? 'Flashing…' : 'Flash firmware' }}
            </button>
            <button class="text-xs text-ink-faint hover:text-flame transition-colors" @click="step = 3">
              Skip — already flashed
            </button>
          </div>

          <p v-if="flashError" class="text-xs text-red-500">{{ flashError }}</p>
        </div>
      </div>

      <!-- ── STEP 3: CONFIGURE ── -->
      <div
        class="bg-white border border-parchment-3 rounded-2xl overflow-hidden transition-opacity"
        :class="step < 3 ? 'opacity-40 pointer-events-none' : ''"
        style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
      >
        <div class="px-5 py-4 border-b border-parchment-3 flex items-center gap-3">
          <StepBadge :n="3" :done="step > 3" :active="step === 3" />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-ink">Configure</p>
            <p class="text-xs text-ink-muted">Set WiFi credentials and API endpoint</p>
          </div>
        </div>
        <div v-if="step === 3" class="px-5 py-4 flex flex-col gap-4">
          <div class="flex flex-col gap-3">
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">WiFi network (SSID)</label>
              <input
                v-model="config.ssid"
                type="text"
                placeholder="YourWiFiName"
                class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">WiFi password</label>
              <input
                v-model="config.password"
                type="password"
                placeholder="••••••••"
                class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Kiln.Log API URL</label>
              <input
                v-model="config.apiUrl"
                type="url"
                placeholder="https://kilnlog.netlify.app"
                class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
              />
              <p class="text-xs text-ink-muted">Leave blank to use mDNS (local network only)</p>
            </div>
          </div>

          <button
            class="w-full py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
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
      <div
        v-if="step === 4"
        class="bg-green-50 border border-green-200 rounded-2xl px-5 py-6 flex flex-col items-center gap-3 text-center"
        style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
      >
        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
        </div>
        <div>
          <p class="font-bold text-green-800">Sensor configured!</p>
          <p class="text-sm text-green-700 mt-1">The ESP32 is rebooting and will connect to <strong>{{ config.ssid }}</strong>. The LED goes solid when it's ready.</p>
        </div>
        <NuxtLink
          to="/app"
          class="mt-1 px-5 py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors"
        >Go to Kiln.Log →</NuxtLink>
      </div>

      <!-- Serial log -->
      <div v-if="serialLog.length" class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Serial log</p>
          <button class="text-xs text-ink-faint hover:text-flame transition-colors" @click="serialLog = []">Clear</button>
        </div>
        <div
          ref="logEl"
          class="bg-ink rounded-xl px-4 py-3 font-mono text-xs max-h-48 overflow-y-auto flex flex-col gap-0.5"
        >
          <div
            v-for="(line, i) in serialLog"
            :key="i"
            :class="line.type === 'error' ? 'text-red-400' : line.type === 'info' ? 'text-yellow-300' : 'text-green-400'"
          >{{ line.text }}</div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['auth'] })

// ── Web Serial ────────────────────────────────────────────────────────────────
const webSerialSupported = computed(() =>
  typeof navigator !== 'undefined' && 'serial' in navigator
)

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

const config = reactive({
  ssid:     '',
  password: '',
  apiUrl:   '',
})

onMounted(() => {
  // Set default API URL client-side only to avoid SSR window error
  if (!config.apiUrl) config.apiUrl = window.location.origin
})

let port   = null
let writer = null
let reader = null

// ── Serial log ────────────────────────────────────────────────────────────────
function log(text, type = 'normal') {
  serialLog.value.push({ text, type })
  nextTick(() => { if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight })
}

// ── Step 1: Connect ───────────────────────────────────────────────────────────
async function connectSerial() {
  connecting.value   = true
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

// ── Serial reader ─────────────────────────────────────────────────────────────
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
        log(t, t.startsWith('KILN_LOG:') ? 'info' : 'normal')
        if (t === 'KILN_LOG:CONFIG_OK') step.value = 4
      }
    }
  } catch { /* port closed */ }
}

// ── Step 2: Flash ─────────────────────────────────────────────────────────────
function onFirmwareFile(e) { firmwareFile.value = e.target.files?.[0] ?? null }
function onFirmwareDrop(e) { firmwareFile.value = e.dataTransfer.files?.[0] ?? null }

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src; s.onload = resolve; s.onerror = reject
    document.head.appendChild(s)
  })
}

async function flashFirmware() {
  if (!firmwareFile.value || !port) return
  flashing.value    = true
  flashError.value  = ''
  flashProgress.value = 0

  try {
    if (!window.esptooljs) {
      log('Loading esptool-js…', 'info')
      await loadScript('https://unpkg.com/esptool-js@0.4.3/bundle.js')
    }

    const { ESPLoader, Transport } = window.esptooljs ?? window

    // Release our reader/writer so esptool can take over the port
    if (reader) { try { await reader.cancel() } catch {} reader = null }
    if (writer) { try { writer.releaseLock() } catch {} writer = null }
    await port.close()

    const transport = new Transport(port, true)
    const loader = new ESPLoader({
      transport,
      baudrate:    115200,
      romBaudrate: 115200,
      terminal: {
        clean:     () => {},
        writeLine: (s) => log(s, 'info'),
        write:     (s) => log(s, 'info'),
      },
    })

    log('Connecting to ROM bootloader…', 'info')
    await loader.main()
    log('Chip: ' + loader.chip.CHIP_NAME, 'info')

    const fileData = await firmwareFile.value.arrayBuffer()
    const binary   = Array.from(new Uint8Array(fileData))
    const offset   = parseInt(flashOffset.value, 16)

    log(`Flashing ${(binary.length / 1024).toFixed(0)} KB at ${flashOffset.value}…`, 'info')

    await loader.writeFlash({
      fileArray:  [{ data: binary, address: offset }],
      flashSize:  'keep',
      flashMode:  'keep',
      flashFreq:  'keep',
      eraseAll:   false,
      compress:   true,
      reportProgress: (_i, written, total) => {
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
    try {
      if (!port.readable) await port.open({ baudRate: 115200 })
      writer = port.writable.getWriter()
      startReading()
    } catch {}
  }

  flashing.value = false
}

// ── Step 3: Configure ─────────────────────────────────────────────────────────
async function sendConfig() {
  if (!config.ssid.trim()) return
  sending.value      = true
  configError.value  = ''
  try {
    const payload = JSON.stringify({
      ssid:     config.ssid.trim(),
      password: config.password,
      apiUrl:   config.apiUrl.trim(),
    }) + '\n'

    await writer.write(new TextEncoder().encode(payload))
    log('→ Config sent, waiting for ESP32…', 'info')

    // Fallback if no confirmation received
    setTimeout(() => {
      if (step.value === 3) {
        configError.value = 'No confirmation received. The ESP32 may still be booting — wait 10s and try again.'
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