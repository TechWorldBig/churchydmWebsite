import { authorizeMutation, getSessionExpiry } from './_lib/security.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'

const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value))
const validText = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const indiaDate = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const value = (type: string) => parts.find(part => part.type === type)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export default async function handler(req: any, res: any) {
  try {
    await ensureSchema()
    const sql = getSql()
    if (req.method === 'GET') {
      const today = indiaDate()
      await sql`UPDATE weekly_programs SET archived_at=COALESCE(archived_at, NOW()) WHERE date < ${today}`
      const includeArchived = req.query?.includeArchived === '1'
      if (includeArchived && !await getSessionExpiry(req)) return res.status(401).json({ error: 'Please sign in as an administrator.' })
      const rows = includeArchived
        ? await sql`SELECT id, date, serial_no AS "serialNo", program_name AS "programName", member_id AS "memberId", member_name AS "memberName", archived_at AS "archivedAt" FROM weekly_programs ORDER BY date DESC, serial_no ASC`
        : await sql`SELECT id, date, serial_no AS "serialNo", program_name AS "programName", member_id AS "memberId", member_name AS "memberName" FROM weekly_programs WHERE date >= ${today} AND archived_at IS NULL ORDER BY date ASC, serial_no ASC`
      return res.status(200).json(rows)
    }
    if (!await authorizeMutation(req, res)) return
    const body = req.body || {}
    if (req.method === 'DELETE') {
      if (!validText(body.id, 100)) return res.status(400).json({ error: 'Invalid weekly program id.' })
      await sql`DELETE FROM weekly_programs WHERE id=${body.id}`
      return res.status(200).json({ ok: true })
    }
    if (req.method !== 'POST' || !validText(body.id, 100) || !validDate(body.date) || !Number.isInteger(body.serialNo) || body.serialNo < 1 || body.serialNo > 15 || !validText(body.programName, 200) || !validText(body.memberId, 100) || !validText(body.memberName, 100)) return res.status(400).json({ error: 'Invalid weekly program data.' })
    const count = await sql`SELECT COUNT(*)::int AS count FROM weekly_programs WHERE date=${body.date}`
    if (count[0].count >= 15) return res.status(409).json({ error: 'A date can contain a maximum of 15 weekly programs.' })
    const existing = await sql`SELECT id FROM weekly_programs WHERE date=${body.date} AND serial_no=${body.serialNo} LIMIT 1`
    if (existing[0]) return res.status(409).json({ error: 'That serial number already exists for this date.' })
    await sql`INSERT INTO weekly_programs (id, date, serial_no, program_name, member_id, member_name) VALUES (${body.id}, ${body.date}, ${body.serialNo}, ${body.programName.trim()}, ${body.memberId}, ${body.memberName.trim()})`
    return res.status(200).json({ ok: true, id: body.id })
  } catch (error) { return sendError(res, error) }
}
