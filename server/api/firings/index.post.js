// File: server/api/firings/index.post.js
//
// PACKAGE 3 — D4 (atomic create), G5 (single active), S7 (validation).
// - Accepts optional `startedAt` so create+start is ONE request (the client
//   previously POSTed then PUT startedAt; a failure between left a created-
//   but-never-started firing).
// - Single-active is enforced twice: a friendly pre-check (clean 409 message)
//   and the one_active_firing_per_user partial unique index (the real
//   guarantee — catches the check-then-write race as a 23505).
// - All inputs validated/clamped before touching the DB.

const MAX_NAME       = 120
const MAX_NOTES      = 5000
const MAX_POINTS     = 200
const MAX_OFFSET_MIN = 20160        // 14 days — covers long wood firings
const MIN_TEMP       = -200
const MAX_TEMP       = 1400
const MIN_TS         = 1577836800   // 2020-01-01 — rejects ms-vs-s mixups & junk
const FUTURE_SKEW    = 5 * 60

function bad(msg) { return createError({ statusCode: 400, statusMessage: msg }) }

function validateBody(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) throw bad('Firing name is required')
  if (name.length > MAX_NAME) throw bad(`Firing name must be ${MAX_NAME} characters or fewer`)

  let notes = null
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== 'string') throw bad('Notes must be text')
    notes = body.notes.trim().slice(0, MAX_NOTES) || null
  }

  let startedAt = null
  if (body.startedAt !== undefined && body.startedAt !== null) {
    const ts  = Number(body.startedAt)
    const now = Math.floor(Date.now() / 1000)
    if (!Number.isInteger(ts) || ts < MIN_TS || ts > now + FUTURE_SKEW) {
      throw bad('Invalid start time')
    }
    startedAt = ts
  }

  let points = []
  if (body.schedulePoints !== undefined) {
    if (!Array.isArray(body.schedulePoints)) throw bad('schedulePoints must be an array')
    if (body.schedulePoints.length > MAX_POINTS) throw bad(`Schedule cannot exceed ${MAX_POINTS} points`)
    points = body.schedulePoints
      .map(p => ({ offset: Number(p?.offsetMinutes), temp: Number(p?.targetTemp) }))
      .filter(p =>
        Number.isFinite(p.offset) && p.offset >= 0 && p.offset <= MAX_OFFSET_MIN &&
        Number.isFinite(p.temp)   && p.temp >= MIN_TEMP && p.temp <= MAX_TEMP
      )
  }

  return { name, notes, startedAt, points }
}

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const body = await readBody(event)
  const { name, notes, startedAt, points } = validateBody(body ?? {})

  // Friendly pre-check for the common case (clear message before the index
  // backstop). Race-safe enforcement is the partial unique index below.
  if (startedAt) {
    const { data: active } = await db
      .from('firings')
      .select('id, name')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .not('started_at', 'is', null)
      .limit(1)
    if (active?.length) {
      throw createError({
        statusCode: 409,
        statusMessage: `"${active[0].name}" is still active — end it before starting a new firing.`,
      })
    }
  }

  const { data: firing, error } = await db
    .from('firings')
    .insert({
      name,
      notes,
      started_at: startedAt,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    // 23505 on one_active_firing_per_user = lost the race; surface as 409.
    if (error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'Another firing is already active — end it first.' })
    }
    throw await serverError('firings.create.failed', error, { userId: user.id })
  }

  if (points.length) {
    const rows = points.map(p => ({
      firing_id: firing.id,
      offset_minutes: Math.round(p.offset),
      target_temp: p.temp,
    }))
    const { error: schedErr } = await db.from('schedule').insert(rows)
    if (schedErr) {
      // Don't strand a half-created firing: roll back the parent (cascade
      // clears any partial schedule rows) and report failure.
      await db.from('firings').delete().eq('id', firing.id)
      throw await serverError('firings.create.schedule_failed', schedErr, { userId: user.id, firingId: firing.id })
    }
  }

  logger.info('firings.create.success', { firingId: firing.id, userId: user.id, started: !!startedAt })
  return firing
})