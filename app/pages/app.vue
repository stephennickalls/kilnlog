<template>
  <div class="flex flex-col h-screen overflow-hidden bg-parchment font-serif">

    <!-- ── HEADER ── -->
    <header class="shrink-0 flex items-center justify-between px-4 py-3 bg-parchment border-b border-parchment-3">
      <div class="flex items-center gap-2">
        <button class="sm:hidden p-1.5 -ml-1 rounded-lg text-ink-muted active:bg-parchment-2" @click="showFiringSheet = true">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </button>
        <h1 class="text-base font-bold text-ink tracking-tight">Kiln.Log</h1>
      </div>

      <div class="flex items-center gap-2 min-w-0">
        <template v-if="selectedFiring">
          <span class="text-xs font-semibold text-ink-muted truncate max-w-[100px] sm:max-w-none">{{ selectedFiring.name }}</span>
          <span v-if="isLive && signalLost && !isManual" class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 shrink-0">Signal lost</span>
          <span v-else-if="isLive && !isManual" class="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-green-50 border border-green-200 text-green-700 shrink-0">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>Live
          </span>
          <span v-else-if="isLive && isManual" class="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 border border-blue-200 text-blue-700 shrink-0">
            <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>Manual
          </span>
          <template v-else-if="selectedFiring.ended_at">
            <span v-if="selectedFiring.started_at" class="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 border border-amber-200 text-amber-700 shrink-0">
              <span class="w-1.5 h-1.5 bg-amber-400 rounded-full"></span>Finished
            </span>
            <span v-else class="px-2 py-0.5 text-[10px] font-bold rounded-full bg-parchment-2 border border-parchment-3 text-ink-faint shrink-0">Done</span>
            <button v-if="selectedFiring.started_at && !activeFiring" class="px-2.5 py-1 text-[10px] font-bold border border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg transition-colors shrink-0" @click="restartFiring(selectedFiring)">↺ Restart</button>
          </template>
          <button v-if="activeFiring && selectedFiring.id === activeFiring.id" class="px-2.5 py-1 text-[10px] font-bold border border-red-300 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0" @click="endFiring">End</button>
        </template>
        <NuxtLink to="/sensors" class="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-ink-muted hover:text-ink hover:bg-parchment-2 rounded-lg transition-colors ml-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
          </svg>
          Sensors
        </NuxtLink>
        <NuxtLink to="/account" class="hidden sm:flex items-center gap-1 px-2 py-1 text-xs text-ink-muted hover:text-ink hover:bg-parchment-2 rounded-lg transition-colors ml-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          Account
        </NuxtLink>
      </div>
    </header>

    <!-- ── BODY ── -->
    <div class="flex flex-1 overflow-hidden">

      <!-- Desktop sidebar -->
      <FiringSidebar
        class="hidden sm:flex"
        :open="sidebarOpen"
        :width="sidebarWidth"
        :selected-id="selectedFiring?.id ?? null"
        :active-firing="activeFiring"
        :past-firings="pastFirings"
        @toggle="sidebarOpen = !sidebarOpen"
        @select="selectFiring"
        @start="openStartModal"
        @drag="startDrag"
        @delete="deleteFiring"
        @restart="restartFiring"
      />

      <main class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- ── DESKTOP ── -->
        <div class="hidden sm:flex flex-col flex-1 overflow-hidden">

          <!-- Stats strip -->
          <div v-if="selectedFiring" class="shrink-0 flex items-stretch border-b border-parchment-3 bg-parchment">
            <!-- NOW -->
            <button
              class="flex flex-col items-center py-3 px-6 border-r border-parchment-3 hover:bg-parchment-2 transition-colors"
              @click="showTempModal = true"
            >
              <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Temp</span>
              <span class="text-2xl font-bold leading-none tabular-nums" :class="currentTemp !== null ? 'text-flame' : 'text-parchment-3'">
                {{ currentTemp !== null ? Math.round(currentTemp) : '—' }}
              </span>
              <span class="text-[9px] mt-0.5" :class="currentTemp !== null ? 'text-flame-light' : 'text-parchment-3'">°C</span>
            </button>
            <!-- RATE -->
            <div class="flex flex-col items-center py-3 px-6 border-r border-parchment-3">
              <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Rate</span>
              <span class="text-xl font-bold leading-none tabular-nums" :class="rateOfChange && rateOfChange !== '—' ? 'text-green-600' : 'text-ink-faint'">{{ rateOfChange ?? '—' }}</span>
            </div>
            <!-- ELAPSED -->
            <div class="flex flex-col items-center py-3 px-6 border-r border-parchment-3">
              <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Time</span>
              <span class="text-xl font-bold leading-none tabular-nums text-ink">{{ isLive ? elapsed : '—' }}</span>
            </div>
            <!-- PEAK -->
            <div class="flex flex-col items-center py-3 px-6 border-r border-parchment-3">
              <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Peak</span>
              <span class="text-2xl font-bold leading-none tabular-nums text-ink">{{ peakTemp !== null ? Math.round(peakTemp) : '—' }}</span>
              <span class="text-[9px] text-ink-faint mt-0.5">°C</span>
            </div>
            <!-- READINGS -->
            <div class="flex flex-col items-center py-3 px-6 border-r border-parchment-3">
              <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Readings</span>
              <span class="text-xl font-bold leading-none tabular-nums text-ink">{{ readingCount }}</span>
            </div>
            <!-- ACTION BUTTONS -->
            <div v-if="selectedFiring" class="flex items-center gap-2 px-4 ml-auto">
              <button
                v-if="isLive && isManual"
                class="px-4 py-2 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors"
                @click="openLogReading"
              >+ Log reading</button>
              <button
                v-if="isLive"
                class="px-4 py-2 text-sm font-bold rounded-xl border transition-colors"
                :class="isManual ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100' : 'border-parchment-3 bg-parchment-2 text-ink-muted hover:bg-parchment-3'"
                @click="toggleMode"
              >⇅ {{ isManual ? 'Switch to Connected' : 'Switch to Manual' }}</button>
              <!-- Sensor assignment button — always visible when a firing is selected -->
              <button
                class="flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-xl border transition-colors"
                :class="showSensorPanel ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-parchment-3 bg-parchment-2 text-ink-muted hover:bg-parchment-3'"
                @click="showSensorPanel = !showSensorPanel"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
                Sensors
                <span v-if="assignedSensors.length" class="text-[10px] bg-flame text-parchment rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {{ assignedSensors.length }}
                </span>
              </button>
            </div>
          </div>

          <!-- Sensor panel — visible for any selected firing -->
          <div v-if="selectedFiring && showSensorPanel" class="shrink-0 border-b border-parchment-3 bg-white px-4 py-3 flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Sensors</p>
              <button class="text-[10px] text-ink-faint hover:text-flame transition-colors" @click="showSensorPanel = false">Done</button>
            </div>

            <!-- Linked sensors -->
            <div class="flex flex-col gap-2">
              <p class="text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Linked to this firing</p>
              <div v-if="assignedSensors.length" class="flex flex-col gap-2">
                <div
                  v-for="s in assignedSensors"
                  :key="s.id"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-parchment border-parchment-3"
                >
                  <svg class="w-4 h-4 shrink-0 text-ink-faint" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
                  <span class="text-sm font-semibold text-ink flex-1 truncate">{{ s.name }}</span>
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1"
                    :class="s.online ? 'bg-green-50 text-green-700 border-green-200' : 'bg-parchment-2 text-ink-faint border-parchment-3'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="s.online ? 'bg-green-500 animate-pulse' : 'bg-parchment-4'"></span>
                    {{ s.online ? 'Online' : 'Offline' }}
                  </span>
                  <!-- Settings link -->
                  <NuxtLink
                    to="/sensors"
                    class="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-parchment-2 transition-colors shrink-0"
                    title="Manage sensor"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                    </svg>
                  </NuxtLink>
                  <!-- Unlink button -->
                  <button
                    class="text-xs font-semibold text-ink-muted hover:text-red-500 border border-parchment-3 hover:border-red-300 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                    @click="removeSensorFromFiring(s.sensor_id ?? s.id)"
                  >Unlink</button>
                </div>
              </div>
              <p v-else class="text-xs text-ink-faint py-1">No sensors linked to this firing yet.</p>
            </div>

            <!-- Available to link -->
            <div v-if="unassignedSensors.length" class="flex flex-col gap-2">
              <p class="text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Link a sensor</p>
              <div class="flex flex-col gap-2">
                <div
                  v-for="s in unassignedSensors"
                  :key="s.id"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-parchment-3 bg-parchment"
                >
                  <svg class="w-4 h-4 shrink-0 text-ink-faint" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/></svg>
                  <span class="text-sm font-semibold text-ink flex-1 truncate">{{ s.name }}</span>
                  <span
                    class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1"
                    :class="s.online ? 'bg-green-50 text-green-700 border-green-200' : 'bg-parchment-2 text-ink-faint border-parchment-3'"
                  >
                    <span class="w-1.5 h-1.5 rounded-full" :class="s.online ? 'bg-green-500 animate-pulse' : 'bg-parchment-4'"></span>
                    {{ s.online ? 'Online' : 'Offline' }}
                  </span>
                  <!-- Settings link -->
                  <NuxtLink
                    to="/sensors"
                    class="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-parchment-2 transition-colors shrink-0"
                    title="Manage sensor"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
                      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                    </svg>
                  </NuxtLink>
                  <button
                    class="text-xs font-semibold text-flame border border-flame/30 hover:bg-flame hover:text-parchment px-2.5 py-1 rounded-lg transition-colors shrink-0"
                    @click="addSensorToFiring(s.id)"
                  >Link</button>
                </div>
              </div>
            </div>

            <div v-if="!sensors.length" class="text-xs text-ink-faint">
              No sensors registered yet. <NuxtLink to="/sensors" class="text-flame font-semibold hover:underline">Add one →</NuxtLink>
            </div>
          </div>

          <div class="flex-1 m-4 mt-3 bg-white rounded-xl border border-parchment-3 relative min-h-0 flex items-center justify-center" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
            <canvas ref="chartCanvas" class="w-full h-full"></canvas>
            <button v-if="selectedFiring" class="absolute bottom-3 right-3 px-3 py-1.5 text-xs font-medium border border-parchment-3 rounded-lg bg-parchment text-ink-faint hover:bg-parchment-2 transition-colors" @click="resetZoom">Reset zoom</button>
            <div v-if="isManual && isLive && !selectedFiring?.readings?.length" class="absolute flex flex-col items-center gap-2 text-ink-muted pointer-events-none">
              <p class="text-sm">Use <strong class="text-ink">Log Reading</strong> to record your first temperature</p>
            </div>
            <div v-else-if="!selectedFiring" class="absolute flex flex-col items-center gap-3 text-ink-muted">
              <p class="text-sm">Select a firing from the sidebar or start a new one</p>
            </div>
          </div>
        </div>

        <!-- ── MOBILE ── -->
        <div class="flex flex-col flex-1 sm:hidden overflow-hidden">

          <!-- Empty state -->
          <div v-if="!selectedFiring" class="flex-1 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div class="w-14 h-14 bg-parchment-2 border border-parchment-3 rounded-xl flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M3 17l4-4 3 3 4-5 5 6" stroke="#b05c1a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 5h18" stroke="#b05c1a" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <p class="font-bold text-ink mb-1">No firing selected</p>
              <p class="text-sm text-ink-muted">Start a new firing or tap the menu to view past ones</p>
            </div>
            <button class="bg-flame text-parchment px-6 py-3 rounded-lg text-sm font-bold hover:bg-flame-dark transition-colors" @click="openStartModal">+ Start firing</button>
            <button class="text-sm text-flame font-semibold" @click="showFiringSheet = true">View past firings</button>
          </div>

          <template v-else>
            <!-- Stats strip -->
            <div class="shrink-0 grid grid-cols-3 border-b border-parchment-3 bg-parchment">
              <button class="flex flex-col items-center py-3 px-1 border-r border-parchment-3 active:bg-parchment-2" @click="showTempModal = true">
                <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Temp</span>
                <span class="text-xl font-bold leading-none tabular-nums" :class="currentTemp !== null ? 'text-flame' : 'text-parchment-3'">
                  {{ currentTemp !== null ? Math.round(currentTemp) : '—' }}
                </span>
                <span class="text-[9px] text-flame-light mt-0.5">°C</span>
              </button>
              <div class="flex flex-col items-center py-3 px-1 border-r border-parchment-3">
                <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Rate</span>
                <span class="text-lg font-bold leading-none tabular-nums" :class="rateOfChange && rateOfChange !== '—' ? 'text-green-600' : 'text-ink-faint'">{{ rateOfChange ?? '—' }}</span>
              </div>
              <div class="flex flex-col items-center py-3 px-1">
                <span class="text-[9px] font-bold uppercase tracking-widest text-ink-faint mb-1">Time</span>
                <span class="text-lg font-bold leading-none tabular-nums text-ink">{{ isLive ? elapsed : '—' }}</span>
              </div>
            </div>

            <!-- Chart — always visible, touch-enabled -->
            <div class="flex-1 mx-3 mt-3 mb-2 bg-white rounded-xl border border-parchment-3 relative overflow-hidden" style="box-shadow:0 2px 12px rgba(58,30,8,0.06)">
              <canvas ref="chartCanvasMobile" class="w-full h-full touch-none"></canvas>
              <button class="absolute bottom-2 right-2 px-2.5 py-1 text-[10px] font-medium border border-parchment-3 rounded-lg bg-parchment text-ink-faint active:bg-parchment-2" @click="resetZoomMobile">Reset zoom</button>
              <div v-if="isManual && isLive && !selectedFiring?.readings?.length" class="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p class="text-xs text-ink-muted text-center px-6">Log your first reading to see the curve</p>
              </div>
            </div>

            <!-- Action bar -->
            <div class="shrink-0 px-3 pb-3 pt-1 flex gap-2">
              <button v-if="isLive && isManual" class="flex-1 py-3 bg-flame text-parchment text-sm font-bold rounded-lg active:bg-flame-dark transition-colors" @click="openLogReading">+ Log reading</button>
              <button v-if="isLive" class="py-3 px-4 border rounded-lg text-xs font-bold shrink-0 transition-colors" :class="isManual ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-parchment-3 bg-parchment-2 text-ink-muted'" @click="toggleMode">{{ isManual ? 'Manual' : 'Connected' }}</button>
              <button v-if="!isLive && !activeFiring && selectedFiring?.started_at && selectedFiring?.ended_at" class="flex-1 py-3 bg-amber-500 text-white text-sm font-bold rounded-lg active:bg-amber-600 transition-colors" @click="restartFiring(selectedFiring)">↺ Restart firing</button>
              <button v-else-if="!isLive && !activeFiring" class="flex-1 py-3 bg-flame text-parchment text-sm font-bold rounded-lg active:bg-flame-dark transition-colors" @click="openStartModal">+ Start firing</button>
            </div>
          </template>
        </div>
      </main>
    </div>

    <!-- ── MOBILE FIRING SHEET ── -->
    <Teleport to="body">
      <div v-if="showFiringSheet" class="fixed inset-0 z-50 flex flex-col justify-end sm:hidden" style="background:rgba(26,18,8,0.6)" @click.self="showFiringSheet = false">
        <div class="bg-parchment rounded-t-2xl flex flex-col" style="max-height:80vh">
          <div class="flex justify-center pt-3 pb-1 shrink-0">
            <div class="w-10 h-1 bg-parchment-3 rounded-full"></div>
          </div>
          <div class="flex items-center justify-between px-4 py-2 border-b border-parchment-3 shrink-0">
            <h2 class="text-sm font-bold text-ink">Firings</h2>
            <button class="p-1 text-ink-muted" @click="showFiringSheet = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <ul class="overflow-y-auto flex-1 divide-y divide-parchment-3">
            <li v-if="activeFiring">
              <button class="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-parchment-2 transition-colors" :class="selectedFiring?.id === activeFiring.id ? 'bg-flame-bg border-l-2 border-flame' : ''" @click="selectFiring(activeFiring); showFiringSheet = false">
                <div class="w-2 h-2 rounded-full bg-green-500 shrink-0 animate-pulse"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-bold text-ink truncate">{{ activeFiring.name }}</p>
                  <p class="text-xs text-green-600 mt-0.5 font-semibold">Live</p>
                </div>
                <svg class="w-4 h-4 text-ink-faint shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
              </button>
            </li>
            <li v-if="!pastFirings.length && !activeFiring" class="px-4 py-8 text-sm text-ink-muted text-center">No firings yet</li>
            <li v-for="f in pastFirings" :key="f.id" class="relative">
              <button class="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-parchment-2 pr-16 transition-colors" :class="selectedFiring?.id === f.id ? 'bg-flame-bg border-l-2 border-flame' : ''" @click="selectFiring(f); showFiringSheet = false">
                <div class="w-2 h-2 rounded-full shrink-0" :class="f.started_at && f.ended_at ? 'bg-amber-400' : 'bg-parchment-4'"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-semibold text-ink truncate">{{ f.name }}</p>
                  <p v-if="f.started_at && f.ended_at" class="text-xs text-amber-600 mt-0.5 font-semibold">Finished</p>
                  <p v-else class="text-xs text-ink-faint mt-0.5">{{ formatDate(f.created_at) }}</p>
                </div>
              </button>
              <div class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button v-if="f.started_at && f.ended_at && !activeFiring && sheetConfirmDeleteId !== f.id" class="px-2 py-1 rounded text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 active:bg-amber-100" @click.stop="restartFiring(f); showFiringSheet = false">↺</button>
                <button v-if="sheetConfirmDeleteId !== f.id" class="p-2 text-parchment-4 active:text-red-400" @click.stop="sheetConfirmDeleteId = f.id">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>
                </button>
                <button v-else class="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white bg-red-500" @click.stop="sheetDeleteFiring(f)">Delete?</button>
              </div>
            </li>
          </ul>
          <div class="p-3 border-t border-parchment-3 shrink-0">
            <button class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-lg active:bg-flame-dark transition-colors" @click="openStartModal(); showFiringSheet = false">+ Start firing</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── MODALS ── -->
    <KilnTempModal :open="showTempModal" :temp="currentTemp" :peak-temp="peakTemp" :rate-of-change="rateOfChange" :elapsed="elapsed" :is-live="isLive" :firing-name="selectedFiring?.name" @close="showTempModal = false" />
    <StartFiringModal :open="showStartModal" :library="library" :sensors="sensors" @close="showStartModal = false" @create="createFiring" />
    <ManualReadingModal :open="showReadingModal" :started-at="selectedFiring?.started_at ?? 0" :is-edit="!!editingReading" :edit-temp="editingReading?.y ?? null" :edit-ts="editingReading?.ts ?? null" @close="closeReadingModal" @save="saveReading" @delete="deleteReading" />

  </div>
