<!-- File: app/components/VideoEmbed.vue -->
<!--
  Lazy YouTube embed ("facade" pattern) for the marketing page.

  WHY NOT A PLAIN IFRAME: a standard YouTube embed pulls roughly a megabyte of
  player JavaScript on page load, before anyone has decided to watch. On a page
  whose whole pitch is a light tool for potters, that is the wrong first
  impression, and it is paid for by every visitor including the ones who never
  press play. This renders a poster image plus a play button, and swaps in the
  real iframe only on click.

  NOCOOKIE: youtube-nocookie.com does not set tracking cookies until playback,
  which keeps this page out of a consent-banner conversation it does not
  currently need to have.

  CSP: nuxt.config.ts must list https://www.youtube-nocookie.com in frame-src
  or the iframe silently renders blank. The poster is served from public/ and
  is already covered by img-src 'self'.

  PRECONNECT ON HOVER: opening the TLS connection when the pointer arrives
  saves a few hundred milliseconds on click, without costing anything for
  visitors who never interact. Touch devices get it on first tap instead, which
  is a wash, so no special case.

  A11Y: the poster is a real button, so it is keyboard reachable and announces
  the video title. Once playing, focus moves to the iframe naturally.
-->
<template>
  <div class="relative w-full overflow-hidden rounded-[14px] border border-white/10 bg-ink-2" style="aspect-ratio:16/9">

    <iframe
      v-if="playing"
      class="absolute inset-0 w-full h-full"
      :src="src"
      :title="title"
      frameborder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    />

    <button
      v-else
      class="group absolute inset-0 w-full h-full cursor-pointer"
      :aria-label="`Play video: ${title}`"
      @click="play"
      @mouseenter="warm"
      @focus="warm"
    >
      <img
        :src="poster"
        :alt="''"
        class="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        width="1280"
        height="720"
      >

      <!-- Scrim: keeps the play button legible over a light poster without
           dimming the whole image. -->
      <span class="absolute inset-0 bg-ink/10 group-hover:bg-ink/[0.18] transition-colors"/>

      <span class="absolute inset-0 flex items-center justify-center">
        <span class="flex items-center justify-center w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-full bg-flame text-parchment shadow-[0_6px_28px_rgba(26,18,8,0.35)] transition-transform duration-200 group-hover:scale-[1.06] group-active:scale-95">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" class="ml-1 shrink-0" aria-hidden="true">
            <path d="M6 3.5l14 8.5-14 8.5V3.5z"/>
          </svg>
        </span>
      </span>

      <span
        v-if="duration"
        class="absolute bottom-3 right-3 px-2 py-1 rounded bg-ink/85 text-parchment text-[0.7rem] font-semibold tabular-nums"
      >{{ duration }}</span>
    </button>

  </div>
</template>

<script setup>
// app/components/VideoEmbed.vue
const props = defineProps({
  // YouTube video id, i.e. the part after v= in the watch URL.
  videoId:  { type: String, required: true },
  // Path under public/, e.g. /video-poster-getting-started.png
  poster:   { type: String, required: true },
  title:    { type: String, required: true },
  // Display only, e.g. '3:25'. Optional.
  duration: { type: String, default: '' },
})

const playing = ref(false)
const warmed  = ref(false)

const src = computed(() =>
  `https://www.youtube-nocookie.com/embed/${props.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
)

// Reset to the poster when the parent switches videos, otherwise the old
// iframe keeps playing behind the new title.
watch(() => props.videoId, () => { playing.value = false })

function play() {
  playing.value = true
}

function warm() {
  if (warmed.value || import.meta.server) return
  warmed.value = true
  for (const href of ['https://www.youtube-nocookie.com', 'https://i.ytimg.com']) {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = href
    link.crossOrigin = ''
    document.head.appendChild(link)
  }
}
</script>