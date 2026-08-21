// server/api/demo-firing/index.post.js
//
// POST /api/demo-firing - seed a demo firing in the CALLER's own account.
// Body: { presetId, name?, leadMinutes? }
//
// The user id comes from the SESSION, never the body. An earlier version of
// this file was a copy of an admin route that required a userId in the body,
// which is why the empty-state card got "Invalid user id" on every attempt.
// A request that can name whose account it writes to is an admin route; this
// is not one.
//
// A demo is real data in real tables, deliberately: every screen then behaves
// exactly as it will for a real firing, which is the point of it as an
// orientation tool. firings.is_demo is what makes it safely deletable later.
//
// ONE DEMO, ONE ACTIVE FIRING. A demo occupies the single active slot, so this
// refuses when anything is already running. That is not a limitation to work
// around; ending or deleting before starting something else is the behaviour
// we want people to learn.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const body = await readBody(event) ?? {}

  const presetId = Number(body.presetId)
  if (!Number.isInteger(presetId)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a schedule for the demo' })
  }

  const lead = body.leadMinutes === undefined
    ? DEMO_LEAD_MINUTES_DEFAULT
    : Number(body.leadMinutes)
  if (!Number.isFinite(lead) || lead < DEMO_LEAD_MINUTES_MIN || lead > DEMO_LEAD_MINUTES_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: `Lead time must be between ${DEMO_LEAD_MINUTES_MIN} and ${DEMO_LEAD_MINUTES_MAX} minutes`,
    })
  }

  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : ''

  const { data: existing } = await db
    .from('firings')
    .select('id, name, is_demo')
    .eq('user_id', user.id)
    .is('ended_at', null)
    .not('started_at', 'is', null)
    .limit(1)

  if (existing?.length) {
    throw createError({
      statusCode: 409,
      statusMessage: existing[0].is_demo
        ? 'You already have a demo firing running. Delete it first.'
        : `"${existing[0].name}" is still active — end it before starting a demo.`,
    })
  }

  const result = await seedDemoFiring(db, {
    userId:      user.id,
    presetId,
    name:        name || 'Demo firing',
    leadMinutes: lead,
    isDemo:      true,
  })

  await logger.tracked('info', 'demo.firing_seeded', {
    userId:   user.id,
    firingId: result.firing.id,
    preset:   result.preset,
    elapsed:  result.elapsedMinutes,
  })

  return result
})