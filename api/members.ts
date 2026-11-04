import { authorizeMutation, endpointRateLimited, getSessionExpiry } from './_lib/security.js'
import { readMutation } from './_lib/validation.js'
import { ensureMemberGenderColumn, ensureSchema, getSql, sendError } from './_lib/db.js'
import { writeAuditLog } from './_lib/audit.js'

const indiaYear = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date())
const validYear = (value: unknown) => typeof value === 'string' && /^\d{4}$/u.test(value)
const isPublicAttendanceYear = (year: string, currentYear: string) => year === String(Number(currentYear) - 1)
const normalizedName = (value: unknown) => typeof value === 'string' ? value.trim().toLocaleLowerCase('en-US') : ''

export const renameArchivePayload = (payload: any, memberId: string, oldName: string, newName: string, seniority: string) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { payload, changed: false }
  let changed = false
  const belongsToMember = (item: any, nameKey = 'name') => item && typeof item === 'object'
    && (item.memberId === memberId || item.id === memberId || normalizedName(item[nameKey]) === oldName)
  const rename = (items: unknown, nameKey = 'name', includeSeniority = false) => Array.isArray(items) ? items.map(item => {
    if (!belongsToMember(item, nameKey)) return item
    changed = true
    return { ...item, [nameKey]: newName, ...(includeSeniority ? { seniority } : {}) }
  }) : items
  const renamedPayload = {
    ...payload,
    members: rename(payload.members, 'name', true),
    attendance: rename(payload.attendance),
    points: rename(payload.points, 'name', true),
    weekly: rename(payload.weekly, 'memberName'),
  }
  return { changed, payload: renamedPayload }
}

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
      if (await endpointRateLimited(req, res, 'members')) return
      const query = req.query || {}
      const archiveYear = typeof query.archiveYear === 'string' ? query.archiveYear : ''
      const allYears = query.allYears === '1'
      const currentYear = indiaYear()
      if (archiveYear && !validYear(archiveYear)) return res.status(400).json({ error: 'Invalid archive year.' })
      if (!await getSessionExpiry(req)) {
        if (allYears || (archiveYear && !isPublicAttendanceYear(archiveYear, currentYear))) return res.status(401).json({ error: 'Please sign in as an administrator.' })
        const rows = await sql`SELECT id, name, role, gender, photo FROM members WHERE active_year=${archiveYear || currentYear} ORDER BY created_at DESC`
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
      const existing = await sql`SELECT name FROM members WHERE id=${body.id} AND active_year=${indiaYear()} LIMIT 1`
      if (!existing[0]) return res.status(404).json({ error: 'Member was not found.' })
      const oldName = normalizedName(existing[0].name)
      await sql`UPDATE members SET name=${body.name}, role=${body.role || 'YDM Member'}, email=${body.email || ''}, phone=${body.phone || ''}, address=${body.address || ''}, gender=${body.gender || ''}, seniority=${body.seniority || ''}, date_of_birth=${body.dateOfBirth || ''}, focus=${body.focus || ''}, photo=${body.photo || ''}, photo_name=${generatedPhotoName} WHERE id=${body.id} AND active_year=${indiaYear()}`
      // Member IDs are authoritative. The old-name fallback repairs historical
      // rows created before IDs were synchronized across every feature.
      await sql`UPDATE attendance SET name=${body.name} WHERE member_id=${body.id} OR LOWER(TRIM(name))=${oldName}`
      await sql`UPDATE program_points SET name=${body.name}, seniority=${body.seniority || ''} WHERE member_id=${body.id} OR LOWER(TRIM(name))=${oldName}`
      await sql`UPDATE weekly_programs SET member_name=${body.name} WHERE member_id=${body.id} OR LOWER(TRIM(member_name))=${oldName}`
      const archives = await sql`SELECT year, payload FROM yeararchive`
      for (const archive of archives) {
        const renamed = renameArchivePayload(archive.payload, body.id, oldName, body.name, body.seniority || '')
        if (renamed.changed) await sql`UPDATE yeararchive SET payload=${JSON.stringify(renamed.payload)}::jsonb WHERE year=${archive.year}`
      }
      await writeAuditLog(req, { action: 'update', entity: 'member', entityId: body.id, summary: body.name })
    } else if (req.method === 'DELETE') {
      await sql`DELETE FROM members WHERE id=${body.id} AND active_year=${indiaYear()}`
      await writeAuditLog(req, { action: 'delete', entity: 'member', entityId: body.id })
    } else return res.status(405).json({ error: 'Method not allowed' })
    await sql`INSERT INTO system_metadata (key, value) VALUES ('last_updated', ${new Date().toISOString()}) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`
    return res.status(200).json({ ok: true })
  } catch (error) { return sendError(res, error) }
}
