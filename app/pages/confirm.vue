<template>
  <div class="min-h-screen bg-parchment font-serif flex items-center justify-center p-6">
    <div class="bg-white border border-parchment-3 rounded-2xl p-10 w-full max-w-sm shadow-lg text-center">
      <div class="text-3xl font-bold text-ink tracking-tight mb-6">Kiln.Log</div>
      <div class="flex flex-col items-center gap-4 text-ink-muted text-sm">
        <div class="w-8 h-8 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"></div>
        <p>{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const message = ref('Signing you in…')
const supabase = useSupabaseClient()

onMounted(async () => {
  // Listen for auth state change first — fires when Supabase processes the URL hash
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
      subscription.unsubscribe()
      message.value = 'Signed in! Redirecting…'
      navigateTo('/app')
    }
  })

  // Also try to get the session from the URL hash directly
  // This handles the case where the hash is in the URL
  if (window.location.hash) {
    const { data, error } = await supabase.auth.getSession()
    if (data?.session) {
      subscription.unsubscribe()
      message.value = 'Signed in! Redirecting…'
      await navigateTo('/app')
      return
    }
  }

  // Fallback — check session after a short delay
  setTimeout(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      subscription.unsubscribe()
      message.value = 'Signed in! Redirecting…'
      await navigateTo('/app')
    } else {
      message.value = 'Something went wrong. Redirecting…'
      setTimeout(() => navigateTo('/login'), 1500)
    }
  }, 2000)
})
</script>