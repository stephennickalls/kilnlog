<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-center justify-between">
      <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">Schedule curve</label>
      <div class="flex items-center gap-2">
        <span class="text-[10px] text-ink-faint">{{ totalHours }}</span>
        <button
          class="text-[10px] font-semibold text-flame hover:text-flame-dark transition-colors"
          @click="showTable = !showTable"
        >{{ showTable ? 'Hide table' : 'Show table' }}</button>
      </div>
    </div>

    <p class="text-xs text-ink-muted -mt-1">
      Drag points to adjust. Click the curve to add a point. Double-click a point to remove it.
    </p>

    <!-- SVG Graph Editor -->
    <div
      class="relative bg-white border border-parchment-3 rounded-xl overflow-hidden select-none"
      style="box-shadow: inset 0 1px 3px rgba(58,30,8,0.04)"
    >
      <svg
        ref="svgEl"
        :width="svgWidth"
        :height="svgHeight"
        class="w-full block touch-none"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        @click="onSvgClick"
      >
        <!-- Grid lines -->
        <g>
          <line
            v-for="t in tempGridLines" :key="'tg'+t"
            :x1="PAD_L" :y1="tempToY(t)"
            :x2="svgWidth - PAD_R" :y2="tempToY(t)"
            stroke="#f5f5f4" stroke-width="1"
          />
          <line
            v-for="m in timeGridLines" :key="'mg'+m"
            :x1="minsToX(m)" :y1="PAD_T"
            :x2="minsToX(m)" :y2="svgHeight - PAD_B"
            stroke="#f5f5f4" stroke-width="1"
          />
        </g>

        <!-- Grid labels — temp -->
        <g>
          <text
            v-for="t in tempGridLines" :key="'tl'+t"
            :x="PAD_L - 6" :y="tempToY(t) + 4"
            text-anchor="end"
            font-size="9"
            font-family="Georgia, serif"
            fill="#a8a29e"
          >{{ t }}°</text>
        </g>

        <!-- Grid labels — time -->
        <g>
          <text
            v-for="m in timeGridLines" :key="'ml'+m"
            :x="minsToX(m)" :y="svgHeight - PAD_B + 14"
            text-anchor="middle"
            font-size="9"
            font-family="Georgia, serif"
            fill="#a8a29e"
          >{{ minsToLabel(m) }}</text>
        </g>

        <!-- Filled area under curve -->
        <path
          v-if="sortedPoints.length >= 2"
          :d="fillPath"
          fill="rgba(249,115,22,0.07)"
        />

        <!-- Curve line -->
        <path
          v-if="sortedPoints.length >= 2"
          :d="curvePath"
          fill="none"
          stroke="#f97316"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <!-- Invisible wider hit area for adding points on curve click -->
        <path
          v-if="sortedPoints.length >= 2"
          :d="curvePath"
          fill="none"
          stroke="transparent"
          stroke-width="16"
          style="cursor: cell"
          @click.stop="onCurveClick"
        />

        <!-- Point handles -->
        <g
          v-for="(pt, i) in sortedPoints" :key="pt._id"
        >
          <!-- Outer ring (hover/active) -->
          <circle
            :cx="minsToX(pt.offsetMinutes)"
            :cy="tempToY(pt.targetTemp)"
            r="14"
            fill="rgba(249,115,22,0.12)"
            :class="draggingId === pt._id ? 'opacity-100' : 'opacity-0 hover:opacity-100'"
            style="transition: opacity 0.1s; cursor: grab"
            @mousedown.stop="startDrag(i, $event)"
            @touchstart.prevent.stop="startDragTouch(i, $event)"
            @dblclick.stop="removePoint(i)"
          />
          <!-- Handle dot -->
          <circle
            :cx="minsToX(pt.offsetMinutes)"
            :cy="tempToY(pt.targetTemp)"
            :r="draggingId === pt._id ? 7 : 5.5"
            fill="white"
            stroke="#f97316"
            :stroke-width="draggingId === pt._id ? 2.5 : 2"
            style="cursor: grab; transition: r 0.1s"
            @mousedown.stop="startDrag(i, $event)"
            @touchstart.prevent.stop="startDragTouch(i, $event)"
            @dblclick.stop="removePoint(i)"
          />
          <!-- Point index label -->
          <text
            :x="minsToX(pt.offsetMinutes)"
            :y="tempToY(pt.targetTemp) - 11"
            text-anchor="middle"
            font-size="8"
            font-family="Georgia, serif"
            fill="#f97316"
            font-weight="bold"
            style="pointer-events: none"
          >{{ i + 1 }}</text>
        </g>

        <!-- Drag tooltip -->
        <g v-if="draggingId !== null && tooltip">
          <rect
            :x="tooltip.x + 8"
            :y="tooltip.y - 22"
            width="80"
            height="18"
            rx="4"
            fill="#1c1917"
            opacity="0.88"
          />
          <text
            :x="tooltip.x + 48"
            :y="tooltip.y - 9"
            text-anchor="middle"
            font-size="10"
            font-family="Georgia, serif"
            fill="white"
            style="pointer-events: none"
          >{{ tooltip.text }}</text>
        </g>

        <!-- Empty state -->
        <text
          v-if="sortedPoints.length === 0"
          :x="svgWidth / 2"
          :y="svgHeight / 2"
          text-anchor="middle"
          font-size="12"
          font-family="Georgia, serif"
          fill="#d6d3d1"
        >Click to add points</text>
      </svg>
    </div>

    <!-- DEBUG PANEL — remove when done -->
    <div class="bg-ink text-green-400 font-mono text-[10px] rounded-lg p-3 leading-relaxed">
      <div class="text-yellow-300 font-bold mb-1">🐛 Drag Debug</div>
      <div>draggingIdx: <span class="text-white">{{ draggingIdx ?? 'null' }}</span></div>
      <div>svgRect: <span class="text-white">{{ debugSvgRect }}</span></div>
      <div>lastEvent: <span class="text-white">{{ debugLastEvent }}</span></div>
      <div>lastClientXY: <span class="text-white">{{ debugLastClientXY }}</span></div>
      <div>lastSvgXY: <span class="text-white">{{ debugLastSvgXY }}</span></div>
      <div>lastMinsTemp: <span class="text-white">{{ debugLastMinsTemp }}</span></div>
      <div>docListeners: <span class="text-white">{{ debugDocListeners }}</span></div>
      <div class="mt-1 text-parchment-4">Log: <span class="text-green-300">{{ debugLog.slice(-3).join(' | ') }}</span></div>
    </div>

    <!-- Collapsible table -->
    <div v-if="showTable" class="flex flex-col gap-2 mt-1">
      <div class="grid grid-cols-[1fr_1fr_28px] gap-2 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-faint px-1">
        <span>Time (mins)</span><span>Target °C</span><span></span>
      </div>
      <div
        v-for="(pt, i) in sortedPoints"
        :key="pt._id + 'row'"
        class="grid grid-cols-[1fr_1fr_28px] gap-2 items-center"
      >
        <input
          :value="pt.offsetMinutes"
          type="number" min="0" placeholder="0"
          class="w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
          @change="updatePoint(i, 'offsetMinutes', Number($event.target.value))"
        />
        <input
          :value="pt.targetTemp"
          type="number" min="0" max="1400" placeholder="100"
          class="w-full border border-parchment-3 rounded-lg px-3 py-1.5 text-sm text-ink bg-white focus:outline-none focus:border-flame focus:ring-2 focus:ring-flame/10 font-serif"
          @change="updatePoint(i, 'targetTemp', Number($event.target.value))"
        />
        <button class="text-parchment-4 hover:text-red-400 transition-colors text-sm" @click="removePoint(i)">✕</button>
      </div>
      <button class="text-sm text-flame hover:text-flame-dark font-semibold text-left" @click="addPointAtEnd">+ Add waypoint</button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] }, // [{ offsetMinutes, targetTemp }]
})
const emit = defineEmits(['update:modelValue'])

