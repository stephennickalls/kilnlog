export default defineEventHandler(async () => {
  const db = useSupabase()

  const { data, error } = await db
    .from('firings')
    .select('*')
    .not('started_at', 'is', null)
    .is('ended_at', null)
    .single()

  if (error || !data) return { firingId: null, message: 'No active firing' }

  return { firingId: data.id, name: data.name, startedAt: data.started_at }
})