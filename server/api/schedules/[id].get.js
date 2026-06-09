// server/api/schedules/[id].get.js
// Returns a single schedule with points. RLS allows built-ins (user_id NULL)
// and the user's own; anything else 404s via the empty result.
export default defineEventHandler(async (event) => {
  const { db, user } = await useServerUser(event)
  const id = Number(getRouterParam(event, 'id'))
  if (isNaN(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const { data, error } = await db
    .from('schedule_library')
    .select('*, points:schedule_library_points(*)')
    .eq('id', id)
    .single()

  if (error || !data) throw createError({ statusCode: 404, statusMessage: 'Schedule not found' })

  data.points = (data.points ?? []).sort((a, b) => a.offset_minutes - b.offset_minutes)
  return data
})