// ── Layout constants ──────────────────────────────────────────────────────────
const svgWidth  = 520
const svgHeight = 220
const PAD_L = 38, PAD_R = 12, PAD_T = 16, PAD_B = 24

// ── Internal points (each gets a stable _id for keying) ──────────────────────
let _nextId = 0
const points = ref(props.modelValue.map(p => ({ ...p, _id: _nextId++ })))

// Guard flag — prevents the two watchers from triggering each other
let _inboundUpdate = false

// Sync IN when parent changes (e.g. library preset or bisque/glaze button)
// We patch in-place rather than replace the array so _ids survive during drag
watch(() => props.modelValue, (val) => {
  // Only sync if the change came from outside (different length or values)
  // not from our own emit during drag
  if (draggingId.value !== null) return  // never interrupt an active drag

  _inboundUpdate = true
  // Replace array wholesale (preset loaded etc) — assign new _ids
  points.value = val.map(p => ({ ...p, _id: _nextId++ }))
  nextTick(() => { _inboundUpdate = false })
}, { deep: true })

// Emit OUT when user edits the graph — but not during a drag (we emit on dragend instead)
// and not when we just synced in from parent
watch(points, (val) => {
  if (_inboundUpdate) return
  if (draggingId.value !== null) return  // suppress during drag, emit on stopDrag
  emit('update:modelValue', val.map(({ offsetMinutes, targetTemp }) => ({ offsetMinutes, targetTemp })))
}, { deep: true })

