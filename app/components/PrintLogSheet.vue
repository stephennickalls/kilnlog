<!-- app/components/PrintLogSheet.vue -->
<!--
  Page 2 of a printed plan: blank rows to write readings into at the kiln.

  This is the whole reason printing exists. A student asked to "take outside and
  jot down completed programme" - so the printout is not a document about a
  firing, it is a TOOL for running one. Page 1 says what you intend; this page
  is where you record what happened, and the two come back together when the
  numbers get typed in afterwards.

  40 ROWS, TWO COLUMNS OF 20 (Sep 2026, was 30 in two of 15). A4 minus 14mm
  margins is 269mm of height and the old sheet used about 180mm of it, so a
  third of a page was being handed out blank. A row still has to be about 8mm
  to write in with a pen, and 20 rows at 8.5mm comes to 170mm, which leaves
  room for a taller observations box and still clears the bottom margin. The
  extra ten rows are not padding: a 14 hour glaze fire logged every 20 minutes
  is 42 readings, and running out of lines halfway through is the failure this
  sheet exists to prevent.

  READ IT DOWN THE LEFT COLUMN, THEN DOWN THE RIGHT. Newspaper order, not
  left-to-right across the page. It is the order a two-column form is expected
  to be filled in, and the early rows sitting in one place keeps the start of
  the firing (where readings are furthest apart) together.

  BANDED ROWS. Alternating tint, not more rules. On a ruled form the eye loses
  its row on the way across to the Note column, and the fix in print has always
  been a band rather than another line - lines at 8.5mm spacing start to read
  as a grid. Browsers strip print backgrounds by default, so this needs
  print-color-adjust or the banding silently does not happen.

  THE PAGE STANDS ALONE. It repeats the firing name, the date, the target cone
  and now the peak, the planned length and the cone pack, because by the time
  it is on a clipboard in a kiln shed it has been separated from page 1 and
  there may be three of them from three firings. The plan meta is optional -
  the component still renders correctly if the caller passes nothing.

  TIME IS CLOCK TIME, NOT ELAPSED. Nobody at a kiln computes "2h 40m from
  start" in their head - they look at a watch. Converting to elapsed is the
  app's job when the numbers are typed back in.
-->
<template>
  <div class="print-log print-page-break">

    <!-- Header. Kept lighter than page 1: this sheet is working paper. -->
    <div class="flex items-end justify-between border-b-2 pb-1.5 mb-1" style="border-color:#1a1208">
      <div class="min-w-0">
        <p class="text-[13pt] font-bold leading-tight" style="color:#1a1208">{{ name || 'Firing log' }}</p>
        <p class="text-[9pt] leading-tight" style="color:#3a5a48">{{ subtitle }}</p>
      </div>
      <p class="text-[9pt] shrink-0" style="color:#1a1208">Date _______________</p>
    </div>

    <!-- Plan meta. One line, only the parts the caller supplied. It is here so
         a sheet that got separated from page 1 still says what it was for. -->
    <p v-if="metaLine" class="text-[8.5pt] mb-2.5" style="color:#4a4034">{{ metaLine }}</p>

    <!-- Two columns of 20. gap-6 gives the fold-line breathing room and stops
         the right column's Time field butting against the left column's Note. -->
    <div class="grid grid-cols-2 gap-6">
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
         right, and blank space is never wrong. Taller than it was, because it
         is what now absorbs the page's leftover height rather than the margin. -->
    <div class="mt-4">
      <p class="text-[8pt] font-bold uppercase tracking-wider mb-1" style="color:#3a5a48">Observations</p>
      <div style="height:46mm;border:1px solid rgba(26,18,8,0.38);background:#fdfcf8" />
    </div>

    <p class="text-[7.5pt] mt-2" style="color:#8a7f70">
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
  rows:     { type: Number, default: 40 },
  // Optional plan meta, so a separated sheet still says what it belongs to.
  peak:     { type: String, default: '' },        // already formatted, e.g. "1204°C"
  duration: { type: String, default: '' },        // e.g. "14h 23m"
  conePack: { type: Array,  default: () => [] },  // cone names
})

const { unitLabel } = useTempUnit()

// Numbered down the left column and continuing down the right, so the sheet
// is filled in the order the numbers run.
const columns = computed(() => {
  const total = Math.max(2, props.rows)
  const half  = Math.ceil(total / 2)
  const left  = Array.from({ length: half }, (_, i) => i + 1)
  const right = Array.from({ length: total - half }, (_, i) => i + 1 + half)
  return [left, right]
})

const subtitle = computed(() => {
  const parts = []
  if (props.type) parts.push(props.type)
  if (props.cone) parts.push(`Cone ${props.cone}`)
  return parts.join(' · ') || 'Reading log'
})

const metaLine = computed(() => {
  const parts = []
  if (props.peak) parts.push(`${props.peak} peak`)
  if (props.duration) parts.push(`planned ${props.duration}`)
  if (props.conePack?.length) parts.push(`cones ${props.conePack.join(' · ')}`)
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