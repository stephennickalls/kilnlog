<template>
  <div class="min-h-screen bg-parchment font-serif flex flex-col">

    <!-- Header -->
    <header class="sticky top-0 z-10 bg-parchment border-b border-parchment-3 px-4 py-3 flex items-center gap-3">
      <NuxtLink to="/account" class="p-1.5 rounded-lg text-ink-muted hover:bg-parchment-2 transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
      </NuxtLink>
      <h1 class="text-base font-bold text-ink tracking-tight">Sensor Setup</h1>
    </header>

    <!-- Desktop-only warning -->
    <div class="lg:hidden mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
      <svg class="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
      <div>
        <p class="text-sm font-bold text-yellow-800">Desktop required</p>
        <p class="text-xs text-yellow-700 mt-0.5">Sensor setup requires a desktop or laptop computer with Chrome or Edge. This page won't work on mobile or tablet.</p>
      </div>
    </div>

    <!-- Browser warning -->
    <div v-if="!webSerialSupported" class="mx-4 mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
      <svg class="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
      <div>
        <p class="text-sm font-bold text-yellow-800">Chrome or Edge required</p>
        <p class="text-xs text-yellow-700 mt-0.5">Web Serial isn't supported in Safari or Firefox. Open this page in Chrome or Edge to flash and configure your sensor.</p>
      </div>
    </div>

    <!-- Two-column layout -->
    <div class="flex-1 flex justify-center gap-6 px-4 lg:px-8 py-6 w-full">

      <!-- Left: Steps -->
      <div class="flex flex-col gap-4 w-full max-w-lg">

        <!-- Intro -->
        <div class="bg-white border border-parchment-3 rounded-2xl px-5 py-4" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
          <p class="text-sm font-semibold text-ink mb-1">MAX31855 + ESP32</p>
          <p class="text-xs text-ink-muted leading-relaxed">Connect your ESP32 via USB, then follow the steps below to flash the Kiln.Log firmware and configure your WiFi credentials. Once set up, the sensor will stream temperature readings automatically.</p>
        </div>

        <!-- ── STEP 1: CONNECT ── -->
        <div class="bg-white border border-parchment-3 rounded-2xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
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
            <p class="text-xs text-ink-muted">Make sure your ESP32 is plugged in via USB. A browser dialog will ask you to pick a port — look for <strong>CP210x</strong>, <strong>CH340</strong>, or <strong>CH9102</strong>.</p>
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

        <!-- ── STEP 2: CLEAR CREDENTIALS (only shown if board has saved creds) ── -->
        <div
          v-if="alreadyConfigured || step === 2"
          class="bg-white border border-parchment-3 rounded-2xl overflow-hidden transition-opacity"
          :class="step < 2 ? 'opacity-40 pointer-events-none' : ''"
          style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        >
          <div class="px-5 py-4 border-b border-parchment-3 flex items-center gap-3">
            <StepBadge :n="2" :done="step > 2" :active="step === 2" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-ink">Clear saved credentials</p>
              <p class="text-xs text-ink-muted">Board has saved WiFi config — wipe it before reflashing</p>
            </div>
            <span v-if="step > 2" class="text-xs font-bold text-green-600 flex items-center gap-1 shrink-0">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              Cleared
            </span>
          </div>
          <div v-if="step === 2" class="px-5 py-4 flex flex-col gap-3">
            <p class="text-xs text-ink-muted">This ESP32 already has WiFi credentials saved. Click below to wipe them so the board will accept new ones after flashing.</p>
            <button
              class="self-start px-4 py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-40 flex items-center gap-2"
              :disabled="reconfiguring"
              @click="sendReconfigure"
            >
              <svg v-if="reconfiguring" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              {{ reconfiguring ? 'Clearing…' : 'Clear credentials' }}
            </button>
          </div>
        </div>

        <!-- ── STEP 3: FLASH ── -->
        <div
          class="bg-white border border-parchment-3 rounded-2xl overflow-hidden transition-opacity"
          :class="step < 3 ? 'opacity-40 pointer-events-none' : ''"
          style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        >
          <div class="px-5 py-4 border-b border-parchment-3 flex items-center gap-3">
            <StepBadge :n="3" :done="step > 3" :active="step === 3" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-ink">Flash firmware</p>
              <p class="text-xs text-ink-muted">Upload Kiln.Log firmware to the ESP32</p>
            </div>
            <span v-if="step > 3" class="text-xs font-bold text-green-600 flex items-center gap-1 shrink-0">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              Flashed
            </span>
          </div>
          <div v-if="step === 3" class="px-5 py-4 flex flex-col gap-4">
            <!-- Firmware status -->
            <div class="flex items-center gap-3 bg-parchment rounded-xl px-4 py-3">
              <svg v-if="firmwareLoading" class="w-4 h-4 animate-spin text-flame shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
              <svg v-else-if="firmwareData" class="w-4 h-4 text-green-600 shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              <svg v-else class="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
              <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-ink">
                  {{ firmwareLoading ? 'Downloading firmware…' : firmwareData ? 'kiln_sensor.bin ready' : 'Failed to load firmware' }}
                </p>
                <p v-if="firmwareData" class="text-[10px] text-ink-muted mt-0.5">{{ (firmwareData.length / 1024).toFixed(0) }} KB — ready to flash</p>
                <p v-if="firmwareLoadError" class="text-[10px] text-red-400 mt-0.5">{{ firmwareLoadError }}</p>
              </div>
              <button v-if="firmwareLoadError" class="text-xs text-flame font-semibold hover:underline shrink-0" @click="fetchFirmware">Retry</button>
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
                :disabled="!firmwareData || flashing"
                @click="flashFirmware"
              >
                <svg v-if="flashing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                {{ flashing ? 'Flashing…' : 'Flash firmware' }}
              </button>
              <button class="text-xs text-ink-faint hover:text-flame transition-colors" @click="skipToConfig">
                Skip — already flashed
              </button>
            </div>

            <p v-if="flashError" class="text-xs text-red-500">{{ flashError }}</p>
          </div>
        </div>

        <!-- ── STEP 4: CONFIGURE ── -->
        <div
          class="bg-white border border-parchment-3 rounded-2xl overflow-hidden transition-opacity"
          :class="step < 4 ? 'opacity-40 pointer-events-none' : ''"
          style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        >
          <div class="px-5 py-4 border-b border-parchment-3 flex items-center gap-3">
            <StepBadge :n="4" :done="step > 4" :active="step === 4" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-ink">Configure</p>
              <p class="text-xs text-ink-muted">Set WiFi credentials and API endpoint</p>
            </div>
          </div>
          <div v-if="step === 4" class="px-5 py-4 flex flex-col gap-4">

            <!-- Replug instruction shown after flash -->
            <div v-if="needsReplug" class="flex flex-col gap-3">
              <div class="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                <svg class="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                <div>
                  <p class="text-xs font-bold text-yellow-800">Unplug and replug your ESP32</p>
                  <p class="text-xs text-yellow-700 mt-0.5">After flashing the browser loses the serial connection. Unplug the USB cable, plug it back in, then click Reconnect below.</p>
                </div>
              </div>
              <button
                class="self-start px-4 py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-40 flex items-center gap-2"
                :disabled="connecting"
                @click="reconnectAfterFlash"
              >
                <svg v-if="connecting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                {{ connecting ? 'Connecting…' : 'Reconnect' }}
              </button>
            </div>

            <!-- Config form — shown once reconnected -->
            <template v-if="!needsReplug">
              <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">WiFi network (SSID)</label>
                  <input v-model="config.ssid" type="text" placeholder="YourWiFiName"
                    class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">WiFi password</label>
                  <input v-model="config.password" type="password" placeholder="••••••••"
                    class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <div class="flex items-center justify-between">
                    <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Kiln.Log API URL</label>
                    <button
                      class="text-[10px] text-ink-faint hover:text-flame transition-colors"
                      @click="config.apiUrl = window.location.origin"
                    >Reset to default</button>
                  </div>
                  <input
                    v-model="config.apiUrl"
                    type="text"
                    class="w-full border border-parchment-3 rounded-xl px-4 py-2.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-mono"
                  />
                  <p class="text-xs text-ink-muted">For local dev use your machine's IP e.g. <span class="font-mono">http://192.168.20.23:3000</span></p>
                </div>
              </div>

              <!-- Waiting for ESP32 to be ready -->
              <div v-if="!espReady" class="flex items-center gap-3 bg-parchment rounded-xl px-4 py-3">
                <svg class="w-4 h-4 animate-spin text-flame shrink-0" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                <p class="text-xs text-ink-muted">Waiting for ESP32 to boot… watch the Serial panel →</p>
              </div>
              <button
                v-else
                class="w-full py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                :disabled="!config.ssid.trim() || sending"
                @click="sendConfig"
              >
                <svg v-if="sending" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                {{ sending ? 'Sending…' : 'Send config & reboot →' }}
              </button>
              <p v-if="configError" class="text-xs text-red-500">{{ configError }}</p>
            </template>

          </div>
        </div>

        <!-- ── STEP 5: DONE ── -->
        <div
          v-if="step === 5"
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
          <NuxtLink to="/app" class="mt-1 px-5 py-2.5 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors">
            Go to Kiln.Log →
          </NuxtLink>
        </div>

      </div>

      <!-- Right: Debug panel (desktop only) -->
      <div class="hidden lg:flex flex-col gap-3 w-full max-w-lg shrink-0 sticky top-20 self-start">

        <!-- Serial log -->
        <div class="bg-ink rounded-xl overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.10)">
          <div class="px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-parchment-4">Serial</p>
              <p class="text-[10px] text-parchment-4/60 mt-0.5">See what's happening on your ESP32 board</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <button class="text-[10px] text-parchment-4 hover:text-flame transition-colors" @click="copySerialLog">
                <span v-if="serialCopied" class="text-green-400">Copied!</span>
                <span v-else>Copy</span>
              </button>
              <span class="text-white/20">|</span>
              <button class="text-[10px] text-parchment-4 hover:text-flame transition-colors" @click="serialLog = []">Clear</button>
            </div>
          </div>
          <div ref="logEl" class="px-4 py-3 font-mono text-[10px] max-h-96 overflow-y-auto flex flex-col gap-0.5">
            <div
              v-for="(line, i) in serialLog"
              :key="i"
              class="leading-relaxed"
              :class="line.type === 'error' ? 'text-red-400' : line.type === 'info' ? 'text-yellow-300' : 'text-green-400'"
            >{{ line.text }}</div>
            <div v-if="!serialLog.length" class="text-parchment-4 italic">No serial data yet…</div>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup>
