<template>
  <div class="min-h-screen bg-parchment font-serif flex items-center justify-center p-6">
    <div class="bg-white border border-parchment-3 rounded-2xl p-10 w-full max-w-sm shadow-lg text-center">
      <div class="text-3xl font-bold text-ink tracking-tight mb-6">Kiln.Log</div>
      <div class="flex flex-col items-center gap-4 text-sm" :class="error ? 'text-red-500' : 'text-ink-muted'">
        <div v-if="!error" class="w-8 h-8 border-[3px] border-parchment-3 border-t-flame rounded-full animate-spin"></div>
        <p>{{ message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: false })

const message = ref('Signing you in…')
const error   = ref(false)
const supabase = useSupabaseClient()

onMounted(async () => {
  // Wait for Supabase to process the OAuth hash from the URL
  // It handles this automatically, we just need to poll for the session
  let attempts = 0

  const tryRedirect = async () => {
    attempts++
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        message.value = 'Signed in! Redirecting…'
        // Use window.location for a hard redirect — avoids SSR middleware race condition
        window.location.href = '/app'
        return
      }
    } catch (e) {
      console.error('Session check error:', e)
    }

    if (attempts >= 20) {
      error.value   = true
      message.value = 'Could not sign in. Please try again.'
      setTimeout(() => { window.location.href = '/login' }, 2000)
      return
    }

    setTimeout(tryRedirect, 500)
  }

  // Give Supabase a moment to process the hash token first
  setTimeout(tryRedirect, 800)
})
</script>