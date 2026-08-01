// server/api/firings/[id]/cones.post.js
// POST /api/firings/:id/cones — log a witness-cone drop on a LIVE firing.
// Body: { cone: '6' }. Timestamp is server-now; temp_at_drop is snapshotted
// from the latest reading (nullable — a drop can be logged before any reading).
// Returns the created row.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const firingId = parseInt(event.context.params.id, 10)
  if (!Number.isInteger(firingId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid firing id' })
  }

  const body = await readBody(event)
  const cone = typeof body?.cone === 'string' ? body.cone.trim() : ''
  if (!cone || cone.length > 8) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid cone' })
  }

  // Ownership + liveness check (RLS also guards, but a clear 404/409 beats a
  // silent empty insert failure).
  const { data: firing, error: fErr } = await db
    .from('firings')
    .select('id, started_at, ended_at')
    .eq('id', firingId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (fErr) throw await serverError('cones.drop.firing_lookup_failed', fErr, { userId: user.id, firingId })
  if (!firing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })
  if (!firing.started_at || firing.ended_at) {
    throw createError({ statusCode: 409, statusMessage: 'Cone drops can only be logged on a live firing' })
  }

  // Snapshot the current pyrometer temp (latest reading), if any.
  const { data: lastReading } = await db
    .from('readings')
    .select('temperature')
    .eq('firing_id', firingId)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await db
    .from('cone_drops')
    .insert({
      firing_id:    firingId,
      cone,
      dropped_at:   Math.floor(Date.now() / 1000),
      temp_at_drop: lastReading?.temperature ?? null,
    })
    .select()
    .single()

  if (error) throw await serverError('cones.drop.insert_failed', error, { userId: user.id, firingId, cone })
  return data
})