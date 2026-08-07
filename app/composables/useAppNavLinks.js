// File: app/composables/useAppNavLinks.js
//
// One list of destinations for the whole app. AppNav renders it as visible
// tabs on desktop; UserMenu renders the same list as a full-screen sheet on
// mobile. Adding a section means editing this array and nothing else — the
// previous split (hard-coded links in UserMenu, nothing in the header) is how
// /account ended up with no navigation at all.
//
// ROLE: /api/bootstrap writes the shared 'user-role' state. Two shapes exist
// in the codebase — a bare 'admin' string (UserMenu's old assumption) and
// { userId, role } (what admin/index.vue actually writes). Both are accepted
// here, which is what finally makes the Admin tab appear.

export function useAppNavLinks() {
  const route = useRoute()
  const roleState = useState('user-role', () => null)

  const isAdmin = computed(
    () => roleState.value === 'admin' || roleState.value?.role === 'admin',
  )

  const links = computed(() => [
    {
      to: '/app',
      label: 'Firings',
      icon: 'M3 15l4-6 4 3 4-8 6 11',
    },
    {
      to: '/schedules',
      label: 'Schedules',
      icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
    },
    {
      to: '/account',
      label: 'Account',
      icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M16 7a4 4 0 11-8 0 4 4 0 018 0',
      // Reachable from the avatar on desktop, so it doesn't need a tab.
      tab: false,
    },
    ...(isAdmin.value
      ? [{
          to: '/admin',
          label: 'Admin',
          icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
        }]
      : []),
  ])

  // Tabs shown in the bar itself.
  const tabs = computed(() => links.value.filter(l => l.tab !== false))

  // /schedules/new highlights Schedules; /app must match exactly so it doesn't
  // light up on every route.
  const isActive = to => (to === '/app'
    ? route.path === '/app'
    : route.path === to || route.path.startsWith(`${to}/`))

  return { links, tabs, isActive, isAdmin }
}