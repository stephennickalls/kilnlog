<!-- File: app/components/UserMenu.vue -->
<!--
  The avatar control in AppNav. Two faces:

    desktop — a compact dropdown: Account, Admin, Privacy, Sign out. The
              destinations (Firings, Schedules) are NOT repeated here; they're
              visible tabs in the bar itself.
    mobile  — a full-screen sheet carrying EVERY destination, because below md
              the tabs are hidden and this is the only way around the app.

  Both read useAppNavLinks(), so the sheet can never fall out of step with the
  bar. A 224px dropdown pinned to the right edge of a 320px screen is a bad
  target and gets clipped by the header's backdrop-blur containing block —
  hence the sheet, teleported to <body>.
-->
<template>
  <div ref="root" class="relative shrink-0">
    <button
      class="flex items-center gap-1.5 pl-1.5 pr-1 sm:pl-2 sm:pr-1.5 py-1 rounded-full border border-parchment-3 bg-white hover:bg-parchment-2 transition-colors"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-label="Account and navigation menu"
      @click="open = !open"
    >
      <span class="w-6 h-6 rounded-full bg-flame text-parchment text-xs font-bold grid place-items-center shrink-0">
        {{ initial }}
      </span>
      <svg
        class="w-3.5 h-3.5 text-ink-faint transition-transform shrink-0" :class="open ? 'rotate-180' : ''"
        fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
    </button>

    <!-- ── Desktop dropdown ─────────────────────────────────────────────── -->
    <Transition name="menu">
      <div
        v-if="open"
        class="hidden md:block absolute right-0 mt-2 w-60 max-w-[calc(100vw-1.5rem)] bg-white border border-parchment-3 rounded-xl overflow-hidden z-50"
        style="box-shadow:0 8px 28px rgba(58,30,8,0.14)"
      >
        <div class="px-4 py-3 border-b border-parchment-3">
          <p class="text-xs text-ink-faint">Signed in as</p>
          <p class="text-sm font-semibold text-ink truncate">{{ email }}</p>
        </div>

        <nav class="py-1">
          <!-- Account only — Firings/Schedules/Admin are tabs in the bar. -->
          <NuxtLink to="/account" class="menu-item" @click="open = false">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Account
          </NuxtLink>

          <!-- Privacy — new tab, so it never navigates away from a live firing. -->
          <NuxtLink to="/privacy" target="_blank" class="menu-item text-ink-muted" @click="open = false">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Privacy policy
          </NuxtLink>
        </nav>

        <div class="border-t border-parchment-3 py-1">
          <button class="menu-item w-full text-red-500 hover:bg-red-50" @click="signOut">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Sign out
          </button>
        </div>
      </div>
    </Transition>

    <!-- ── Mobile sheet — the whole app, since the tabs are hidden here ──── -->
    <Teleport to="body">
      <Transition name="sheet">
        <div
          v-if="open"
          class="md:hidden fixed inset-0 z-[90] flex flex-col bg-parchment font-serif"
          role="dialog"
          aria-label="Menu"
        >
          <div class="flex items-center justify-between px-4 py-3 border-b border-parchment-3 shrink-0">
            <span class="flex items-center gap-2 text-base font-bold text-ink tracking-tight">
              <BrandFlame class="w-5 h-5" />
              KilnMonitor
            </span>
            <button class="p-2 -mr-1 rounded-lg text-ink-muted active:bg-parchment-2" aria-label="Close menu" @click="open = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div v-if="email" class="px-4 py-3 border-b border-parchment-3 shrink-0">
            <p class="text-xs text-ink-faint">Signed in as</p>
            <p class="text-sm font-semibold text-ink break-all">{{ email }}</p>
          </div>

          <nav class="flex-1 overflow-y-auto py-2">
            <NuxtLink
              v-for="l in links"
              :key="l.to"
              :to="l.to"
              class="nav-item"
              :class="isActive(l.to) ? 'text-flame' : ''"
              :aria-current="isActive(l.to) ? 'page' : undefined"
              @click="open = false"
            >
              <span
                class="w-10 h-10 rounded-xl grid place-items-center shrink-0 border"
                :class="isActive(l.to) ? 'bg-flame-bg border-flame/30 text-flame' : 'bg-white border-parchment-3 text-ink-muted'"
              >
                <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path :d="l.icon"/></svg>
              </span>
              {{ l.label }}
            </NuxtLink>

            <NuxtLink to="/privacy" target="_blank" class="nav-item text-ink-muted" @click="open = false">
              <span class="w-10 h-10 rounded-xl bg-white border border-parchment-3 grid place-items-center text-ink-muted shrink-0">
                <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </span>
              Privacy policy
            </NuxtLink>
          </nav>

          <div class="border-t border-parchment-3 p-3 pb-safe shrink-0">
            <button
              class="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-200 text-red-500 text-sm font-semibold active:bg-red-50 transition-colors"
              @click="signOut"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Sign out
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
// app/components/UserMenu.vue
// PERF: getSession() reads the session locally — the email renders on first
// paint with no network call.
const supabase = useSupabaseClient()
const route = useRoute()
const { links, isActive } = useAppNavLinks()

const root  = ref(null)
const open  = ref(false)
const email = ref('')

const initial = computed(() => (email.value?.[0] ?? '?').toUpperCase())

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()   // local, no network
  email.value = session?.user?.email ?? ''
  document.addEventListener('click', onOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', onOutside)
  unlockScroll()
})

// Route change closes the menu — otherwise the sheet stays over the page you
// just navigated to.
watch(() => route.fullPath, () => { open.value = false })

// The sheet is full-screen; freeze the page behind it.
watch(open, v => (v ? lockScroll() : unlockScroll()))
function lockScroll()   { if (import.meta.client) document.documentElement.style.overflow = 'hidden' }
function unlockScroll() { if (import.meta.client) document.documentElement.style.overflow = '' }

function onOutside(e) {
  if (open.value && root.value && !root.value.contains(e.target)) open.value = false
}

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<style scoped>
.menu-item {
  display: flex; align-items: center; gap: 0.625rem;
  padding: 0.5rem 1rem; font-size: 0.875rem; font-weight: 600;
  color: var(--ink, #3a1e08);
  transition: background-color 0.12s;
}
.menu-item:hover { background: var(--parchment-2, #f5ede0); }

.nav-item {
  display: flex; align-items: center; gap: 0.875rem;
  padding: 0.625rem 1rem; min-height: 44px;
  font-size: 1rem; font-weight: 600;
  color: var(--ink, #3a1e08);
  transition: background-color 0.12s;
}
.nav-item:active { background: var(--parchment-2, #f5ede0); }

.menu-enter-active, .menu-leave-active { transition: opacity 0.12s, transform 0.12s; }
.menu-enter-from, .menu-leave-to { opacity: 0; transform: translateY(-4px); }
.sheet-enter-active, .sheet-leave-active { transition: opacity 0.15s ease; }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
</style>