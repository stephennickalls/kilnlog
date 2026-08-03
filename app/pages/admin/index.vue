<!-- app/pages/admin/index.vue -->
<!--
  ADMIN (Aug 2026): landing page for admin tools, reached from the UserMenu
  "Admin" item (admins only). Cards link to each section; greyed cards mark
  what's planned. Non-admins are bounced to /app on mount — the APIs behind
  every section enforce the role regardless, so this is UX not security.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <header class="sticky top-0 z-20 bg-parchment/95 backdrop-blur border-b border-parchment-3">
      <div class="max-w-4xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
        <div class="flex items-center gap-3 min-w-0">
          <NuxtLink to="/app" class="text-base sm:text-lg font-bold flex items-center gap-2 text-ink tracking-tight hover:text-flame transition-colors shrink-0"><BrandFlame class="w-5 h-5 sm:w-6 sm:h-6" />KilnMonitor</NuxtLink>
          <span class="text-parchment-4 shrink-0">/</span>
          <h1 class="text-base sm:text-lg font-bold text-ink tracking-tight truncate">Admin</h1>
        </div>
        <NuxtLink
          to="/app"
          class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold border border-parchment-3 rounded-lg text-ink-muted hover:bg-parchment-2 hover:text-ink transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
          Back to app
        </NuxtLink>
      </div>
    </header>

    <div v-if="checking" class="flex justify-center py-20">
      <div class="w-7 h-7 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"/>
    </div>

    <div v-else class="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div class="grid sm:grid-cols-2 gap-4">

      <NuxtLink
        to="/admin/feedback"
        class="bg-white border border-parchment-3 rounded-2xl p-5 flex flex-col gap-2 hover:border-flame/40 transition-colors group"
        style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
      >
        <div class="flex items-center gap-2.5">
          <span class="w-9 h-9 rounded-xl bg-amber-50 border border-amber-300/60 grid place-items-center text-amber-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </span>
          <p class="text-base font-bold text-ink group-hover:text-flame transition-colors">Feedback</p>
        </div>
        <p class="text-sm text-ink-muted leading-relaxed">Bug reports and feature requests from users — triage, mark done, dismiss.</p>
      </NuxtLink>

        <NuxtLink
          to="/admin/announcements"
          class="bg-white border border-parchment-3 rounded-2xl p-5 flex flex-col gap-2 hover:border-flame/40 transition-colors group"
          style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        >
          <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-xl bg-cobalt-bg border border-cobalt/30 grid place-items-center text-cobalt-dark">
              <svg class="w-4.5 h-4.5 w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 11l18-7-7 18-2.5-7.5L3 11z"/></svg>
            </span>
            <p class="text-base font-bold text-ink group-hover:text-flame transition-colors">Announcements</p>
          </div>
          <p class="text-sm text-ink-muted leading-relaxed">Push banners to beta testers — schedule, edit, stop, and see who dismissed.</p>
        </NuxtLink>

        <NuxtLink
          to="/admin/users"
          class="bg-white border border-parchment-3 rounded-2xl p-5 flex flex-col gap-2 hover:border-flame/40 transition-colors group"
          style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        >
          <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-xl bg-celadon-bg border border-celadon/30 grid place-items-center text-celadon-dark">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            </span>
            <p class="text-base font-bold text-ink group-hover:text-flame transition-colors">Users</p>
          </div>
          <p class="text-sm text-ink-muted leading-relaxed">Every user with usage stats — search, filter by status, sort by activity.</p>
        </NuxtLink>

        <NuxtLink
          to="/admin/logs"
          class="bg-white border border-parchment-3 rounded-2xl p-5 flex flex-col gap-2 hover:border-flame/40 transition-colors group"
          style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        >
          <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-xl bg-flame-bg border border-flame/30 grid place-items-center text-flame">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>
            </span>
            <p class="text-base font-bold text-ink group-hover:text-flame transition-colors">Logs</p>
          </div>
          <p class="text-sm text-ink-muted leading-relaxed">Server and client errors, warnings, and events across all users.</p>
        </NuxtLink>

        

      </div>
    </div>
  </div>
</template>

<script setup>
// app/pages/admin/index.vue
definePageMeta({ middleware: 'auth' })

const supabase = useSupabaseClient()
const checking = ref(true)

// Shares the same cached role as UserMenu — one fetch per SPA session.
const roleState = useState('user-role', () => null)

onMounted(async () => {
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id
  if (!uid) return navigateTo('/login')

  if (roleState.value?.userId !== uid) {
    const { data } = await supabase.from('profiles').select('role').eq('id', uid).single()
    roleState.value = { userId: uid, role: data?.role ?? 'user' }
  }

  if (roleState.value.role !== 'admin') return navigateTo('/app')
  checking.value = false
})
</script>