import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { getSessionExpiry } from './_lib/security.js'
import { createHash } from 'node:crypto'

const getClientIp = (req: any) => {
  const forwarded = req.headers['x-forwarded-for']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
  return (value || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').trim()
}
const indiaHourParts = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date())
  const value = (type: string) => parts.find(part => part.type === type)?.value || ''
  return { date: `${value('year')}-${value('month')}-${value('day')}`, hour: Number(value('hour')) }
}
const validDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value)

export default async function handler(req: any, res: any) {
  try {
    await ensureSchema()
    const sql = getSql()

    if (req.method === 'GET') {
      if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Unauthorized' })
      const requestedDate = validDate(req.query?.date) ? req.query.date : indiaHourParts().date
      const rows = await sql`SELECT RIGHT(hour_key, 2)::int AS hour, COUNT(*)::int AS count FROM website_visitor_hours WHERE hour_key LIKE ${requestedDate + '-%'} GROUP BY hour ORDER BY hour`
      const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: Number(rows.find(row => row.hour === hour)?.count || 0) }))
      const lifetime = await sql`SELECT COUNT(*)::int AS total FROM website_visitor_ips`
      return res.status(200).json({ date: requestedDate, hours: counts, dailyTotal: counts.reduce((sum, item) => sum + item.count, 0), total: lifetime[0].total })
    }

    if (req.method === 'POST') {
      const ip = getClientIp(req)
      if (!ip) return res.status(400).json({ error: 'Unable to determine visitor IP.' })
      const ipHash = createHash('sha256').update(ip).digest('hex')
      await sql`INSERT INTO website_visitor_ips (ip_hash) VALUES (${ipHash}) ON CONFLICT (ip_hash) DO NOTHING`
      const current = indiaHourParts()
      const hourKey = `${current.date}-${String(current.hour).padStart(2, '0')}`
      await sql`INSERT INTO website_visitor_hours (hour_key, ip_hash) VALUES (${hourKey}, ${ipHash}) ON CONFLICT (hour_key, ip_hash) DO NOTHING`
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    return sendError(res, error)
  }
}