definePageMeta({ middleware: ['auth'] })

// ── Web Serial ────────────────────────────────────────────────────────────────
const webSerialSupported = ref(false)

// ── State ─────────────────────────────────────────────────────────────────────
const step              = ref(1)
const connecting        = ref(false)
const connectError      = ref('')
const flashing          = ref(false)
const flashProgress     = ref(0)
const flashError        = ref('')
const firmwareData      = ref(null)
const firmwareLoading   = ref(false)
const firmwareLoadError = ref('')
const sending             = ref(false)
const espReady            = ref(false)  // true once ESP32 emits NEEDS_CONFIG or BOOT
const needsReplug         = ref(false)  // true after flash — user must replug
const alreadyConfigured   = ref(false)  // true when ESP32 boots with saved creds (KILN_LOG:READY)
const reconfiguring       = ref(false)  // true while sending {"reconfigure":true}
const configError         = ref('')
const serialLog         = ref([])
const debugLog          = ref([])
const logEl             = ref(null)
const flashOffset       = ref('0x10000')

const config = reactive({ ssid: '', password: '', apiUrl: '', token: '' })

// ── Computed helpers ──────────────────────────────────────────────────────────
const serialCopied = ref(false)
function copySerialLog() {
  const text = serialLog.value.map(l => l.text).join('\n')
  navigator.clipboard.writeText(text).then(() => {
    serialCopied.value = true
    setTimeout(() => { serialCopied.value = false }, 2000)
  })
}

