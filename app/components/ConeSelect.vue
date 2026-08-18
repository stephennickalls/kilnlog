<!-- File: app/components/ConeSelect.vue -->
<!--
  MOBILE (Aug 2026): the select was text-sm (14px). Any control under 16px makes
  iOS Safari zoom the page in on focus and never zoom back out. The shared
  .input handles that in one place; the utilities after it keep this control's
  roomier xl/px-4 shape and flame focus ring. Mirrors FiringTypeSelect.vue.

  CONES CACHE (Aug 2026): the list comes from useCones(), not a local fetch.
  This component, ConePackEditor and both schedule editors want the same
  reference data, and three copies of the same request meant three chances for
  one control to end up blank while its neighbour worked.

  ORDER: the full list stays COLD TO HOT, which is how Orton's chart reads and
  how the cone-pack chips, the cone-drop sheet and the chart ruler all read.
  Flipping this control alone would make it the only cone surface in the app
  running backwards.

  But cold-to-hot alone buries the useful cones. The series runs 022 up to 01
  then 1 up to 14, and the whole 022-012 stretch is lustre, enamel, china paint
  and decal work that most potters never fire — so cone 06 lands around the
  seventeenth option and cone 6 around the twenty-seventh. Reversing does not
  fix that, it just swaps which end is buried (11-14 is every bit as rare).
  Hence COMMON pinned on top: the eight or nine cones that cover almost every
  studio firing, in the same cold-to-hot order, with the full list underneath
  for everything else. Duplicated entries are intentional — a user who scrolls
  should still find cone 6 where it belongs.
-->
<template>
  <div class="flex flex-col gap-1.5">
    <label class="text-[10px] font-bold uppercase tracking-[0.1em] text-ink-faint">
      Cone <span class="text-parchment-4 font-normal normal-case tracking-normal">(optional)</span>
    </label>
    <div class="relative">
      <select
        :value="modelValue || ''"
        class="input rounded-xl px-4 py-2.5 pr-9 appearance-none focus:border-flame focus:ring-flame/10"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option value="">—</option>
        <option v-if="!loaded && !byTemp.length" disabled>Loading…</option>
        <optgroup v-if="common.length" label="Common">
          <option v-for="c in common" :key="'cm' + c.name" :value="c.name">Cone {{ c.name }}</option>
        </optgroup>
        <optgroup v-if="byTemp.length" label="All cones">
          <option v-for="c in byTemp" :key="'all' + c.name" :value="c.name">Cone {{ c.name }}</option>
        </optgroup>
      </select>
      <svg class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
// app/components/ConeSelect.vue
defineProps({ modelValue: { type: String, default: '' } })
defineEmits(['update:modelValue'])

// 010 raku and low-fire, 08-04 bisque and earthenware, 5-6 mid-fire electric,
// 9-10 stoneware and porcelain. Anything outside this is real but specialist.
const COMMON = ['010', '08', '06', '05', '04', '5', '6', '9', '10']

const { byTemp, loaded } = useCones()

// Filtered from the real list rather than hardcoded as options, so a cone the
// reference table doesn't have never appears as a dead choice.
const common = computed(() => byTemp.value.filter(c => COMMON.includes(c.name)))
</script>