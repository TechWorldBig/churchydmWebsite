import { authorizeMutation, getSessionExpiry } from './_lib/security.js'
import { readMutation } from './_lib/validation.js'
import { ensureMemberGenderColumn, ensureSchema, getSql, sendError } from './_lib/db.js'
import { writeAuditLog } from './_lib/audit.js'

const indiaYear = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date())
const validYear = (value: unknown) => typeof value === 'string' && /^\d{4}$/u.test(value)

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
      const query = req.query || {}
      const archiveYear = typeof query.archiveYear === 'string' ? query.archiveYear : ''
      const allYears = query.allYears === '1'
      const currentYear = indiaYear()
      if (archiveYear && !validYear(archiveYear)) return res.status(400).json({ error: 'Invalid archive year.' })
      if (!await getSessionExpiry(req)) {
        if (archiveYear || allYears) return res.status(401).json({ error: 'Please sign in as an administrator.' })
        const rows = await sql`SELECT id, name, role, gender, photo FROM members WHERE active_year=${currentYear} ORDER BY created_at DESC`
        return res.status(200).json(rows)
      }
      const rows = allYears
        ? await sql`SELECT id, name, role, email, phone, address, gender, seniority, date_of_birth AS "dateOfBirth", focus, photo, photo_name AS "photoName", active_year AS "activeYear" FROM members ORDER BY active_year DESC, created_at DESC`
        : await sql`SELECT id, name, role, email, phone, address, gender, seniority, date_of_birth AS "dateOfBirth", focus, photo, photo_name AS "photoName", active_year AS "activeYear" FROM members WHERE active_year=${archiveYear || currentYear} ORDER BY created_at DESC`
      return res.status(200).json(rows)
    }
    if (req.method === 'POST') {
      await sql`INSERT INTO members (id, name, role, email, phone, address, gender, seniority, date_of_birth, focus, photo, photo_name, active_year) VALUES (${body.id}, ${body.name}, ${body.role || 'YDM Member'}, ${body.email || ''}, ${body.phone || ''}, ${body.address || ''}, ${body.gender || ''}, ${body.seniority || ''}, ${body.dateOfBirth || ''}, ${body.focus || ''}, ${body.photo || ''}, ${generatedPhotoName}, ${indiaYear()})`
      await writeAuditLog(req, { action: 'create', entity: 'member', entityId: body.id, summary: body.name })
    } else if (req.method === 'PUT') {
      await sql`UPDATE members SET name=${body.name}, role=${body.role || 'YDM Member'}, email=${body.email || ''}, phone=${body.phone || ''}, address=${body.address || ''}, gender=${body.gender || ''}, seniority=${body.seniority || ''}, date_of_birth=${body.dateOfBirth || ''}, focus=${body.focus || ''}, photo=${body.photo || ''}, photo_name=${generatedPhotoName} WHERE id=${body.id} AND active_year=${indiaYear()}`
      await writeAuditLog(req, { action: 'update', entity: 'member', entityId: body.id, summary: body.name })
    } else if (req.method === 'DELETE') {
      await sql`DELETE FROM members WHERE id=${body.id} AND active_year=${indiaYear()}`
      await writeAuditLog(req, { action: 'delete', entity: 'member', entityId: body.id })
    } else return res.status(405).json({ error: 'Method not allowed' })
    await sql`INSERT INTO system_metadata (key, value) VALUES ('last_updated', ${new Date().toISOString()}) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`
    return res.status(200).json({ ok: true })
  } catch (error) { return sendError(res, error) }
}