onMounted(() => {
  webSerialSupported.value = 'serial' in navigator
  if (!config.apiUrl) config.apiUrl = window.location.origin
  // Pull token from query param if arriving from the sensors management page
  const params = new URLSearchParams(window.location.search)
  if (params.get('token')) config.token = params.get('token')
  dbg(`Web Serial supported: ${webSerialSupported.value}`)
})

let port          = null
let activeReader  = null
let writer        = null
let readingActive = false

// ── Debug ─────────────────────────────────────────────────────────────────────
function dbg(text) {
  const ts = new Date().toLocaleTimeString()
  debugLog.value.push(`[${ts}] ${text}`)
  console.log('[kiln-debug]', text)
}

// ── Serial log ────────────────────────────────────────────────────────────────
function log(text, type = 'normal') {
  serialLog.value.push({ text, type })
  nextTick(() => { if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight })
}

// ── Step 1: Connect ───────────────────────────────────────────────────────────
async function connectSerial() {
  dbg('connectSerial called')
  connecting.value   = true
  connectError.value = ''

  // Tear down any existing connection first
  await disconnectSerial()

  try {
    port = await navigator.serial.requestPort()
    await port.open({ baudRate: 115200 })
    writer = port.writable.getWriter()
    dbg('port opened')
    log('✅ Port opened at 115200 baud', 'info')
    alreadyConfigured.value = false
    startReading()
    step.value = 2
    fetchFirmware()
  } catch (e) {
    connectError.value = e.message ?? 'Could not open port'
    dbg('❌ ' + connectError.value)
    log('❌ ' + connectError.value, 'error')
  }
  connecting.value = false
}

