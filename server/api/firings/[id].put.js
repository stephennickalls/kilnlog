// server/api/firings/[id].put.js

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data: existing } = await db
    .from('firings')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  const updates = {}
  if (body.startedAt      !== undefined) updates.started_at      = body.startedAt
  if ('endedAt' in body)                 updates.ended_at        = body.endedAt ?? null
  if (body.notes          !== undefined) updates.notes           = body.notes
  if (body.mode           !== undefined) updates.mode            = body.mode
  if (body.autoEnded      !== undefined) updates.auto_ended      = body.autoEnded
  // Pause/resume + recalibrate: minutes to shift the planned schedule by.
  // Cumulative — the client sends the new total. null/undefined leaves it untouched.
  if (body.scheduleOffset !== undefined) updates.schedule_offset = body.scheduleOffset ?? 0
  // pausedAt: unix seconds when the firing was paused, or null when running/resumed.
  if ('pausedAt' in body)                updates.paused_at       = body.pausedAt ?? null

  // Restarting a firing clears the auto_ended flag
  if ('endedAt' in body && body.endedAt === null) {
    updates.auto_ended = false
  }

  const { data, error } = await db
    .from('firings')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    logger.error('firings.update.failed', { firingId: id, userId: user.id, updates, err: error })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  logger.info('firings.update.success', { firingId: id, userId: user.id, updates })
  return data
})