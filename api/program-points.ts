import { authorizeMutation, getSessionExpiry } from './_lib/security.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'

const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
const currentYearDate = (value: unknown) => validDate(value) && (value as string).slice(0, 4) === String(new Date().getFullYear())
const queryText = (value: unknown) => typeof value === 'string' ? value.trim() : ''
const allowedPrograms = new Set(['Bible Reference', 'Bible Quiz', 'Song Survey'])
const currentDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())

export default async function handler(req: any, res: any) {
  try {
    await ensureSchema()
    const sql = getSql()
    if (req.method === 'GET') {
      const query = req.query || {}
      if (!query.name) { if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Please sign in as an administrator.' }); const rows = await sql`SELECT DISTINCT ON (member_id, program, date) id, member_id AS "memberId", name, program, seniority, date, questions_answered AS "questionsAnswered" FROM program_points ORDER BY member_id, program, date, created_at ASC, id ASC`; return res.status(200).json(rows) }
      const name = queryText(query.name)
      const selectedProgram = queryText(query.program)
      const from = queryText(query.from)
      const to = queryText(query.to)
      if (!name || name.length > 100 || (selectedProgram && !allowedPrograms.has(selectedProgram)) || (from && !currentYearDate(from)) || (to && !currentYearDate(to)) || (from && to && to < from)) return res.status(400).json({ error: 'Invalid program points search range.' })
      const throughDate = to || currentDate()
      const rows = await sql`SELECT DISTINCT ON (member_id, program, date) id, member_id AS "memberId", name, program, seniority, date, questions_answered AS "questionsAnswered" FROM program_points WHERE LOWER(TRIM(name)) = LOWER(TRIM(${name})) AND (${selectedProgram} = '' OR TRIM(program) = TRIM(${selectedProgram})) AND (${from} = '' OR date >= ${from}) AND date <= ${throughDate} ORDER BY member_id, program, date, created_at DESC`
      return res.status(200).json(rows)
    }
    if (!['POST', 'PUT', 'DELETE'].includes(req.method) || !await authorizeMutation(req, res)) return
    const body = req.body || {}
    if (req.method === 'DELETE') {
      if (typeof body.id !== 'string' || !body.id.trim()) return res.status(400).json({ error: 'A program point id is required.' })
      const deleted = await sql`DELETE FROM program_points WHERE id=${body.id} RETURNING id`
      if (!deleted[0]) return res.status(404).json({ error: 'Program point was not found.' })
      return res.status(200).json({ ok: true })
    }
    if (typeof body.id !== 'string' || !body.id.trim() || typeof body.memberId !== 'string' || !body.memberId.trim() || typeof body.name !== 'string' || !body.name.trim() || !allowedPrograms.has(body.program) || !['', 'Junior', 'Senior'].includes(body.seniority) || !currentYearDate(body.date) || !Number.isInteger(body.questionsAnswered) || body.questionsAnswered < 0 || body.questionsAnswered > 5) return res.status(400).json({ error: 'Invalid program point data' })
    if (req.method === 'PUT') {
      const duplicate = await sql`SELECT id FROM program_points WHERE member_id=${body.memberId} AND program=${body.program} AND date=${body.date} AND id<>${body.id} LIMIT 1`
      if (duplicate[0]) return res.status(409).json({ error: 'A program point already exists for this member, program, and date.' })
      const updated = await sql`UPDATE program_points SET member_id=${body.memberId}, name=${body.name.trim()}, program=${body.program}, seniority=${body.seniority}, date=${body.date}, questions_answered=${body.questionsAnswered}, score=${body.questionsAnswered} WHERE id=${body.id} RETURNING id`
      if (!updated[0]) return res.status(404).json({ error: 'Program point was not found.' })
      return res.status(200).json({ ok: true, id: body.id })
    }
    const existing = await sql`SELECT id FROM program_points WHERE member_id=${body.memberId} AND program=${body.program} AND date=${body.date} ORDER BY created_at DESC LIMIT 1`
    const id = existing[0]?.id || body.id
    if (existing[0]) await sql`UPDATE program_points SET name=${body.name}, seniority=${body.seniority}, questions_answered=${body.questionsAnswered}, score=${body.questionsAnswered} WHERE id=${id}`
    else await sql`INSERT INTO program_points (id, member_id, name, program, seniority, date, questions_answered, score) VALUES (${id}, ${body.memberId}, ${body.name}, ${body.program}, ${body.seniority}, ${body.date}, ${body.questionsAnswered}, ${body.questionsAnswered})`
    return res.status(200).json({ ok: true, id })
  } catch (error) { return sendError(res, error) }
}
