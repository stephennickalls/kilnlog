// File: server/api/firings/[id].put.js
//
// PACKAGE 3 — S7 (validation), G2 (rename), G5 (single-active on restart).
// Every accepted field is now type/range-checked before it reaches the DB;
// previously strings, negatives, and absurd timestamps went straight through
// (500s with the raw payload echoed into logs).

const MAX_NAME    = 120
const MAX_NOTES   = 5000
const MAX_OFFSET  = 20160        // schedule_offset bounds, minutes (±14 days)
const MIN_TS      = 1577836800   // 2020-01-01
const FUTURE_SKEW = 5 * 60

function bad(msg) { return createError({ statusCode: 400, statusMessage: msg }) }

function asUnixTs(value, label) {
  const ts  = Number(value)
  const now = Math.floor(Date.now() / 1000)
  if (!Number.isInteger(ts) || ts < MIN_TS || ts > now + FUTURE_SKEW) {
    throw bad(`Invalid ${label}`)
  }
  return ts
}

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event) ?? {}
  if (isNaN(id)) throw bad('Invalid id')

  const { data: existing } = await db
    .from('firings')
    .select('id, name, started_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  const updates = {}

  // G2: rename
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) throw bad('Firing name cannot be empty')
    if (body.name.trim().length > MAX_NAME) throw bad(`Firing name must be ${MAX_NAME} characters or fewer`)
    updates.name = body.name.trim()
  }

  if (body.startedAt !== undefined) {
    updates.started_at = body.startedAt === null ? null : asUnixTs(body.startedAt, 'start time')
  }

  if ('endedAt' in body) {
    updates.ended_at = body.endedAt === null || body.endedAt === undefined
      ? null
      : asUnixTs(body.endedAt, 'end time')
    // ended must not precede started
    const effectiveStart = updates.started_at !== undefined ? updates.started_at : existing.started_at
    if (updates.ended_at !== null && effectiveStart && updates.ended_at < effectiveStart) {
      throw bad('End time cannot be before the start time')
    }
  }

  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== 'string') throw bad('Notes must be text')
    updates.notes = body.notes === null ? null : body.notes.trim().slice(0, MAX_NOTES) || null
  }

  if (body.autoEnded !== undefined) {
    if (typeof body.autoEnded !== 'boolean') throw bad('autoEnded must be true or false')
    updates.auto_ended = body.autoEnded
  }

  if (body.scheduleOffset !== undefined) {
    const off = body.scheduleOffset === null ? 0 : Number(body.scheduleOffset)
    if (!Number.isFinite(off) || Math.abs(off) > MAX_OFFSET) throw bad('Invalid schedule offset')
    updates.schedule_offset = Math.round(off)
  }

  if ('pausedAt' in body) {
    updates.paused_at = body.pausedAt === null || body.pausedAt === undefined
      ? null
      : asUnixTs(body.pausedAt, 'pause time')
  }

  if (!Object.keys(updates).length) throw bad('No valid fields to update')

  // Restart (clearing ended_at): clear the auto-ended flag, stamp
  // restarted_at so the auto-ender exempts it until a fresh reading lands,
  // and G5-guard against a second active firing.
  if ('endedAt' in body && updates.ended_at === null) {
    updates.auto_ended   = false
    updates.restarted_at = Math.floor(Date.now() / 1000)

    const { data: active } = await db
      .from('firings')
      .select('id, name')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .not('started_at', 'is', null)
      .neq('id', id)
      .limit(1)
    if (active?.length) {
      throw createError({
        statusCode: 409,
        statusMessage: `"${active[0].name}" is still active — end it before restarting this firing.`,
      })
    }
  }

  const { data, error } = await db
    .from('firings')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    // 23505 on one_active_firing_per_user = lost a restart race; 409 not 500.
    if (error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Another firing is already active — end it first.' })
    }
    throw await serverError('firings.update.failed', error, { userId: user.id, firingId: id, updates })
  }

  logger.info('firings.update.success', { firingId: id, userId: user.id, updates })
  return data
})