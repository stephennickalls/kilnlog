<!-- File: app/pages/admin/index.vue -->
<!--
  ADMIN (Aug 2026): landing page for admin tools, reached from the account menu
  ("Admin", admins only). Non-admins are bounced to /app on mount — the APIs
  behind every section enforce the role regardless, so this is UX not security.

  MOBILE (Aug 2026): header replaced with the shared AppNav (the old one hid
  its only navigation control below sm). Cards were `grid sm:grid-cols-2` with
  p-5 — fine — but the icon+title rows could push at 320px, so they now wrap.

  ROLE STATE: this page writes `{ userId, role }` into the shared 'user-role'
  state. UserMenu reads both that and the bare-string shape, so the Admin link
  finally shows up after a visit here.
-->
<template>
  <div class="min-h-screen bg-parchment font-serif">

    <AppNav :crumbs="[{ label: 'Admin' }]" container="max-w-4xl" />

    <div v-if="checking" class="flex justify-center py-20">
      <div class="w-7 h-7 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"/>
    </div>

    <div v-else class="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-safe">
      <div class="grid sm:grid-cols-2 gap-3 sm:gap-4">

        <NuxtLink
          v-for="card in cards"
          :key="card.to"
          :to="card.to"
          class="bg-white border border-parchment-3 rounded-2xl p-4 sm:p-5 flex flex-col gap-2 hover:border-flame/40 transition-colors group min-w-0"
          style="box-shadow:0 2px 12px rgba(58,30,8,0.06)"
        >
          <div class="flex items-center gap-2.5 min-w-0">
            <span class="w-9 h-9 rounded-xl grid place-items-center shrink-0 border" :class="card.chip">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path :d="card.icon"/></svg>
            </span>
            <p class="text-base font-bold text-ink group-hover:text-flame transition-colors truncate min-w-0">{{ card.title }}</p>
          </div>
          <p class="text-sm text-ink-muted leading-relaxed">{{ card.body }}</p>
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

// Cards moved into data — four near-identical NuxtLink blocks were 60 lines of
// copy-paste, and any responsive fix had to be made four times.
const cards = [
  {
    to: '/admin/feedback',
    title: 'Feedback',
    body: 'Bug reports and feature requests from users — triage, mark done, dismiss.',
    chip: 'bg-amber-50 border-amber-300/60 text-amber-600',
    icon: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  },
  {
    to: '/admin/announcements',
    title: 'Announcements',
    body: 'Push banners to beta testers — schedule, edit, stop, and see who dismissed.',
    chip: 'bg-cobalt-bg border-cobalt/30 text-cobalt-dark',
    icon: 'M3 11l18-7-7 18-2.5-7.5L3 11z',
  },
  {
    to: '/admin/users',
    title: 'Users',
    body: 'Every user with usage stats — search, filter by status, sort by activity.',
    chip: 'bg-celadon-bg border-celadon/30 text-celadon-dark',
    icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M13 7a4 4 0 11-8 0 4 4 0 018 0M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  },
  {
    to: '/admin/logs',
    title: 'Logs',
    body: 'Server and client errors, warnings, and events across all users.',
    chip: 'bg-flame-bg border-flame/30 text-flame',
    icon: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  },
]

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