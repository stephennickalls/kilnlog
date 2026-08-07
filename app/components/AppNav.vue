<!-- File: app/components/AppNav.vue -->
<!--
  THE app header. One component, every signed-in page — /app, /account,
  /schedules, /schedules/new, /admin/*. Same logo, same destinations, same
  behaviour, at every width.

  Before this, each page hand-rolled its own <header>, and several were
  desktop-only: /account's single navigation control was "Back to app" behind
  `hidden sm:inline-flex`, with no account menu at all, so on a phone the page
  was a dead end.

  WHAT SHOWS AT WHAT WIDTH
    < md   logo mark · page title · #actions · avatar
           Destinations live in the avatar menu, which opens as a full-screen
           sheet (UserMenu). One tap target, no cramped dropdown.
    ≥ md   logo + wordmark · Firings | Schedules | Admin · #actions · avatar
           Tabs are visible and the current section is marked. The page title
           moves out of the bar — the active tab already says where you are.
    ≥ lg   a trailing crumb appears for sub-pages ("Schedules / New schedule").

  Destinations come from useAppNavLinks() so this bar and the mobile sheet can
  never disagree about what the app contains.

  SLOTS
    #lead     — before the logo (e.g. /app's firing-sheet hamburger)
    #actions  — page buttons, right side, before the avatar

  PROPS
    crumbs    — [{ label, to? }]; the last entry is the page title
    sticky    — default true; pass false inside an h-screen flex column (/app)
    container — max-width class for the inner row; 'max-w-none' for /app

  USAGE
    <AppNav :crumbs="[{ label: 'Schedules', to: '/schedules' }, { label: 'New schedule' }]">
      <template #actions>
        <NuxtLink to="/schedules/new" class="btn-primary !px-3 shrink-0">+ New</NuxtLink>
      </template>
    </AppNav>
-->
<template>
  <header
    class="shrink-0 w-full bg-parchment/95 backdrop-blur border-b border-parchment-3 z-30"
    :class="sticky ? 'sticky top-0' : ''"
  >
    <div
      class="mx-auto flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 sm:py-3 min-w-0"
      :class="container"
    >

      <!-- Brand -->
      <div class="flex items-center gap-1.5 sm:gap-3 min-w-0 md:shrink-0">
        <slot name="lead" />

        <NuxtLink
          to="/app"
          class="flex items-center gap-2 text-base sm:text-lg font-bold text-ink tracking-tight hover:text-flame transition-colors shrink-0"
        >
          <BrandFlame class="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
          <!-- The wordmark is the first thing to go: below md the page title
               needs the room more than the brand does. -->
          <span :class="pageTitle ? 'hidden md:inline' : 'hidden min-[400px]:inline'">KilnMonitor</span>
        </NuxtLink>

        <!-- Page title — phones and tablets only. On desktop the active tab
             below carries the same information. -->
        <template v-if="pageTitle">
          <span class="md:hidden text-parchment-4 shrink-0">/</span>
          <h1 class="md:hidden text-base sm:text-lg font-bold text-ink tracking-tight truncate min-w-0">
            {{ pageTitle }}
          </h1>
        </template>
      </div>

      <!-- Destinations — desktop. min-w-0 so a long crumb truncates instead of
           widening the bar. -->
      <nav class="hidden md:flex items-center gap-1 min-w-0 flex-1" aria-label="Sections">
        <NuxtLink
          v-for="tab in tabs"
          :key="tab.to"
          :to="tab.to"
          class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors shrink-0"
          :class="isActive(tab.to)
            ? 'bg-flame-bg text-flame'
            : 'text-ink-muted hover:text-ink hover:bg-parchment-2'"
          :aria-current="isActive(tab.to) ? 'page' : undefined"
        >{{ tab.label }}</NuxtLink>

        <!-- Sub-page crumb: "Schedules" is already lit above, this names the
             specific thing you're on. -->
        <template v-if="subCrumb">
          <span class="hidden lg:inline text-parchment-4 shrink-0 px-1">/</span>
          <span class="hidden lg:inline text-sm font-semibold text-ink truncate min-w-0">{{ subCrumb }}</span>
        </template>
      </nav>

      <!-- Page actions + account -->
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto md:ml-0">
        <slot name="actions" />
        <UserMenu />
      </div>
    </div>
  </header>
</template>

<script setup>
// app/components/AppNav.vue
const props = defineProps({
  crumbs:    { type: Array,   default: () => [] },   // [{ label, to? }]
  sticky:    { type: Boolean, default: true },
  container: { type: String,  default: 'max-w-6xl' },
})

const { tabs, isActive } = useAppNavLinks()

const pageTitle = computed(() => props.crumbs.at(-1)?.label ?? '')

// Only show a desktop crumb when the page is BELOW a section — "Schedules"
// alone is already said by the active tab, so repeating it is noise.
const subCrumb = computed(() => (props.crumbs.length > 1 ? pageTitle.value : ''))
</script>