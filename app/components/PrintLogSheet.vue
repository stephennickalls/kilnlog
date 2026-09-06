<!-- app/components/PrintLogSheet.vue -->
<!--
  Page 2 of a printed plan: blank rows to write readings into at the kiln.

  This is the whole reason printing exists. A student asked to "take outside and
  jot down completed programme" - so the printout is not a document about a
  firing, it is a TOOL for running one. Page 1 says what you intend; this page
  is where you record what happened, and the two come back together when the
  numbers get typed in afterwards.

  45 ROWS, THREE COLUMNS OF 15 (Sep 2026). The sheet is A4 landscape, 270mm
  across and 184mm down. The program table briefly lived here and was dropped:
  rate / target / hold is what you key into a controller beforehand, and on
  paper every one of those numbers is already in the curve on page one. The
  25mm it took became rows.

  The row count is not padding. A 14 hour glaze fire logged every 20 minutes is
  42 readings, and running out of lines halfway through is the failure this
  sheet exists to prevent.

  ROWS ARE 8.5mm. Writable with a biro in a gloved hand, which is the only
  test that matters.

  READ IT DOWN EACH COLUMN IN TURN. Newspaper order, not left-to-right across
  the page. It is the order a multi-column form is expected to be filled in,
  and it keeps the start of the firing, where readings are furthest apart, in
  one place rather than smeared across the sheet.

  BANDED ROWS. Alternating tint, not more rules. On a ruled form the eye loses
  its row on the way across to the Note column, and the fix in print has always
  been a band rather than another line - lines at 8.5mm spacing start to read
  as a grid. Browsers strip print backgrounds by default, so this needs
  print-color-adjust or the banding silently does not happen.

  THE PAGE STANDS ALONE, JUST. It repeats the firing name, type, cone, peak
  and planned length in one line, because by the time it is on a clipboard it
  has been separated from page one. It no longer carries the course's log
  header fields - those moved to page one beside the curve, where the person
  filling in "Kiln" and "Weather" is actually looking. This page is for
  numbers.

  TIME IS CLOCK TIME, NOT ELAPSED. Nobody at a kiln computes "2h 40m from
  start" in their head - they look at a watch. Converting to elapsed is the
  app's job when the numbers are typed back in.
-->
<template>
  <div class="print-log print-page-break">

    <!-- Header. One line of identity, then straight into the rows. -->
    <div class="flex items-baseline justify-between border-b-2 pb-1 mb-2.5" style="border-color:#1a1208">
      <p class="text-[12pt] font-bold leading-tight min-w-0" style="color:#1a1208">{{ name || 'Firing log' }}</p>
      <p v-if="metaLine" class="text-[8.5pt] shrink-0 pl-4" style="color:#4a4034">{{ metaLine }}</p>
    </div>

    <!-- Three columns of 15. gap-5 keeps each column's Note field off the
         next column's row number. -->
    <div class="grid grid-cols-3 gap-5">
      <table v-for="(col, ci) in columns" :key="'col' + ci" class="w-full border-collapse">
        <thead>
          <tr>
            <th class="text-left text-[8pt] font-bold uppercase tracking-wider border-b pb-0.5 w-[13%]" style="border-color:#1a1208;color:#3a5a48">#</th>
            <th class="text-left text-[8pt] font-bold uppercase tracking-wider border-b pb-0.5 w-[26%]" style="border-color:#1a1208;color:#3a5a48">Time</th>
            <th class="text-left text-[8pt] font-bold uppercase tracking-wider border-b pb-0.5 w-[24%]" style="border-color:#1a1208;color:#3a5a48">{{ unitLabel }}</th>
            <th class="text-left text-[8pt] font-bold uppercase tracking-wider border-b pb-0.5" style="border-color:#1a1208;color:#3a5a48">Note</th>
          </tr>
        </thead>
        <tbody>
          <!-- 8.5mm rows. Anything tighter cannot be written in with a biro,
               let alone with a gloved hand beside a hot kiln. -->
          <tr
            v-for="n in col" :key="'r' + n"
            style="height:8.5mm"
            :style="{ background: n % 2 === 0 ? '#f7f4ec' : 'transparent' }"
          >
            <td class="border-b text-[8pt] align-bottom pb-0.5 pl-0.5" style="border-color:rgba(26,18,8,0.28);color:#8a7f70">{{ n }}</td>
            <td class="border-b" style="border-color:rgba(26,18,8,0.28)" />
            <td class="border-b" style="border-color:rgba(26,18,8,0.28)" />
            <td class="border-b" style="border-color:rgba(26,18,8,0.28)" />
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Observations. Deliberately unruled and unlabelled beyond the heading:
         cone numbers, damper positions, weather, what the flame looked like.
         A form with a field for each of those would be wrong more often than
         right, and blank space is never wrong. Back to a useful height now
         the header fields have gone to page one. -->
    <div class="mt-2.5">
      <p class="text-[8pt] font-bold uppercase tracking-wider mb-0.5" style="color:#3a5a48">Observations</p>
      <div style="height:22mm;border:1px solid rgba(26,18,8,0.38);background:#fdfcf8" />
    </div>

    <p class="text-[7.5pt] mt-1" style="color:#8a7f70">
      Type these readings back into KilnMonitor to chart them against the plan · kilnlog.netlify.app
    </p>
  </div>
</template>

<script setup>
// app/components/PrintLogSheet.vue
import { computed } from 'vue'

const props = defineProps({
  name:     { type: String, default: '' },
  cone:     { type: String, default: '' },
  type:     { type: String, default: '' },
  rows:     { type: Number, default: 45 },
  // Optional plan meta, so a separated sheet still says what it belongs to.
  peak:     { type: String, default: '' },        // already formatted, e.g. "1204°C"
  duration: { type: String, default: '' },        // e.g. "14h 23m"
})

const { unitLabel } = useTempUnit()

// Numbered down the left column and continuing down the right, so the sheet
// is filled in the order the numbers run.
const COLS = 3   // 15 rows each

const columns = computed(() => {
  const total = Math.max(COLS, props.rows)
  const per   = Math.ceil(total / COLS)
  return Array.from({ length: COLS }, (_, c) =>
    Array.from({ length: Math.max(0, Math.min(per, total - c * per)) }, (_, i) => c * per + i + 1)
  ).filter(col => col.length)
})

const subtitle = computed(() => {
  const parts = []
  if (props.type) parts.push(props.type)
  if (props.cone) parts.push(`Cone ${props.cone}`)
  return parts.join(' · ') || 'Reading log'
})

const metaLine = computed(() => {
  const parts = [subtitle.value]
  if (props.peak) parts.push(`${props.peak} peak`)
  if (props.duration) parts.push(`planned ${props.duration}`)
  return parts.join(' · ')
})
</script>

<style scoped>
/* Row banding and the observations panel are backgrounds, and browsers drop
   backgrounds when printing unless told not to. Without this the sheet prints
   as plain rules and the banding that makes a wide row readable is gone. */
.print-log {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
</style>