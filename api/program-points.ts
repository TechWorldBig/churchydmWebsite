import { authorizeMutation, getSessionExpiry } from './_lib/security.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'

export default async function handler(req: any, res: any) {
  try {
    await ensureSchema()
    const sql = getSql()
    if (req.method === 'GET') {
      const query = req.query || {}
      if (!query.name) { if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Please sign in as an administrator.' }); const rows = await sql`SELECT id, member_id AS "memberId", name, program, seniority, date, questions_answered AS "questionsAnswered" FROM program_points ORDER BY date DESC, created_at DESC`; return res.status(200).json(rows) }
      const rows = await sql`SELECT DISTINCT ON (member_id, program, date) id, member_id AS "memberId", name, program, seniority, date, questions_answered AS "questionsAnswered" FROM program_points WHERE LOWER(TRIM(name)) LIKE LOWER('%' || TRIM(${query.name}) || '%') AND (${query.program || ''} = '' OR TRIM(program) = TRIM(${query.program || ''})) AND (${query.from || ''} = '' OR date >= ${query.from || ''}) AND (${query.to || ''} = '' OR date <= ${query.to || ''}) ORDER BY member_id, program, date, created_at DESC`
      return res.status(200).json(rows)
    }
    if (req.method !== 'POST' || !await authorizeMutation(req, res)) return
    const body = req.body || {}
    if (!body.id || !body.memberId || !body.name || !body.program || !['', 'Junior', 'Senior'].includes(body.seniority) || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !Number.isInteger(body.questionsAnswered) || body.questionsAnswered < 0 || body.questionsAnswered > 5) return res.status(400).json({ error: 'Invalid program point data' })
    const existing = await sql`SELECT id FROM program_points WHERE member_id=${body.memberId} AND program=${body.program} AND date=${body.date} ORDER BY created_at DESC LIMIT 1`
    const id = existing[0]?.id || body.id
    if (existing[0]) await sql`UPDATE program_points SET name=${body.name}, seniority=${body.seniority}, questions_answered=${body.questionsAnswered}, score=${body.questionsAnswered} WHERE id=${id}`
    else await sql`INSERT INTO program_points (id, member_id, name, program, seniority, date, questions_answered, score) VALUES (${id}, ${body.memberId}, ${body.name}, ${body.program}, ${body.seniority}, ${body.date}, ${body.questionsAnswered}, ${body.questionsAnswered})`
    return res.status(200).json({ ok: true, id })
  } catch (error) { return sendError(res, error) }
}
