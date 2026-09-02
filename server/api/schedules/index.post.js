// File: server/api/schedules/index.post.js
// Creates a library schedule with points, planned atmosphere periods, and a
// cone pack (the witness cones planned for firings run from this schedule).
//
// ZERO WIDTH (Aug 2026): sanitizeReductions no longer drops a row whose end
// equals its start. Equal means "a marker at one temperature"; NULL means
// "open-ended, run it to the finish". Both are legitimate. The old rule silently
// destroyed the oxidation band whenever a gas reduction preset was duplicated.
// See sql/fix_zero_width_oxidation.sql and the matching note in [id].put.js.
//
// ORIGIN (Aug 2026): library rows are written origin='planned' rather than
// falling to the 'live' default. A row that claims it was logged live but has
// no firing attached is a lie waiting to be read by something less careful.
//
// CLAY BODY IS BACK (Sep 2026). This handler dropped `body` for a while on the
// argument that its values mixed a material axis with a temperature axis. That
// was true of one value - 'midfire' is a cone range, not a clay - and the fix
// was to remove that value, not the column. The column is live, every built-in
// preset is tagged, and every client page sends it. While the server ignored
// it, no user schedule could ever be tagged and a duplicate of the porcelain
// preset filed itself under "Any body" with no way to tell why.
//
// The list here must match schedule_library_body_check
// (migrations/20260903_schedule_body_and_fuel.sql) and CLAY_BODIES in
// app/composables/useScheduleSections.js. NULL is valid and means "any body".
//
// 'midfire' is the one legacy value a stale client tab could still send, and
// it has a known right answer, so it is mapped to 'stoneware' rather than
// rejected. Anything else unknown is a 400: the column carries a CHECK, and
// silently nulling a typo would let the client believe it saved something it
// did not.
//
// NAMING TRAP: `body` is already the request body in this handler. The clay
// body is read as `body.body` and held as `clayBody`. Do not destructure it
// alongside name/type/cone or it shadows the request and everything below
// breaks.
const MIN_TEMP = -200
const MAX_TEMP = 1400
const MAX_REDUCTIONS = 50
const KINDS  = ['reduction', 'oxidation']
const BODIES = ['earthenware', 'stoneware', 'porcelain']

function sanitizeBody(value) {
  if (value === undefined || value === null || value === '') return null
  if (value === 'midfire') return 'stoneware'
  if (!BODIES.includes(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid clay body' })
  }
  return value
}

function sanitizeReductions(input) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const r of input.slice(0, MAX_REDUCTIONS)) {
    const start = Number(r?.startTemp)
    if (!Number.isFinite(start) || start < MIN_TEMP || start > MAX_TEMP) continue
    let end = null
    if (r?.endTemp !== null && r?.endTemp !== undefined && r?.endTemp !== '') {
      const e = Number(r.endTemp)
      if (!Number.isFinite(e) || e < MIN_TEMP || e > MAX_TEMP) continue
      end = Math.round(e)
    }
    const kind = KINDS.includes(r?.kind) ? r.kind : 'reduction'
    out.push({ start_temp: Math.round(start), end_temp: end, kind })
  }
  return out
}

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const body = await readBody(event)
  const { name, type, cone, description, source, points } = body

  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Schedule name is required' })
  if (!type?.trim()) throw createError({ statusCode: 400, statusMessage: 'Schedule type is required' })

  const validSource = ['custom', 'from_firing', 'preset_copy'].includes(source) ? source : 'custom'
  const clayBody    = sanitizeBody(body.body)
  const conePack    = await sanitizeConePack(db, body.conePack)

  const { data: schedule, error } = await db
    .from('schedule_library')
    .insert({
      name: name.trim(),
      type: type.trim(),
      cone: cone?.trim() || null,
      body: clayBody,
      description: description?.trim()?.slice(0, 500) || null,
      source: validSource,
      is_built_in: 0,
      user_id: user.id,
      cone_pack: conePack,
    })
    .select()
    .single()

  if (error) throw await serverError('schedules.create.failed', error, { userId: user.id })

  if (Array.isArray(points) && points.length) {
    const rows = points
      .filter(p => p.offsetMinutes >= 0 && p.targetTemp >= 0)
      .map(p => ({ library_id: schedule.id, offset_minutes: Number(p.offsetMinutes), target_temp: Number(p.targetTemp) }))
    if (rows.length) {
      const { error: ptErr } = await db.from('schedule_library_points').insert(rows)
      if (ptErr) throw await serverError('schedules.create.points_failed', ptErr, { userId: user.id, scheduleId: schedule.id })
    }
  }

  const reductions = sanitizeReductions(body.reductions)
  if (reductions.length) {
    const rows = reductions.map(r => ({
      library_id: schedule.id,
      start_temp: r.start_temp,
      end_temp:   r.end_temp,
      kind:       r.kind,
      origin:     'planned',
    }))
    const { error: redErr } = await db.from('reduction_periods').insert(rows)
    if (redErr) throw await serverError('schedules.create.reductions_failed', redErr, { userId: user.id, scheduleId: schedule.id })
  }

  logger.info('schedules.create.success', { scheduleId: schedule.id, userId: user.id, source: validSource })
  return schedule
})