// ── Sorted view ───────────────────────────────────────────────────────────────
const sortedPoints = computed(() =>
  [...points.value].sort((a, b) => a.offsetMinutes - b.offsetMinutes)
)

const totalHours = computed(() => {
  if (!sortedPoints.value.length) return ''
  const last = sortedPoints.value[sortedPoints.value.length - 1]
  const maxMins = last.offsetMinutes
  const h = Math.floor(maxMins / 60), m = maxMins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`
})

// ── Axis ranges ───────────────────────────────────────────────────────────────
const maxMins = computed(() => {
  const pts = sortedPoints.value
  const m = pts.length ? pts[pts.length - 1].offsetMinutes : 0
  return Math.max(m + 60, 360)
})
const maxTemp = computed(() => {
  const t = Math.max(...sortedPoints.value.map(p => p.targetTemp), 100)
  return Math.ceil((t + 50) / 100) * 100
})

// ── Coordinate transforms ─────────────────────────────────────────────────────
function minsToX(m)  { return PAD_L + (m / maxMins.value)  * (svgWidth  - PAD_L - PAD_R) }
function xToMins(x)  { return Math.round(Math.max(0, (x - PAD_L) / (svgWidth - PAD_L - PAD_R) * maxMins.value)) }
function tempToY(t)  { return PAD_T + (1 - t / maxTemp.value) * (svgHeight - PAD_T - PAD_B) }
function yToTemp(y)  { return Math.round(Math.max(0, Math.min(maxTemp.value, (1 - (y - PAD_T) / (svgHeight - PAD_T - PAD_B)) * maxTemp.value))) }

// ── Grid lines ────────────────────────────────────────────────────────────────
const tempGridLines = computed(() => {
  const step = maxTemp.value <= 400 ? 100 : maxTemp.value <= 800 ? 200 : 200
  const lines = []
  for (let t = 0; t <= maxTemp.value; t += step) lines.push(t)
  return lines
})
const timeGridLines = computed(() => {
  const step = maxMins.value <= 240 ? 60 : maxMins.value <= 480 ? 120 : 120
  const lines = []
  for (let m = 0; m <= maxMins.value; m += step) lines.push(m)
  return lines
})
function minsToLabel(m) {
  const h = Math.floor(m / 60), min = m % 60
  if (h === 0) return `${m}m`
  return min === 0 ? `${h}h` : `${h}h${min}m`
}

// ── SVG path builders ─────────────────────────────────────────────────────────
const curvePath = computed(() => {
  const pts = sortedPoints.value
  if (pts.length < 2) return ''
  let d = `M ${minsToX(pts[0].offsetMinutes)} ${tempToY(pts[0].targetTemp)}`
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${minsToX(pts[i].offsetMinutes)} ${tempToY(pts[i].targetTemp)}`
  }
  return d
})

