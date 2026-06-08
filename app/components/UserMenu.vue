<!-- app/components/UserMenu.vue -->
<template>
  <div ref="root" class="relative">
    <button
      class="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-full border border-parchment-3 bg-white hover:bg-parchment-2 transition-colors"
      @click="open = !open"
    >
      <span class="w-6 h-6 rounded-full bg-flame text-parchment text-xs font-bold grid place-items-center shrink-0">
        {{ initial }}
      </span>
      <svg
class="w-3.5 h-3.5 text-ink-faint transition-transform" :class="open ? 'rotate-180' : ''"
        fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
    </button>

    <Transition name="menu">
      <div
        v-if="open"
        class="absolute right-0 mt-2 w-56 bg-white border border-parchment-3 rounded-xl overflow-hidden z-50"
        style="box-shadow:0 8px 28px rgba(58,30,8,0.14)"
      >
        <div class="px-4 py-3 border-b border-parchment-3">
          <p class="text-xs text-ink-faint">Signed in as</p>
          <p class="text-sm font-semibold text-ink truncate">{{ email }}</p>
        </div>

        <nav class="py-1">
          <NuxtLink to="/account" class="menu-item" @click="open = false">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Account &amp; billing
          </NuxtLink>
        </nav>

        <div class="border-t border-parchment-3 py-1">
          <button class="menu-item w-full text-red-500 hover:bg-red-50" @click="signOut">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            Sign out
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
const supabase = useSupabaseClient()
const root  = ref(null)
const open  = ref(false)
const email = ref('')

const initial = computed(() => (email.value?.[0] ?? '?').toUpperCase())

onMounted(async () => {
  const { data: { user } } = await supabase.auth.getUser()
  email.value = user?.email ?? ''
  document.addEventListener('click', onOutside)
})
onUnmounted(() => document.removeEventListener('click', onOutside))

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
.menu-enter-active, .menu-leave-active { transition: opacity 0.12s, transform 0.12s; }
.menu-enter-from, .menu-leave-to { opacity: 0; transform: translateY(-4px); }
</style>