</template>

<script setup>
import { useKilnChart } from '~/composables/useKilnChart'

definePageMeta({ middleware: ['auth'] })

const chartCanvas           = ref(null)
const chartCanvasMobile     = ref(null)
const editingReading        = ref(null)
const showReadingModal      = ref(false)
const showFiringSheet       = ref(false)
const sheetConfirmDeleteId  = ref(null)
const showStartModal        = ref(false)
const showTempModal         = ref(false)
const allFirings            = ref([])
const selectedFiring        = ref(null)
const currentTemp           = ref(null)
const isLive                = ref(false)
const isManual              = ref(false)
const signalLost            = ref(false)
const lastReadingTime       = ref(null)
const library               = ref([])
const sensors               = ref([])
const showSensorPanel       = ref(false)

const { init, setSchedule, setReadings, setManualMode, setSignalLost, clearSignalLost, resetZoom, destroy } = useKilnChart(chartCanvas, {
  enableZoom: true,
  onPointClick: (point) => {
    if (!isManual.value || !isLive.value) return
    editingReading.value = { id: point.raw?.id ?? point.id, ts: point.raw?.ts ?? point.ts, y: point.y, x: point.x }
    showReadingModal.value = true
  },
})

const { init: initMobile, setSchedule: setScheduleMobile, setReadings: setReadingsMobile, resetZoom: resetZoomMobile, destroy: destroyMobile } = useKilnChart(chartCanvasMobile, { enableZoom: true })


