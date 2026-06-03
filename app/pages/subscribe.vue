<!-- app/pages/subscribe.vue -->
<template>
  <div
v-if="mounted"
    class="min-h-screen bg-parchment font-serif flex flex-col lg:flex-row"
    style="background-image: radial-gradient(ellipse at 80% 20%, rgba(176,92,26,0.06) 0%, transparent 55%)"
  >

    <!-- ── Left — card ─────────────────────────────────────────────────────── -->
    <div class="flex-1 flex items-center justify-center px-6 py-12 lg:py-0">
      <div class="w-full max-w-sm bg-white border border-parchment-3 rounded-2xl p-10" style="box-shadow: 0 4px 24px rgba(0,0,0,0.06)">

        <!-- Brand -->
        <div class="text-center mb-6">
          <span class="text-5xl block mb-2">🔥</span>
          <h1 class="text-2xl font-bold text-ink tracking-tight">KilnMonitor</h1>
        </div>

        <!-- Trial expired notice -->
        <div class="text-center mb-6">
          <p class="text-base font-bold text-ink">Your free trial has ended</p>
          <p class="text-sm text-ink-muted mt-1">Subscribe to keep monitoring your kiln firings.</p>
        </div>

        <!-- Plan card -->
        <div class="bg-flame-bg border-2 border-parchment-3 rounded-xl p-7">

          <div class="text-center mb-5">
            <p class="text-xs font-bold uppercase tracking-widest text-flame mb-2">Annual Plan</p>
            <div class="flex items-baseline justify-center gap-1">
              <span class="text-6xl font-extrabold text-ink tracking-tight leading-none">$27</span>
              <span class="text-lg font-bold text-ink-muted">NZD</span>
              <span class="text-base text-ink-faint">/ year</span>
            </div>
            <p class="text-xs text-ink-muted mt-1">That's just $2.25/month</p>
          </div>

          <ul class="flex flex-col gap-2 mb-6">
            <li v-for="f in features" :key="f" class="flex items-center gap-2 text-sm text-ink">
              <svg class="w-4 h-4 text-flame shrink-0" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              {{ f }}
            </li>
          </ul>

          <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 mb-4">
            {{ error }}
          </div>

          <button
            :disabled="loading"
            class="w-full flex items-center justify-center gap-2 bg-flame text-parchment py-3.5 rounded-xl text-base font-bold hover:bg-flame-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            @click="checkout"
          >
            <span v-if="loading" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
            <span v-else>Subscribe now →</span>
          </button>

          <p class="text-center text-xs text-ink-faint mt-3">Secure payment via Stripe · Cancel anytime</p>
        </div>

        <p class="text-center mt-5 text-sm text-ink-muted">
          Wrong account?
          <button class="text-flame font-semibold hover:underline bg-transparent border-none cursor-pointer font-serif text-sm" @click="signOut">
            Sign out
          </button>
        </p>

      </div>
    </div>

    <!-- ── Right — marketing (desktop only) ───────────────────────────────── -->
    <div
class="hidden lg:flex flex-1 bg-ink items-center justify-center px-16"
      style="background-image: radial-gradient(ellipse at 20% 50%, rgba(176,92,26,0.18) 0%, transparent 60%)"
    >
      <div class="max-w-md">
        <p class="text-flame-light font-semibold tracking-[0.16em] uppercase text-xs mb-4">Your kiln deserves better</p>
        <h2 class="text-4xl font-bold text-parchment leading-tight tracking-tight mb-6">
          Monitor every firing.<br>Master your craft.
        </h2>
        <ul class="flex flex-col gap-4 mb-8">
          <li v-for="point in pitch" :key="point.title" class="flex items-start gap-3">
            <div class="w-8 h-8 bg-flame/10 border border-flame/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <span class="text-sm">{{ point.icon }}</span>
            </div>
            <div>
              <p class="text-sm font-bold text-parchment">{{ point.title }}</p>
              <p class="text-sm text-ink-muted mt-0.5 leading-relaxed">{{ point.body }}</p>
            </div>
          </li>
        </ul>
        <p class="text-xs text-ink-muted border-t border-white/10 pt-5">
          Less than a bag of clay. Cancel anytime.
        </p>
      </div>
    </div>

  </div>
  <div v-else class="min-h-screen bg-parchment" />
</template>

<script setup>
// app/pages/subscribe.vue
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const error    = ref('')
const loading  = ref(false)
const mounted  = ref(false)

onMounted(() => { mounted.value = true })

const features = [
  'Unlimited kiln firings',
  'ESP32 connected mode',
  'Manual logging mode',
  'Schedule library',
  'Full firing history',
  'Mobile & desktop',
]

const pitch = [
  { icon: '📡', title: 'Live temperature streaming', body: 'ESP32 sends readings every 5 seconds over WiFi. Watch the curve climb in real time.' },
  { icon: '✏️', title: 'Manual logging too', body: 'No sensor? Log readings by hand at your own pace. Every firing tracked.' },
  { icon: '📚', title: 'Schedule library', body: 'Built-in firing schedules for earthenware, stoneware, and porcelain. Customise as needed.' },
]

async function checkout() {
  loading.value = true
  error.value   = ''
  try {
    const { data } = await $fetch('/api/stripe/checkout', { method: 'POST' })
    if (data?.url) window.location.href = data.url
  } catch (err) {
    error.value   = err?.data?.message || 'Something went wrong. Please try again.'
    loading.value = false
  }
}

async function signOut() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>