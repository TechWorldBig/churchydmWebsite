import { authorizeMutation } from './_lib/security.js'
import { readMutation } from './_lib/validation.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { writeAuditLog } from './_lib/audit.js'

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', req.method === 'GET' ? 'public, max-age=30, stale-while-revalidate=120' : 'no-store')
  try {
    if (req.method !== 'GET' && !await authorizeMutation(req, res)) return
    const body = req.method === 'GET' ? null : readMutation(req, res, 'gallery')
    if (req.method !== 'GET' && !body) return
    if (req.method !== 'GET') await ensureSchema()
    const sql = getSql()
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, photo, date, description FROM gallery_photos ORDER BY date DESC, created_at DESC`
      return res.status(200).json(rows)
    }
    if (req.method === 'POST') {
      await sql`INSERT INTO gallery_photos (id, photo, date, description) VALUES (${body.id}, ${body.photo}, ${body.date}, ${body.description || ''})`
      await writeAuditLog(req, { action: 'create', entity: 'gallery_photo', entityId: body.id, summary: body.date })
    } else if (req.method === 'PUT') {
      await sql`UPDATE gallery_photos SET photo=${body.photo}, date=${body.date}, description=${body.description || ''} WHERE id=${body.id}`
      await writeAuditLog(req, { action: 'update', entity: 'gallery_photo', entityId: body.id, summary: body.date })
    } else if (req.method === 'DELETE') {
      await sql`DELETE FROM gallery_photos WHERE id=${body.id}`
      await writeAuditLog(req, { action: 'delete', entity: 'gallery_photo', entityId: body.id })
    } else return res.status(405).json({ error: 'Method not allowed' })
    return res.status(200).json({ ok: true })
  } catch (error) { return sendError(res, error) }
}
