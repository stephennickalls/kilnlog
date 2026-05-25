<!-- error.vue -->
<template>
  <div
    class="min-h-screen bg-parchment font-serif flex items-center justify-center px-6"
    style="background-image: radial-gradient(circle at 20% 80%, rgba(176,92,26,0.06) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(176,92,26,0.04) 0%, transparent 60%)"
  >
    <div class="w-full max-w-sm text-center flex flex-col items-center gap-6">

      <!-- Brand -->
      <div>
        <span class="text-5xl block mb-3">🔥</span>
        <h1 class="text-2xl font-bold text-ink tracking-tight">KilnMonitor</h1>
      </div>

      <!-- Error message -->
      <div class="flex flex-col items-center gap-2">
        <p class="text-4xl font-extrabold text-flame tracking-tight">{{ error.statusCode }}</p>
        <p class="text-base font-bold text-ink">
          {{ title }}
        </p>
        <p class="text-sm text-ink-muted leading-relaxed max-w-xs">
          {{ message }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex flex-col gap-3 w-full max-w-[220px]">
        <button
          class="w-full py-3 bg-flame text-parchment text-sm font-bold rounded-xl hover:bg-flame-dark transition-colors"
          @click="handleBack"
        >
          ← Back to app
        </button>
        <button
          class="w-full py-2.5 border border-parchment-3 text-ink-muted text-sm font-semibold rounded-xl hover:bg-parchment-2 transition-colors"
          @click="handleReload"
        >
          Try again
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
// error.vue
const error = useError()

const title = computed(() => {
  if (error.value?.statusCode === 404) return 'Page not found'
  if (error.value?.statusCode === 403) return 'Access denied'
  if (error.value?.statusCode === 401) return 'Not signed in'
  return 'Something went wrong'
})

const message = computed(() => {
  if (error.value?.statusCode === 404) return "We couldn't find what you were looking for."
  if (error.value?.statusCode === 403) return "You don't have permission to view this."
  if (error.value?.statusCode === 401) return 'Please sign in to continue.'
  return 'An unexpected error occurred. If this keeps happening, try refreshing the page.'
})

async function handleBack() {
  await clearError({ redirect: '/app' })
}

async function handleReload() {
  await clearError()
  window.location.reload()
}
</script>