const fillPath = computed(() => {
  const pts = sortedPoints.value
  if (pts.length < 2) return ''
  const bottom = svgHeight - PAD_B
  const firstX = minsToX(pts[0].offsetMinutes)
  const lastX  = minsToX(pts[pts.length - 1].offsetMinutes)
  return `${curvePath.value} L ${lastX} ${bottom} L ${firstX} ${bottom} Z`
})

// ── DEBUG ─────────────────────────────────────────────────────────────────────
const debugLastEvent    = ref('none')
const debugLastClientXY = ref('—')
const debugLastSvgXY    = ref('—')
const debugLastMinsTemp = ref('—')
const debugSvgRect      = ref('—')
const debugDocListeners = ref(0)
const debugLog          = ref([])
function dblog(msg) {
  debugLog.value.push(msg)
  if (debugLog.value.length > 20) debugLog.value.shift()
  console.log('[CurveEditor]', msg)
}

// ── Dragging ──────────────────────────────────────────────────────────────────
const svgEl        = ref(null)
const draggingId   = ref(null)   // track by _id, not sorted index
const draggingIdx  = ref(null)   // kept for debug display only
const tooltip      = ref(null)

function getSvgPos(clientX, clientY) {
  const rect = svgEl.value.getBoundingClientRect()
  debugSvgRect.value = `${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}×${Math.round(rect.height)}`
  const x = (clientX - rect.left) / rect.width  * svgWidth
  const y = (clientY - rect.top)  / rect.height * svgHeight
  debugLastSvgXY.value = `${x.toFixed(1)}, ${y.toFixed(1)}`
  return { x, y }
}

function getPointById(id) {
  return points.value.find(p => p._id === id)
}

function doDrag(clientX, clientY) {
  debugLastClientXY.value = `${clientX.toFixed(0)}, ${clientY.toFixed(0)}`
  if (draggingId.value === null) {
    dblog('doDrag called but draggingId is null!')
    return
  }
  if (!svgEl.value) {
    dblog('doDrag: svgEl is null!')
    return
  }
  const { x, y } = getSvgPos(clientX, clientY)
  const pt = getPointById(draggingId.value)
  if (!pt) {
    dblog(`doDrag: no point found for _id ${draggingId.value}`)
    return
  }
  pt.offsetMinutes = xToMins(x)
  pt.targetTemp    = yToTemp(y)
  // Update display index for debug
  draggingIdx.value = sortedPoints.value.findIndex(p => p._id === draggingId.value)
  debugLastMinsTemp.value = `${pt.offsetMinutes}m, ${pt.targetTemp}°C`
  tooltip.value = { x, y, text: `${pt.offsetMinutes}m · ${pt.targetTemp}°C` }
}

function stopDrag() {
  dblog(`stopDrag — was dragging _id ${draggingId.value}`)
  draggingId.value  = null
  draggingIdx.value = null
  tooltip.value     = null
  document.removeEventListener('mousemove', onDocMouseMove)
  document.removeEventListener('mouseup',   onDocMouseUp)
  document.removeEventListener('touchmove', onDocTouchMove)
  document.removeEventListener('touchend',  onDocTouchEnd)
  debugDocListeners.value = 0
  // Emit final positions now that drag is complete
  emit('update:modelValue', points.value.map(({ offsetMinutes, targetTemp }) => ({ offsetMinutes, targetTemp })))
}