async function reconnectAfterFlash() {
  connecting.value   = true
  connectError.value = ''
  try {
    port = await navigator.serial.requestPort()
    await port.open({ baudRate: 115200 })
    writer = port.writable.getWriter()
    needsReplug.value       = false
    espReady.value          = false
    alreadyConfigured.value = false
    log('✅ Reconnected — waiting for ESP32 to boot…', 'info')
    startReading()
  } catch (e) {
    connectError.value = e.message ?? 'Could not open port'
    log('❌ ' + connectError.value, 'error')
  }
  connecting.value = false
}

async function disconnectSerial() {
  dbg('disconnecting existing connection…')
  readingActive = false

  // Cancel active reader first — this unblocks any pending read()
  try { if (activeReader) { await activeReader.cancel() } } catch {}
  activeReader = null

  // Release writer lock
  try { if (writer) { writer.releaseLock() } } catch {}
  writer = null

  // Close port — try regardless of state, ignore all errors
  if (port) {
    try { await port.close() } catch {}
    port = null
  }

  // Give browser time to fully release the port
  await new Promise(r => setTimeout(r, 500))
  dbg('disconnected')
}

// ── Serial reader — uses getReader() not pipeTo() so lock can be released ─────
async function startReading() {
  readingActive = true
  dbg('startReading started')
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
            if (t === 'KILN_LOG:CONFIG_OK') step.value = 5
            if (t === 'KILN_LOG:NEEDS_CONFIG' || t === 'KILN_LOG:WAITING_CONFIG') {
              espReady.value = true
              alreadyConfigured.value = false
              log('✅ ESP32 ready for config', 'info')
              if (step.value === 3) step.value = 4
            }
            if (t === 'KILN_LOG:READY') {
              if (step.value < 4) {
                alreadyConfigured.value = true
                espReady.value = false
                dbg('ESP32 has saved credentials (KILN_LOG:READY)')
              } else {
                log('⚠️  Board rebooted with old creds — you can still send new config', 'info')
                espReady.value = true
              }
            }
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
  dbg('startReading ended')
}

