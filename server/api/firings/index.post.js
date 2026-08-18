// File: server/api/firings/index.post.js
//
// PACKAGE 3 - D4 (atomic create), G5 (single active), S7 (validation).
// - Accepts optional `startedAt` so create+start is ONE request.
// - Accepts optional `reductions` ([{ startTemp, endTemp|null, kind }] °C)
//   planned for this firing; inserted into reduction_periods by firing_id.
// - Single-active enforced by a friendly pre-check + the
//   one_active_firing_per_user partial unique index (real guarantee).
//
// CONE-FIRST (Aug 2026):
// - `fuel` ('gas' | 'wood', default 'gas'). There is no electric mode.
// - auto_end_hours is derived from the fuel SERVER-SIDE and never sent by the
//   client: the fuel choice IS the configuration. A wood firing runs for days
//   with long unlogged stretches; a 36h gas limit would close it mid-stoke.
// - reductions carry `kind` ('reduction' | 'oxidation') so a plan can express
//   the finishing oxidation, not only the reduction window.
// - `conePack` (string[]): the witness cones planned for this firing, copied
//   from the schedule like the curve. Validated against the cones table via
//   sanitizeConePack (server/utils/conePack.js); unknown names drop silently -
//   the pack is presentation priority, never a gate on logging.

const MAX_NAME       = 120
const MAX_NOTES      = 5000
const MAX_POINTS     = 200
const MAX_REDUCTIONS = 50
const MAX_OFFSET_MIN = 20160        // 14 days
const MIN_TEMP       = -200
const MAX_TEMP       = 1400
const MIN_TS         = 1577836800   // 2020-01-01
const FUTURE_SKEW    = 5 * 60

const FUELS = ['gas', 'wood']
const KINDS = ['reduction', 'oxidation']

function bad(msg) { return createError({ statusCode: 400, statusMessage: msg }) }

function sanitizeReductions(input) {
  if (input === undefined) return []
  if (!Array.isArray(input)) throw bad('reductions must be an array')
  if (input.length > MAX_REDUCTIONS) throw bad(`Cannot exceed ${MAX_REDUCTIONS} reductions`)
  const out = []
  for (const r of input) {
    const start = Number(r?.startTemp)
    if (!Number.isFinite(start) || start < MIN_TEMP || start > MAX_TEMP) continue
    let end = null
    if (r?.endTemp !== null && r?.endTemp !== undefined && r?.endTemp !== '') {
      const e = Number(r.endTemp)
      if (!Number.isFinite(e) || e < MIN_TEMP || e > MAX_TEMP) throw bad('Invalid reduction end temperature')
      if (Math.round(e) === Math.round(start)) throw bad('Reduction end must differ from start')
      end = Math.round(e)
    }
    // Unknown/absent kind falls back to 'reduction' - the pre-cone-first
    // meaning of every row, so an old client keeps working unchanged.
    const kind = KINDS.includes(r?.kind) ? r.kind : 'reduction'
    out.push({ start_temp: Math.round(start), end_temp: end, kind })
  }
  return out
}

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
    if (!Number.isInteger(ts) || ts < MIN_TS || ts > now + FUTURE_SKEW) throw bad('Invalid start time')
    startedAt = ts
  }

  let fuel = 'gas'
  if (body.fuel !== undefined && body.fuel !== null && body.fuel !== '') {
    if (!FUELS.includes(body.fuel)) throw bad('Fuel must be gas or wood')
    fuel = body.fuel
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

  const reductions = sanitizeReductions(body.reductions)

  // Raw names only here; resolution against the cones table needs the db, so
  // the handler runs sanitizeConePack after validation.
  const conePackInput = Array.isArray(body.conePack) ? body.conePack : []

  return { name, notes, startedAt, fuel, points, reductions, conePackInput }
}

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)

  const body = await readBody(event)
  const { name, notes, startedAt, fuel, points, reductions, conePackInput } = validateBody(body ?? {})

  const conePack = await sanitizeConePack(db, conePackInput)

  // Friendly pre-check; race-safe enforcement is the partial unique index.
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
      fuel,
      // Silent per-fuel auto-end limit. See server/utils/autoEndStale.js.
      auto_end_hours: AUTO_END_HOURS_BY_FUEL[fuel] ?? null,
      cone_pack: conePack,
    })
    .select()
    .single()

  if (error) {
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
      await db.from('firings').delete().eq('id', firing.id)   // cascade clears partials
      throw await serverError('firings.create.schedule_failed', schedErr, { userId: user.id, firingId: firing.id })
    }
  }

  if (reductions.length) {
    // REDUCTION-TIME (Aug 2026): planned rows are marked origin='planned' so the
    // chart temp-anchors them; live tapped rows (origin='live', the default)
    // time-anchor by created_at. Without this, a planned reduction's
    // created_at ~ started_at made it render from minute ~0.
    const rows = reductions.map(r => ({
      firing_id:  firing.id,
      start_temp: r.start_temp,
      end_temp:   r.end_temp,
      origin:     'planned',
      kind:       r.kind,
    }))
    const { error: redErr } = await db.from('reduction_periods').insert(rows)
    if (redErr) {
      await db.from('firings').delete().eq('id', firing.id)   // cascade clears partials
      throw await serverError('firings.create.reductions_failed', redErr, { userId: user.id, firingId: firing.id })
    }
  }

  // Durable lifecycle event - the app's heartbeat on /admin/logs.
  await logger.tracked('info', startedAt ? 'firing.started' : 'firing.created', {
    userId: user.id, firingId: firing.id, fuel, points: points.length,
    planned_reductions: reductions.length, cone_pack: conePack.length,
  })
  return firing
})