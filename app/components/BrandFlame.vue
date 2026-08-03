<!-- app/components/BrandFlame.vue -->
<!-- KilnMonitor brand flame — replaces the 🔥 emoji. Two-tone like the emoji:
     flame (#b8551c) outer body, flame-light (#d98a4e) inner core — both straight
     from tailwind.config colours.

     NO GRADIENTS / NO IDS (Aug 2026 fix): the first version used <linearGradient>
     with useId()-based ids; on hydration the ids changed, the url(#…) fill
     references broke, and the flame went invisible ("disappears after a few
     seconds"). Flat fills have no references to break and no per-instance id
     collisions, so this renders any number of times on a page safely.

     OPTICAL CENTRING: the flame's mass sits low in a 0–24 box (the tip starts
     at y≈2.4, the base at y=23), so beside cap-height text it reads as sitting
     too low. The <g> nudges the glyph up ~1 unit, which lines the flame up with
     the cap height of "KilnMonitor" instead of its bounding box.

     Size with normal w-*/h-* classes on the component tag. -->
<template>
  <svg class="shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g transform="translate(0 -1)">
      <!-- Outer flame body — flame -->
      <path fill="#b8551c" d="M12 23c4.9 0 8.4-3.4 8.4-8.1 0-3.3-1.7-5.6-3.2-7.7-1-1.4-2-2.8-2.5-4.4-.1-.5-.7-.7-1.1-.4-1.9 1.4-2.7 3.2-2.6 5.1 0 .8.2 1.5.4 2.2-.9-.5-1.6-1.4-2-2.5-.2-.5-.8-.6-1.2-.3-2.6 2.4-4.6 5.2-4.6 8 0 4.7 3.5 8.1 8.4 8.1z"/>

      <!-- Inner core — flame-light -->
      <path fill="#d98a4e" d="M12 21.2c2.6 0 4.4-1.7 4.4-4.2 0-1.8-1-3.1-2-4.3-.5-.7-1.1-1.3-1.5-2.1-.2-.4-.7-.5-1-.2-.9.8-1.3 1.8-1.3 2.8-.5-.2-.9-.6-1.2-1.1-.2-.4-.7-.4-1-.1-.9 1.1-1.8 2.7-1.8 5 0 2.5 1.8 4.2 4.4 4.2z"/>
    </g>
  </svg>
</template>