// ── Stop reading and release all locks before esptool takes over ──────────────
async function stopReading() {
  dbg('stopReading called')
  readingActive = false
  // Cancel the active reader directly — unblocks pending read() immediately
  try { if (activeReader) { await activeReader.cancel(); activeReader = null } } catch {}
  // Release writer
  try { if (writer) { writer.releaseLock(); writer = null } } catch {}
  // Give the loop one tick to exit
  await new Promise(r => setTimeout(r, 100))
  dbg('stopReading done')
}

// ── Fetch firmware from server ────────────────────────────────────────────────
async function fetchFirmware() {
  firmwareLoading.value   = true
  firmwareLoadError.value = ''
  firmwareData.value      = null
  try {
    dbg('fetching /firmware/kiln_sensor.bin…')
    log('Downloading firmware from server…', 'info')
    const res = await fetch('/firmware/kiln_sensor.bin')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = await res.arrayBuffer()
    firmwareData.value = new Uint8Array(buf)
    dbg(`firmware ready: ${(firmwareData.value.length / 1024).toFixed(0)} KB`)
    log(`✅ Firmware ready — ${(firmwareData.value.length / 1024).toFixed(0)} KB`, 'info')
  } catch (e) {
    firmwareLoadError.value = e.message ?? 'Download failed'
    dbg('❌ firmware fetch failed: ' + firmwareLoadError.value)
    log('❌ Firmware download failed: ' + firmwareLoadError.value, 'error')
  }
  firmwareLoading.value = false
}

// ── Step 2: Flash ─────────────────────────────────────────────────────────────
async function flashFirmware() {
  if (!firmwareData.value || !port) return
  flashing.value      = true
  flashError.value    = ''
  flashProgress.value = 0

  try {
    dbg('importing esptool-js…')
    log('Loading esptool-js…', 'info')
    const { ESPLoader, Transport } = await import('esptool-js')
    dbg(`ESPLoader: ${typeof ESPLoader}, Transport: ${typeof Transport}`)

    // Release all locks before esptool takes over
    await stopReading()
    dbg('closing port…')
    await port.close()
    dbg('port closed')

    const transport = new Transport(port, true)
    const loader = new ESPLoader({
      transport,
      baudrate:    115200,
      romBaudrate: 115200,
      terminal: {
        clean:     () => {},
        writeLine: (s) => { log(s, 'info'); dbg(s) },
        write:     (s) => log(s, 'info'),
      },
    })

    dbg('connecting to ROM bootloader…')
    log('Connecting to ROM bootloader…', 'info')
    await loader.main()
    dbg('chip: ' + loader.chip.CHIP_NAME)
    log('Chip: ' + loader.chip.CHIP_NAME, 'info')

    const binary = firmwareData.value  // must stay as Uint8Array — Array.from() breaks subarray()
    const offset = parseInt(flashOffset.value, 16)
    dbg(`flashing ${(binary.length / 1024).toFixed(0)} KB at ${flashOffset.value}…`)
    log(`Flashing ${(binary.length / 1024).toFixed(0)} KB at ${flashOffset.value}…`, 'info')

    await loader.writeFlash({
      fileArray:  [{ data: binary, address: offset }],
      flashSize:  'keep', flashMode: 'keep', flashFreq: 'keep',
      eraseAll:   false,  compress:  true,
      reportProgress: (_i, written, total) => {
        flashProgress.value = Math.round((written / total) * 100)
      },
    })

    // hardReset was renamed in newer esptool-js versions
    if (typeof loader.hardReset === 'function') {
      await loader.hardReset()
    } else if (typeof loader.after_flash === 'function') {
      await loader.after_flash()
    } else {
      await transport.setDTR(false)
    }
    dbg('flash complete')
    log('✅ Flash complete — ESP32 rebooting', 'info')

    // esptool-js holds internal stream locks we cannot release — safest approach
    // is to drop the port reference and ask the user to replug
    dbg('flash done — releasing port reference')
    activeReader = null
    writer = null
    port = null
    espReady.value = false
    needsReplug.value = true
    step.value = 4

  } catch (e) {
    flashError.value = e.message ?? 'Flash failed'
    dbg('❌ flash error: ' + flashError.value)
    log('❌ Flash error: ' + flashError.value, 'error')
    try {
      if (port.writable && !port.writable.locked) writer = port.writable.getWriter()
      else if (!port.readable) { await port.open({ baudRate: 115200 }); writer = port.writable.getWriter() }
      startReading()
    } catch (re) { dbg('recovery failed: ' + re.message) }
  }
  flashing.value = false
}

