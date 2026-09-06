import { authorizeMutation } from './_lib/security.js'
import { readMutation } from './_lib/validation.js'
import { ensureMemberGenderColumn, ensureSchema, getSql, sendError } from './_lib/db.js'

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store, no-cache, must-revalidate')
  try {
    if (req.method !== 'GET' && !await authorizeMutation(req, res)) return
    const body = req.method === 'GET' ? null : readMutation(req, res, 'members')
    if (req.method !== 'GET' && !body) return
    if (req.method === 'GET') await ensureMemberGenderColumn()
    else await ensureSchema()
    const sql = getSql()
    const generatedPhotoName = body?.photoName || (body?.photo ? `${String(body.name || 'member').trim().replace(/[^a-z0-9]+/gi, '_')}_${new Date().toISOString().slice(0, 10)}.${String(body.photo).match(/^data:image\/([a-z0-9+.-]+)/i)?.[1] || 'jpg'}` : '')
    if (req.method === 'GET') {
      const rows = await sql`SELECT id, name, role, email, phone, address, gender, seniority, date_of_birth AS "dateOfBirth", focus, photo, photo_name AS "photoName" FROM members ORDER BY created_at DESC`
      return res.status(200).json(rows)
    }
    if (req.method === 'POST') {
      await sql`INSERT INTO members (id, name, role, email, phone, address, gender, seniority, date_of_birth, focus, photo, photo_name) VALUES (${body.id}, ${body.name}, ${body.role || 'YDM Member'}, ${body.email || ''}, ${body.phone || ''}, ${body.address || ''}, ${body.gender || ''}, ${body.seniority || ''}, ${body.dateOfBirth || ''}, ${body.focus || ''}, ${body.photo || ''}, ${generatedPhotoName})`
    } else if (req.method === 'PUT') {
      await sql`UPDATE members SET name=${body.name}, role=${body.role || 'YDM Member'}, email=${body.email || ''}, phone=${body.phone || ''}, address=${body.address || ''}, gender=${body.gender || ''}, seniority=${body.seniority || ''}, date_of_birth=${body.dateOfBirth || ''}, focus=${body.focus || ''}, photo=${body.photo || ''}, photo_name=${generatedPhotoName} WHERE id=${body.id}`
    } else if (req.method === 'DELETE') {
      await sql`DELETE FROM members WHERE id=${body.id}`
    } else return res.status(405).json({ error: 'Method not allowed' })
    await sql`INSERT INTO system_metadata (key, value) VALUES ('last_updated', ${new Date().toISOString()}) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`
    return res.status(200).json({ ok: true })
  } catch (error) { return sendError(res, error) }
}
