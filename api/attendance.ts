import { authorizeMutation } from './_lib/security.js'
import { readMutation } from './_lib/validation.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { writeAuditLog } from './_lib/audit.js'

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store, no-cache, must-revalidate')
  try {
    if (req.method !== 'GET' && !await authorizeMutation(req, res)) return
    const body = req.method === 'GET' ? null : readMutation(req, res, 'attendance')
    if (req.method !== 'GET' && !body) return
    if (req.method !== 'GET') await ensureSchema()
    const sql = getSql()
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, member_id AS "memberId", name, date, present, note FROM attendance ORDER BY date DESC, created_at DESC`
      return res.status(200).json(rows)
    }
    if (req.method === 'POST') {
      await sql`INSERT INTO attendance (id, member_id, name, date, present, note) VALUES (${body.id}, ${body.memberId}, ${body.name}, ${body.date}, ${body.present}, ${body.note || ''}) ON CONFLICT (member_id, date) DO UPDATE SET name=EXCLUDED.name, present=EXCLUDED.present, note=EXCLUDED.note`
      await writeAuditLog(req, { action: 'save', entity: 'attendance', entityId: body.id, summary: `${body.name} · ${body.date}` })
    } else if (req.method === 'PUT') {
      await sql`UPDATE attendance SET present=${body.present}, note=${body.note || ''} WHERE id=${body.id}`
      await writeAuditLog(req, { action: 'update', entity: 'attendance', entityId: body.id })
    } else if (req.method === 'DELETE') {
      await sql`DELETE FROM attendance WHERE id=${body.id}`
      await writeAuditLog(req, { action: 'delete', entity: 'attendance', entityId: body.id })
    } else return res.status(405).json({ error: 'Method not allowed' })
    await sql`INSERT INTO system_metadata (key, value) VALUES ('last_updated', ${new Date().toISOString()}) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`
    return res.status(200).json({ ok: true })
  } catch (error) { return sendError(res, error) }
}
