import { authorizeMutation } from './_lib/security.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'

export default async function handler(req: any, res: any) {
  try {
    await ensureSchema()
    const sql = getSql()
    if (req.method === 'GET') {
      const query = req.query || {}
      if (!query.name) { if (!await authorizeMutation(req, res)) return; const rows = await sql`SELECT id, member_id AS "memberId", name, program, date, score FROM program_points ORDER BY date DESC, created_at DESC`; return res.status(200).json(rows) }
      const rows = await sql`SELECT id, member_id AS "memberId", name, program, date, score FROM program_points WHERE LOWER(name) = LOWER(${query.name}) AND (${query.program || ''} = '' OR program = ${query.program || ''}) AND (${query.from || ''} = '' OR date >= ${query.from || ''}) AND (${query.to || ''} = '' OR date <= ${query.to || ''}) ORDER BY date DESC, created_at DESC`
      return res.status(200).json(rows)
    }
    if (req.method !== 'POST' || !await authorizeMutation(req, res)) return
    const body = req.body || {}
    if (!body.id || !body.memberId || !body.name || !body.program || !/^\d{4}-\d{2}-\d{2}$/.test(body.date) || !Number.isInteger(body.score) || body.score < 0 || body.score > 5) return res.status(400).json({ error: 'Invalid program point data' })
    await sql`INSERT INTO program_points (id, member_id, name, program, date, score) VALUES (${body.id}, ${body.memberId}, ${body.name}, ${body.program}, ${body.date}, ${body.score}) ON CONFLICT (id) DO UPDATE SET score=EXCLUDED.score, program=EXCLUDED.program, date=EXCLUDED.date`
    return res.status(200).json({ ok: true })
  } catch (error) { return sendError(res, error) }
}
