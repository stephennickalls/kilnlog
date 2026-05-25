// app/composables/useToast.js
// Lightweight single-toast system — replaces alert() in app.vue.
// Usage: const toast = useToast(); toast.show('Something went wrong', 'error')

const message = ref('')
const type    = ref('error') // 'error' | 'success'
const visible = ref(false)
let timer = null

export function useToast() {
  function show(msg, t = 'error') {
    message.value = msg
    type.value    = t
    visible.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { visible.value = false }, 4000)
  }

  function hide() {
    visible.value = false
    if (timer) clearTimeout(timer)
  }

  return { message, type, visible, show, hide }
}