function onDocMouseMove(e) {
  debugLastEvent.value = `mousemove (doc)`
  doDrag(e.clientX, e.clientY)
}
function onDocMouseUp() {
  debugLastEvent.value = 'mouseup (doc)'
  stopDrag()
}
function onDocTouchMove(e) {
  debugLastEvent.value = `touchmove (doc) touches:${e.touches.length}`
  e.preventDefault()
  if (e.touches.length) doDrag(e.touches[0].clientX, e.touches[0].clientY)
}
function onDocTouchEnd() {
  debugLastEvent.value = 'touchend (doc)'
  stopDrag()
}

function startDrag(sortedIdx, e) {
  const id = sortedPoints.value[sortedIdx]?._id ?? null
  dblog(`startDrag(mouse) idx=${sortedIdx} _id=${id}`)
  debugLastEvent.value = `mousedown on pt ${sortedIdx}`
  e.preventDefault()
  e.stopPropagation()
  draggingId.value  = id
  draggingIdx.value = sortedIdx
  document.addEventListener('mousemove', onDocMouseMove)
  document.addEventListener('mouseup',   onDocMouseUp)
  debugDocListeners.value = 2
}

function startDragTouch(sortedIdx, e) {
  const id = sortedPoints.value[sortedIdx]?._id ?? null
  dblog(`startDragTouch idx=${sortedIdx} _id=${id} touches=${e.touches.length}`)
  debugLastEvent.value = `touchstart on pt ${sortedIdx}`
  debugLastClientXY.value = e.touches.length
    ? `${e.touches[0].clientX.toFixed(0)}, ${e.touches[0].clientY.toFixed(0)}`
    : 'no touches'
  e.preventDefault()
  e.stopPropagation()
  draggingId.value  = id
  draggingIdx.value = sortedIdx
  document.addEventListener('touchmove', onDocTouchMove, { passive: false })
  document.addEventListener('touchend',  onDocTouchEnd)
  debugDocListeners.value = 2
}

onUnmounted(() => { stopDrag() })

// ── Adding points ─────────────────────────────────────────────────────────────
const hoverAddPos = ref(null)

function onSvgClick(e) {
  if (draggingIdx.value !== null) return
  const { x, y } = getSvgPos(e.clientX, e.clientY)
  // Don't add if clicking in padding area
  if (x < PAD_L || x > svgWidth - PAD_R || y < PAD_T || y > svgHeight - PAD_B) return
  points.value.push({ offsetMinutes: xToMins(x), targetTemp: yToTemp(y), _id: _nextId++ })
}

function onCurveClick(e) {
  // Let it bubble to onSvgClick — the wider transparent stroke catches it
  // but we want to add ON the curve, so prevent the SVG click from double-firing
  e.stopPropagation()
  const { x, y } = getSvgPos(e.clientX, e.clientY)
  points.value.push({ offsetMinutes: xToMins(x), targetTemp: yToTemp(y), _id: _nextId++ })
}

// ── Removing points ───────────────────────────────────────────────────────────
function removePoint(sortedIdx) {
  const id = sortedPoints.value[sortedIdx]._id
  const i  = points.value.findIndex(p => p._id === id)
  if (i !== -1) points.value.splice(i, 1)
}

// ── Table helpers ─────────────────────────────────────────────────────────────
const showTable = ref(false)

function updatePoint(sortedIdx, field, val) {
  const pt = getPointById(sortedPoints.value[sortedIdx]._id)
  if (pt) pt[field] = val
}

function addPointAtEnd() {
  const pts = sortedPoints.value
  const last = pts.length ? pts[pts.length - 1] : null
  points.value.push({
    offsetMinutes: last ? last.offsetMinutes + 60 : 60,
    targetTemp:    last ? last.targetTemp : 100,
    _id: _nextId++,
  })
}
</script>