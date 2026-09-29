// server/api/board/index.get.js
export default defineEventHandler(async (event) => {
  const { data, error } = await boardClient()
    .from('board_messages')
    .select('group_id, message, word_count, started_at, updated_at')
    .order('group_id', { ascending: true })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')
  return data
})