// server/utils/boardWord.js
export async function addBoardWord(event, word) {
  const method = getMethod(event)
  if (method !== 'GET' && method !== 'POST') {
    throw createError({ statusCode: 405, statusMessage: 'Use GET or POST' })
  }

  const query = getQuery(event)
  let body = {}
  if (method === 'POST') {
    body = await readBody(event).catch(() => ({})) || {}
  }

  const groupId = Number(query.id ?? body.id)

  if (!Number.isInteger(groupId) || groupId < 1) {
    throw createError({ statusCode: 400, statusMessage: 'id must be a positive whole number, e.g. ?id=1' })
  }

  const { data, error } = await boardClient()
    .from('board_words')
    .insert({ group_id: groupId, word })
    .select('id, group_id, word, created_at')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }

  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')

  return data
}