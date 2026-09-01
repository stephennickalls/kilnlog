<!-- app/components/PrintLogSheet.vue -->
<!--
  Page 2 of a printed plan: 30 blank rows to write readings into at the kiln.

  This is the whole reason printing exists. A student asked to "take outside and
  jot down completed programme" — so the printout is not a document about a
  firing, it is a TOOL for running one. Page 1 says what you intend; this page
  is where you record what happened, and the two come back together when the
  numbers get typed in afterwards.

  30 ROWS, TWO COLUMNS OF 15. A4 minus 14mm margins is 267mm of height. A row
  has to be about 8mm to write in with a pen — 5mm rows look tidy on screen and
  are useless on a clipboard — so 30 stacked rows need 240mm plus a header and
  cannot share a page with the curve. Two columns of 15 come to ~130mm, which
  fits comfortably and leaves the bottom third for observations.

  READ IT DOWN THE LEFT COLUMN, THEN DOWN THE RIGHT. Newspaper order, not
  left-to-right across the page. It is the order a two-column form is expected
  to be filled in, and rows 1-15 sitting in one place keeps the early firing
  (where readings are furthest apart) together.

  THE PAGE STANDS ALONE. It repeats the firing name, the date and the target
  cone, because by the time it is on a clipboard in a kiln shed it has been
  separated from page 1 and there may be three of them from three firings.

  TIME IS CLOCK TIME, NOT ELAPSED. Nobody at a kiln computes "2h 40m from
  start" in their head — they look at a watch. Converting to elapsed is the
  app's job when the numbers are typed back in.
-->
<template>
  <div class="print-page-break">

    <!-- Header. Kept lighter than page 1: this sheet is working paper. -->
    <div class="flex items-end justify-between border-b-2 border-black pb-1.5 mb-3">
      <div class="min-w-0">
        <p class="text-[13pt] font-bold leading-tight">{{ name || 'Firing log' }}</p>
        <p class="text-[9pt] leading-tight">{{ subtitle }}</p>
      </div>
      <p class="text-[9pt] shrink-0">Date _______________</p>
    </div>

    <!-- Two columns of 15. gap-6 gives the fold-line breathing room and stops
         the right column's Time field butting against the left column's Note. -->
    <div class="grid grid-cols-2 gap-6">
      <table v-for="(col, ci) in columns" :key="'col' + ci" class="w-full border-collapse">
        <thead>
          <tr>
            <th class="text-left text-[8pt] font-bold uppercase tracking-wider border-b border-black pb-0.5 w-[14%]">#</th>
            <th class="text-left text-[8pt] font-bold uppercase tracking-wider border-b border-black pb-0.5 w-[26%]">Time</th>
            <th class="text-left text-[8pt] font-bold uppercase tracking-wider border-b border-black pb-0.5 w-[24%]">{{ unitLabel }}</th>
            <th class="text-left text-[8pt] font-bold uppercase tracking-wider border-b border-black pb-0.5">Note</th>
          </tr>
        </thead>
        <tbody>
          <!-- 8mm rows. Anything tighter cannot be written in with a biro, let
               alone with a gloved hand beside a hot kiln. -->
          <tr v-for="n in col" :key="'r' + n" style="height:8mm">
            <td class="border-b border-black/30 text-[8pt] align-bottom pb-0.5 text-black/45">{{ n }}</td>
            <td class="border-b border-black/30" />
            <td class="border-b border-black/30" />
            <td class="border-b border-black/30" />
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Observations. Deliberately unruled and unlabelled beyond the heading:
         cone numbers, damper positions, weather, what the flame looked like.
         A form with a field for each of those would be wrong more often than
         right, and blank space is never wrong. -->
    <div class="mt-5">
      <p class="text-[8pt] font-bold uppercase tracking-wider mb-1">Observations</p>
      <div class="border border-black/40" style="height:38mm" />
    </div>

    <p class="text-[7.5pt] text-black/55 mt-2">
      Type these readings back into KilnMonitor to chart them against the plan · kilnlog.netlify.app
    </p>
  </div>
</template>

<script setup>
// app/components/PrintLogSheet.vue
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  cone: { type: String, default: '' },
  type: { type: String, default: '' },
  rows: { type: Number, default: 30 },
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
</script>