import { authorizeMutation, endpointRateLimited, getSessionExpiry } from './_lib/security.js'
import { readMutation } from './_lib/validation.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { writeAuditLog } from './_lib/audit.js'

const indiaYear = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(new Date())
const validYear = (value: unknown) => typeof value === 'string' && /^\d{4}$/u.test(value)
const isCurrentYearDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && value.slice(0, 4) === indiaYear()
const isPublicAttendanceYear = (year: string) => year === indiaYear() || year === String(Number(indiaYear()) - 1)

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store, no-cache, must-revalidate')
  try {
    if (req.method !== 'GET' && !await authorizeMutation(req, res)) return
    const body = req.method === 'GET' ? null : readMutation(req, res, 'attendance')
    if (req.method !== 'GET' && !body) return
    if (req.method !== 'GET') await ensureSchema()
    const sql = getSql()
    if (req.method === 'GET') {
      if (await endpointRateLimited(req, res, 'attendance')) return
      const query = req.query || {}
      const allYears = query.allYears === '1'
      const requestedYear = typeof query.year === 'string' ? query.year : indiaYear()
      if (!validYear(requestedYear)) return res.status(400).json({ error: 'Invalid attendance year.' })
      // Visitors can review the immediately completed year; deeper history is
      // kept in the protected admin archive.
      if ((allYears || !isPublicAttendanceYear(requestedYear)) && !await getSessionExpiry(req)) return res.status(401).json({ error: 'Please sign in as an administrator.' })
      const rows = allYears
        ? await sql`SELECT attendance.id, attendance.member_id AS "memberId", COALESCE(members.name, attendance.name) AS name, attendance.date, attendance.present, attendance.note FROM attendance LEFT JOIN members ON members.id=attendance.member_id ORDER BY attendance.date DESC, attendance.created_at DESC`
        : await sql`SELECT attendance.id, attendance.member_id AS "memberId", COALESCE(members.name, attendance.name) AS name, attendance.date, attendance.present, attendance.note FROM attendance LEFT JOIN members ON members.id=attendance.member_id WHERE attendance.date >= ${`${requestedYear}-01-01`} AND attendance.date <= ${`${requestedYear}-12-31`} ORDER BY attendance.date DESC, attendance.created_at DESC`
      return res.status(200).json(rows)
    }
    if (req.method !== 'DELETE' && !isCurrentYearDate(body.date)) return res.status(400).json({ error: 'Attendance can only be saved for the current ministry year.' })
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
    // This timestamp belongs to attendance only. Other admin activity must not
    // change the time shown on the public Attendance page.
    await sql`INSERT INTO system_metadata (key, value) VALUES ('attendance_last_updated', ${new Date().toISOString()}) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`
    return res.status(200).json({ ok: true })
  } catch (error) { return sendError(res, error) }
}
