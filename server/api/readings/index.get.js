// server/api/readings/index.get.js
// Supports ?since=<unix> to fetch only readings newer than a timestamp —
// used by the live poll so we don't re-download the whole firing every 5s.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const query = getQuery(event)
  if (!query.firingId) throw createError({ statusCode: 400, statusMessage: 'firingId is required' })

  const firingId = Number(query.firingId)

  const { data: firing } = await db
    .from('firings')
    .select('id')
    .eq('id', firingId)
    .eq('user_id', user.id)
    .single()

  if (!firing) throw createError({ statusCode: 403, statusMessage: 'Firing not found' })

  let q = db
    .from('readings')
    .select('*')
    .eq('firing_id', firingId)
    .order('timestamp', { ascending: true })

  if (query.since !== undefined && query.since !== '') {
    q = q.gt('timestamp', Number(query.since))
  }

  const { data, error } = await q
  if (error) throw serverError('readings.list.failed', error, { userId: user.id, firingId })
  return data
})