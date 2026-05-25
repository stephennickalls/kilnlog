// app/composables/useFiringRealtime.js
//
// Subscribes to INSERTs on the readings table for a specific firing.
// Replaces the 5-second polling loop with server-pushed updates.
//
// Usage:
//   const realtime = useFiringRealtime()
//   realtime.subscribe(firingId, (reading) => { ...append to chart... })
//   realtime.unsubscribe()  // on firing change or unmount

export function useFiringRealtime() {
  const supabase = useSupabaseClient()
  let channel = null

  function subscribe(firingId, onReading) {
    unsubscribe()

    channel = supabase
      .channel(`readings:firing:${firingId}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'readings',
          filter: `firing_id=eq.${firingId}`,
        },
        (payload) => {
          if (payload.new) onReading(payload.new)
        }
      )
      .subscribe()

    return channel
  }

  function unsubscribe() {
    if (channel) {
      supabase.removeChannel(channel)
      channel = null
    }
  }

  return { subscribe, unsubscribe }
}