// ── Skip flash — go straight to configure ─────────────────────────────────────
async function skipFlash() {
  step.value = 4
}

// ── Skip to configure with espReady true (used after clear-creds flow) ────────
function skipToConfig() {
  needsReplug.value = false
  espReady.value    = true
  step.value        = 4
}

// ── Reconfigure: clear NVS credentials on board ───────────────────────────────
async function sendReconfigure() {
  reconfiguring.value = true
  try {
    if (!writer) {
      dbg('writer missing for reconfigure — cannot send')
      log('❌ Not connected — cannot reconfigure', 'error')
      reconfiguring.value = false
      return
    }
    const payload = JSON.stringify({ reconfigure: true }) + '\n'
    await writer.write(new TextEncoder().encode(payload))
    dbg('sent {"reconfigure":true}')
    log('→ Clearing saved credentials on ESP32…', 'info')
    needsReplug.value = false
    step.value        = 3  // go to flash — user can flash or skip
  } catch (e) {
    log('❌ Reconfigure failed: ' + (e.message ?? e), 'error')
    dbg('❌ sendReconfigure error: ' + e.message)
  }
  reconfiguring.value = false
}

// ── Step 3: Configure ─────────────────────────────────────────────────────────
async function sendConfig() {
  if (!config.ssid.trim()) return
  sending.value     = true
  configError.value = ''
  try {
    // Ensure port is in a clean state before sending
    if (!writer) {
      dbg('writer missing — reopening port…')
      log('⏳ Reconnecting to ESP32…', 'info')
      try { if (activeReader) { await activeReader.cancel(); activeReader = null } } catch {}
      try { await port.close() } catch {}
      await new Promise(r => setTimeout(r, 500))
      await port.open({ baudRate: 115200 })
      writer = port.writable.getWriter()
      startReading()
      await new Promise(r => setTimeout(r, 500))
    }

    const payload = JSON.stringify({
      ssid:     config.ssid.trim(),
      password: config.password,
      apiUrl:   config.apiUrl.trim(),
      token:    config.token.trim(),
    }) + '\n'
    await writer.write(new TextEncoder().encode(payload))
    dbg('config sent')
    log('→ Config sent, waiting for ESP32…', 'info')
    setTimeout(() => {
      if (step.value === 4) {
        configError.value = 'No confirmation received — try clicking Send again.'
        sending.value = false
      }
    }, 15000)
  } catch (e) {
    configError.value = e.message ?? 'Send failed'
    dbg('❌ sendConfig error: ' + configError.value)
    log('❌ ' + configError.value, 'error')
    sending.value = false
  }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────
onUnmounted(async () => {
  readingActive = false
  try { if (activeReader) { await activeReader.cancel(); activeReader = null } } catch {}
  try { if (writer) { writer.releaseLock(); writer = null } } catch {}
  try { if (port) await port.close() } catch {}
})
</script>