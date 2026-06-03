<!-- app/components/FiringSensorPanel.vue -->
<template>
  <div class="shrink-0 border-b border-parchment-3 bg-white px-4 py-3 flex flex-col gap-4">

    <div class="flex items-center justify-between">
      <p class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Sensors</p>
      <button class="text-[10px] text-ink-faint hover:text-flame transition-colors" @click="$emit('close')">Done</button>
    </div>

    <!-- Linked sensors -->
    <div class="flex flex-col gap-2">
      <p class="text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Linked to this firing</p>
      <div v-if="assignedSensors.length" class="flex flex-col gap-2">
        <div v-for="s in assignedSensors" :key="s.id" class="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-parchment border-parchment-3">
          <svg class="w-4 h-4 shrink-0 text-ink-faint" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
          </svg>
          <span class="text-sm font-semibold text-ink flex-1 truncate">{{ s.name }}</span>
          <span
class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1"
            :class="s.online ? 'bg-green-50 text-green-700 border-green-200' : 'bg-parchment-2 text-ink-faint border-parchment-3'">
            <span class="w-1.5 h-1.5 rounded-full" :class="s.online ? 'bg-green-500 animate-pulse' : 'bg-parchment-4'"/>
            {{ s.online ? 'Online' : 'Offline' }}
          </span>
          <NuxtLink to="/sensors" class="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-parchment-2 transition-colors shrink-0" title="Manage sensor">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </NuxtLink>
          <button
            class="text-xs font-semibold text-ink-muted hover:text-red-500 border border-parchment-3 hover:border-red-300 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors shrink-0"
            @click="$emit('unlink', s.sensor_id ?? s.id)"
          >Unlink</button>
        </div>
      </div>
      <p v-else class="text-xs text-ink-faint py-1">No sensors linked to this firing yet.</p>
    </div>

    <!-- Available to link -->
    <div v-if="unassignedSensors.length" class="flex flex-col gap-2">
      <p class="text-[10px] font-semibold text-ink-faint uppercase tracking-wider">Link a sensor</p>
      <div class="flex flex-col gap-2">
        <div v-for="s in unassignedSensors" :key="s.id" class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-parchment-3 bg-parchment">
          <svg class="w-4 h-4 shrink-0 text-ink-faint" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"/>
          </svg>
          <span class="text-sm font-semibold text-ink flex-1 truncate">{{ s.name }}</span>
          <span
class="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 flex items-center gap-1"
            :class="s.online ? 'bg-green-50 text-green-700 border-green-200' : 'bg-parchment-2 text-ink-faint border-parchment-3'">
            <span class="w-1.5 h-1.5 rounded-full" :class="s.online ? 'bg-green-500 animate-pulse' : 'bg-parchment-4'"/>
            {{ s.online ? 'Online' : 'Offline' }}
          </span>
          <NuxtLink to="/sensors" class="p-1.5 rounded-lg text-ink-faint hover:text-ink hover:bg-parchment-2 transition-colors shrink-0" title="Manage sensor">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/>
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </NuxtLink>
          <button
            class="text-xs font-semibold text-flame border border-flame/30 hover:bg-flame hover:text-parchment px-2.5 py-1 rounded-lg transition-colors shrink-0"
            @click="$emit('link', s.id)"
          >Link</button>
        </div>
      </div>
    </div>

    <!-- No sensors at all -->
    <div v-if="!sensors.length" class="text-xs text-ink-faint">
      No sensors registered yet.
      <NuxtLink to="/sensors" class="text-flame font-semibold hover:underline">Add one →</NuxtLink>
    </div>

  </div>
</template>

<script setup>
defineProps({
  assignedSensors:   { type: Array, default: () => [] },
  unassignedSensors: { type: Array, default: () => [] },
  sensors:           { type: Array, default: () => [] },
})

defineEmits(['close', 'link', 'unlink'])
</script>