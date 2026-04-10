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
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        @touchmove.prevent="onTouchMove"
        @touchend="onTouchEnd"
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
            :class="draggingIdx === i ? 'opacity-100' : 'opacity-0 hover:opacity-100'"
            style="transition: opacity 0.1s; cursor: grab"
            @mousedown.stop="startDrag(i, $event)"
            @touchstart.prevent.stop="startDragTouch(i, $event)"
            @dblclick.stop="removePoint(i)"
          />
          <!-- Handle dot -->
          <circle
            :cx="minsToX(pt.offsetMinutes)"
            :cy="tempToY(pt.targetTemp)"
            :r="draggingIdx === i ? 7 : 5.5"
            fill="white"
            stroke="#f97316"
            :stroke-width="draggingIdx === i ? 2.5 : 2"
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
        <g v-if="draggingIdx !== null && tooltip">
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

      <!-- Add point hint overlay — shows only when hovering SVG with no drag -->
      <div
        v-if="hoverAddPos"
        class="pointer-events-none absolute"
        :style="{ left: hoverAddPos.x + 'px', top: hoverAddPos.y + 'px', transform: 'translate(-50%,-50%)' }"
      >
        <div class="w-3 h-3 rounded-full border-2 border-flame/50 bg-white/80"></div>
      </div>
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

// Sync in when parent changes (e.g. library preset applied)
watch(() => props.modelValue, (val) => {
  points.value = val.map(p => ({ ...p, _id: _nextId++ }))
}, { deep: true })

// Emit out on every change
watch(points, (val) => {
  emit('update:modelValue', val.map(({ offsetMinutes, targetTemp }) => ({ offsetMinutes, targetTemp })))
}, { deep: true })

// ── Sorted view ───────────────────────────────────────────────────────────────
const sortedPoints = computed(() =>
  [...points.value].sort((a, b) => a.offsetMinutes - b.offsetMinutes)
)

const totalHours = computed(() => {
  if (!sortedPoints.value.length) return ''
  const maxMins = sortedPoints.value.at(-1).offsetMinutes
  const h = Math.floor(maxMins / 60), m = maxMins % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}` : `${m}m`
})

// ── Axis ranges ───────────────────────────────────────────────────────────────
const maxMins = computed(() => {
  const m = sortedPoints.value.at(-1)?.offsetMinutes ?? 0
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

// ── Dragging ──────────────────────────────────────────────────────────────────
const svgEl       = ref(null)
const draggingIdx = ref(null)   // index into sortedPoints
const tooltip     = ref(null)

function getSvgPos(clientX, clientY) {
  const rect = svgEl.value.getBoundingClientRect()
  return {
    x: (clientX - rect.left) / rect.width  * svgWidth,
    y: (clientY - rect.top)  / rect.height * svgHeight,
  }
}

// Find the matching point in points[] by _id from sortedPoints
function getPointById(id) {
  return points.value.find(p => p._id === id)
}

function startDrag(sortedIdx, e) {
  draggingIdx.value = sortedIdx
  e.preventDefault()
}

function startDragTouch(sortedIdx, e) {
  draggingIdx.value = sortedIdx
}

function doDrag(clientX, clientY) {
  if (draggingIdx.value === null) return
  const { x, y } = getSvgPos(clientX, clientY)
  const pt = getPointById(sortedPoints.value[draggingIdx.value]._id)
  if (!pt) return
  pt.offsetMinutes = xToMins(x)
  pt.targetTemp    = yToTemp(y)
  tooltip.value = {
    x,
    y,
    text: `${pt.offsetMinutes}m · ${pt.targetTemp}°C`,
  }
}

function onMouseMove(e) {
  if (draggingIdx.value !== null) doDrag(e.clientX, e.clientY)
}
function onMouseUp() {
  draggingIdx.value = null
  tooltip.value     = null
}
function onTouchMove(e) {
  if (e.touches.length) doDrag(e.touches[0].clientX, e.touches[0].clientY)
}
function onTouchEnd() {
  draggingIdx.value = null
  tooltip.value     = null
}

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
  const last = sortedPoints.value.at(-1)
  points.value.push({
    offsetMinutes: last ? last.offsetMinutes + 60 : 60,
    targetTemp:    last?.targetTemp ?? 100,
    _id: _nextId++,
  })
}
</script> 