const SIGNAL_TIMEOUT = 30
const sidebarOpen    = ref(true)
const sidebarWidth   = ref(280)
const MIN_WIDTH      = 180
const isDragging     = ref(false)
let pollInterval = null, signalCheckInterval = null, elapsedTickInterval = null
const nowUnix = ref(Math.floor(Date.now() / 1000))

const activeFiring = computed(() => allFirings.value.find(f => f.started_at && !f.ended_at) ?? null)
const pastFirings  = computed(() => allFirings.value.filter(f => f.ended_at).sort((a, b) => b.created_at - a.created_at))
const peakTemp     = computed(() => { if (!selectedFiring.value?.readings?.length) return null; return Math.max(...selectedFiring.value.readings.map(r => r.temperature)) })
const duration     = computed(() => { const f = selectedFiring.value; if (!f?.started_at || !f?.ended_at) return null; const mins = Math.round((f.ended_at - f.started_at) / 60), h = Math.floor(mins / 60), m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m` })
const readingCount = computed(() => selectedFiring.value?.readings?.length ?? 0)
const rateOfChange = computed(() => { const readings = selectedFiring.value?.readings; if (!readings || readings.length < 6) return '—'; const recent = readings.slice(-6), deltaTemp = recent[recent.length - 1].temperature - recent[0].temperature, deltaMins = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 60; if (deltaMins === 0) return '—'; const rate = Math.round(deltaTemp / deltaMins); return rate >= 0 ? `+${rate}°/m` : `${rate}°/m` })
const elapsed      = computed(() => { const f = selectedFiring.value; if (!f?.started_at) return '—'; const mins = Math.round((nowUnix.value - f.started_at) / 60), h = Math.floor(mins / 60), m = mins % 60; return h > 0 ? `${h}h ${m}m` : `${m}m` })

// Sensors actually linked to this firing, enriched with online status from the sensors ref
const assignedSensors = computed(() => {
  const rows = selectedFiring.value?.sensors ?? []
  // rows are { sensor_id, role, sensors: { id, name } }
  return rows.map(r => {
    const id   = r.sensors?.id   ?? r.sensor_id
    const name = r.sensors?.name ?? r.sensor_id
    const meta = sensors.value.find(s => s.id === id)
    return { ...r, id, name, online: meta?.online ?? false }
  })
})

// User's sensors not yet linked to this firing
const unassignedSensors = computed(() => {
  const assignedIds = new Set(assignedSensors.value.map(s => s.sensor_id ?? s.id))
  return sensors.value.filter(s => !assignedIds.has(s.id))
})

async function addSensorToFiring(sensorId) {
  if (!selectedFiring.value) return
  await $fetch(`/api/firings/${selectedFiring.value.id}/sensors`, { method: 'POST', body: { sensorId } })
  // Refresh firing data so sensor list updates
  const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)
  selectedFiring.value.sensors = data.sensors
}

async function removeSensorFromFiring(sensorId) {
  if (!selectedFiring.value) return
  await $fetch(`/api/firings/${selectedFiring.value.id}/sensors/${sensorId}`, { method: 'DELETE' })
  const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)
  selectedFiring.value.sensors = data.sensors
}

function formatDate(unix) { if (!unix) return ''; return new Date(unix * 1000).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }
function stopAllIntervals() { if (pollInterval) { clearInterval(pollInterval); pollInterval = null } if (signalCheckInterval) { clearInterval(signalCheckInterval); signalCheckInterval = null } if (elapsedTickInterval) { clearInterval(elapsedTickInterval); elapsedTickInterval = null } }

function startDrag(e) {
  isDragging.value = true
  const startX = e.clientX, startWidth = sidebarWidth.value, maxWidth = () => Math.floor(window.innerWidth / 3)
  function onMove(e) { sidebarWidth.value = Math.min(Math.max(startWidth + e.clientX - startX, MIN_WIDTH), maxWidth()) }
  function onUp() { isDragging.value = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); document.body.style.cursor = document.body.style.userSelect = '' }
  document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp)
}

async function openStartModal() {
  if (!library.value.length) library.value = await $fetch('/api/library')
  const raw = await $fetch('/api/sensors')
  // Sensors that have posted a reading in the last 30s are considered online
  const now = Math.floor(Date.now() / 1000)
  sensors.value = raw.map(s => ({ ...s, online: false })) // online status — will wire up later
  showStartModal.value = true
}
function openLogReading() { editingReading.value = null; showReadingModal.value = true }
function closeReadingModal() { showReadingModal.value = false; editingReading.value = null }

async function saveReading(payload) {
  if (!selectedFiring.value) return
  if (editingReading.value) { const id = editingReading.value.id ?? editingReading.value.raw?.id; await $fetch(`/api/readings/${id}`, { method: 'PUT', body: { temperature: payload.temperature } }) }
  else await $fetch('/api/readings', { method: 'POST', body: { firingId: selectedFiring.value.id, temperature: payload.temperature, timestamp: payload.timestamp } })
  closeReadingModal(); await reloadReadings()
}

async function deleteReading() { if (!editingReading.value) return; const id = editingReading.value.id ?? editingReading.value.raw?.id; await $fetch(`/api/readings/${id}`, { method: 'DELETE' }); closeReadingModal(); await reloadReadings() }

async function reloadReadings() {
  if (!selectedFiring.value) return
  const data = await $fetch(`/api/firings/${selectedFiring.value.id}`)
  selectedFiring.value.readings = data.readings
  setReadings(data.readings, selectedFiring.value.started_at)
  setReadingsMobile(data.readings, selectedFiring.value.started_at)
  if (data.readings?.length) { currentTemp.value = data.readings.at(-1).temperature; lastReadingTime.value = data.readings.at(-1).timestamp }
}

async function toggleMode() {
  if (!selectedFiring.value || !isLive.value) return
  const newMode = isManual.value ? 'connected' : 'manual'
  await $fetch(`/api/firings/${selectedFiring.value.id}`, { method: 'PUT', body: { mode: newMode } })
  selectedFiring.value.mode = newMode; applyMode(newMode)
}

function applyMode(mode) {
  isManual.value = mode === 'manual'; setManualMode(isManual.value)
  if (isManual.value) { if (pollInterval) { clearInterval(pollInterval); pollInterval = null } if (signalCheckInterval) { clearInterval(signalCheckInterval); signalCheckInterval = null } signalLost.value = false; clearSignalLost() }
  else startPolling()
}

async function sheetDeleteFiring(f) { sheetConfirmDeleteId.value = null; showFiringSheet.value = false; await deleteFiring(f) }

onMounted(async () => { await init(); await refreshFirings(); if (activeFiring.value) await selectFiring(activeFiring.value); sensors.value = await $fetch('/api/sensors') })
onUnmounted(() => { stopAllIntervals(); destroy(); destroyMobile() })
async function refreshFirings() { allFirings.value = await $fetch('/api/firings') }

async function selectFiring(f) {
  stopAllIntervals(); isLive.value = isManual.value = signalLost.value = false; currentTemp.value = lastReadingTime.value = null
  showSensorPanel.value = false
  const data = await $fetch(`/api/firings/${f.id}`)
  selectedFiring.value = data
  setSchedule(data.schedule ?? []); setReadings(data.readings ?? [], data.started_at)
  await nextTick(); await initMobile()
  setScheduleMobile(data.schedule ?? []); setReadingsMobile(data.readings ?? [], data.started_at)
  if (data.readings?.length) { const last = data.readings.at(-1); currentTemp.value = last.temperature; lastReadingTime.value = last.timestamp }
  const isActive = !!(data.started_at && !data.ended_at)
  const mode = data.mode ?? 'connected'; isManual.value = mode === 'manual'; setManualMode(isManual.value)
  if (isActive) {
    isLive.value = true
    elapsedTickInterval = setInterval(() => { nowUnix.value = Math.floor(Date.now() / 1000) }, 1000)
    if (!isManual.value) {
      if (!data.readings?.length) { signalLost.value = true; setSignalLost(data.started_at, null) }
      else { const secs = Math.floor(Date.now() / 1000) - lastReadingTime.value; if (secs > SIGNAL_TIMEOUT) { signalLost.value = true; setSignalLost(data.started_at, lastReadingTime.value) } }
      startPolling()
    }
  }
}

async function createFiring(payload) {
  const firing = await $fetch('/api/firings', { method: 'POST', body: payload })
  await $fetch(`/api/firings/${firing.id}`, { method: 'PUT', body: { startedAt: Math.floor(Date.now() / 1000) } })
  showStartModal.value = false; await refreshFirings()
  const fresh = allFirings.value.find(f => f.id === firing.id); await selectFiring(fresh ?? firing)
}

async function endFiring() {
  if (!activeFiring.value) return
  const id = activeFiring.value.id
  await $fetch(`/api/firings/${id}`, { method: 'PUT', body: { endedAt: Math.floor(Date.now() / 1000) } })
  stopAllIntervals(); signalLost.value = isLive.value = false; currentTemp.value = null
  await refreshFirings()
  if (selectedFiring.value?.id === id) {
    const data = await $fetch(`/api/firings/${id}`)
    selectedFiring.value = data; setSchedule(data.schedule ?? []); setReadings(data.readings ?? [], data.started_at)
    setScheduleMobile(data.schedule ?? []); setReadingsMobile(data.readings ?? [], data.started_at)
  }
}

async function restartFiring(f) {
  // Guard: only restart a finished firing (has both started_at and ended_at), and only if nothing else is active
  if (!f?.started_at || !f?.ended_at || activeFiring.value) return
  await $fetch(`/api/firings/${f.id}`, { method: 'PUT', body: { endedAt: null } })
  await refreshFirings()
  // Re-select so charts and state re-initialise properly (picks up isActive = true)
  const fresh = allFirings.value.find(fi => fi.id === f.id)
  await selectFiring(fresh ?? f)
}

async function deleteFiring(f) {
  await $fetch(`/api/firings/${f.id}`, { method: 'DELETE' })
  if (selectedFiring.value?.id === f.id) { stopAllIntervals(); selectedFiring.value = currentTemp.value = null; isLive.value = isManual.value = signalLost.value = false; clearSignalLost() }
  await refreshFirings()
}

function startPolling() {
  if (pollInterval) clearInterval(pollInterval); if (signalCheckInterval) clearInterval(signalCheckInterval)
  pollInterval = setInterval(async () => {
    if (!selectedFiring.value || isManual.value) return
    const rows = await $fetch(`/api/readings?firingId=${selectedFiring.value.id}`)
    selectedFiring.value.readings = rows; setReadings(rows, selectedFiring.value.started_at); setReadingsMobile(rows, selectedFiring.value.started_at)
    if (rows.length) { const last = rows.at(-1); currentTemp.value = last.temperature; lastReadingTime.value = last.timestamp; isLive.value = true; if (signalLost.value) { signalLost.value = false; clearSignalLost() } }
  }, 5000)
  signalCheckInterval = setInterval(() => {
    if (!selectedFiring.value || isManual.value) return
    const now = Math.floor(Date.now() / 1000)
    if (!lastReadingTime.value) { if (now - selectedFiring.value.started_at > SIGNAL_TIMEOUT) { signalLost.value = true; setSignalLost(selectedFiring.value.started_at, null) } return }
    if (now - lastReadingTime.value > SIGNAL_TIMEOUT) { signalLost.value = true; setSignalLost(selectedFiring.value.started_at, lastReadingTime.value) }
  }, 5000)
}
</script>

<style>
.btn-primary { @apply px-4 py-1.5 bg-flame hover:bg-flame-dark text-parchment text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed; }
.btn-danger  { @apply px-4 py-1.5 border border-red-300 text-red-500 hover:bg-red-50 text-sm font-medium rounded-lg transition-colors; }
.btn-ghost   { @apply px-4 py-1.5 border border-parchment-3 text-ink-muted hover:bg-parchment-2 text-sm font-medium rounded-lg transition-colors; }
.input       { @apply w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-flame/20 focus:border-flame font-serif; }
.label       { @apply text-xs font-bold uppercase tracking-widest text-ink-faint; }
</style>