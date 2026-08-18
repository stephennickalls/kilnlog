// File: server/api/firings/[id]/reductions.post.js
// POST /api/firings/:id/reductions - start an atmosphere period.
// Body: { startTemp: number, kind?: 'reduction' | 'oxidation' }
//
// Opens a period with end_temp = null. The partial unique index
// reduction_one_open_per_firing guarantees only one open period at a time;
// a second start while one is open returns 409.
//
// REDUCTION-TIME (Aug 2026): created_at is the band's time anchor on the
// chart; ended_at (null while open) is returned so the client-side row shape
// matches what the PUT returns on close.
//
// CONE-FIRST (Aug 2026): `kind` distinguishes a reduction band from a
// deliberate oxidation band (the Arbuckle finishing oxidation, wood-firing
// cycling). Neutral is NOT a kind - it is the default state between bands and
// has no row. Omitted kind defaults to 'reduction', the old meaning.
const MIN_TEMP = -200
const MAX_TEMP = 1400
const KINDS    = ['reduction', 'oxidation']

export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const firingId = Number(getRouterParam(event, 'id'))
  if (isNaN(firingId)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const body = await readBody(event) ?? {}
  const startTemp = Number(body.startTemp)
  if (!Number.isFinite(startTemp) || startTemp < MIN_TEMP || startTemp > MAX_TEMP) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid start temperature' })
  }

  let kind = 'reduction'
  if (body.kind !== undefined && body.kind !== null && body.kind !== '') {
    if (!KINDS.includes(body.kind)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid atmosphere kind' })
    }
    kind = body.kind
  }

  // Ownership.
  const { data: firing } = await db
    .from('firings').select('id').eq('id', firingId).eq('user_id', user.id).single()
  if (!firing) throw createError({ statusCode: 404, statusMessage: 'Firing not found' })

  const { data, error } = await db
    .from('reduction_periods')
    .insert({ firing_id: firingId, start_temp: startTemp, end_temp: null, kind })
    .select('id, start_temp, end_temp, created_at, ended_at, origin, kind')
    .single()

  if (error) {
    if (error.code === '23505') {
      throw createError({ statusCode: 409, statusMessage: 'A reduction period is already in progress — end it first.' })
    }
    throw await serverError('reductions.start.failed', error, { userId: user.id, firingId })
  }

  return data
})