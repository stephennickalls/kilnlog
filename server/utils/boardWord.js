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

  const { data, error } = await boardClient(event)
    .rpc('add_board_word', { p_group_id: groupId, p_word: word })

  if (error) throw await serverError('board.add_word_failed', error, { groupId, word })

  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex, nofollow')

  return data
}