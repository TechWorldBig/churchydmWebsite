import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { getSessionExpiry, sharedRateLimited } from './_lib/security.js'
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
const headerValue = (req: any, name: string) => {
  const value = req.headers[name]
  const text = String(Array.isArray(value) ? value[0] : value || '').trim()
  try { return decodeURIComponent(text).slice(0, 120) } catch { return text.slice(0, 120) }
}
const visitorLocation = (req: any) => ({
  country: headerValue(req, 'x-vercel-ip-country'),
  region: headerValue(req, 'x-vercel-ip-country-region'),
  city: headerValue(req, 'x-vercel-ip-city'),
  latitude: headerValue(req, 'x-vercel-ip-latitude'),
  longitude: headerValue(req, 'x-vercel-ip-longitude'),
  timezone: headerValue(req, 'x-vercel-ip-timezone'),
})
const deviceType = (req: any): 'mobile' | 'tablet' | 'desktop' | 'unknown' => {
  const agent = String(req.headers['user-agent'] || '').toLowerCase()
  if (!agent) return 'unknown'
  if (/bot|crawler|spider|preview/u.test(agent)) return 'unknown'
  if (/ipad|tablet|playbook|silk/u.test(agent) || (agent.includes('android') && !agent.includes('mobile'))) return 'tablet'
  if (/mobile|iphone|ipod|android|windows phone/u.test(agent)) return 'mobile'
  return 'desktop'
}

export default async function handler(req: any, res: any) {
  try {
    await ensureSchema()
    const sql = getSql()

    if (req.method === 'GET') {
      if (!await getSessionExpiry(req)) return res.status(401).json({ error: 'Unauthorized' })
      const requestedDate = validDate(req.query?.date) ? req.query.date : indiaHourParts().date
      const rows = await sql`SELECT RIGHT(hour_key, 2)::int AS hour, device_type AS device, COUNT(DISTINCT ip_hash)::int AS count FROM website_visitor_hours WHERE hour_key LIKE ${requestedDate + '-%'} GROUP BY hour, device_type ORDER BY hour`
      const dayVisitors = await sql`SELECT DISTINCT ON (ip_hash) ip_hash, device_type AS device FROM website_visitor_hours WHERE hour_key LIKE ${requestedDate + '-%'} ORDER BY ip_hash, created_at DESC`
      const locations = await sql`
        SELECT
          COALESCE(NULLIF(h.country, ''), i.country) AS country,
          COALESCE(NULLIF(h.region, ''), i.region) AS region,
          COALESCE(NULLIF(h.city, ''), i.city) AS city,
          COALESCE(NULLIF(h.latitude, ''), i.latitude) AS latitude,
          COALESCE(NULLIF(h.longitude, ''), i.longitude) AS longitude,
          COALESCE(NULLIF(h.timezone, ''), i.timezone) AS timezone,
          h.device_type AS device,
          h.created_at AS "lastSeenAt"
        FROM website_visitor_hours h
        JOIN website_visitor_ips i ON i.ip_hash = h.ip_hash
        ORDER BY h.created_at DESC
      `
      const counts = Array.from({ length: 24 }, (_, hour) => ({ hour, count: rows.filter(row => row.hour === hour).reduce((sum, row) => sum + Number(row.count), 0) }))
      const deviceCounts = ['mobile', 'tablet', 'desktop', 'unknown'].map(device => ({ device, count: dayVisitors.filter(row => row.device === device).length }))
      const hourly = counts.map(item => ({ ...item, devices: Object.fromEntries(['mobile', 'tablet', 'desktop', 'unknown'].map(device => [device, Number(rows.find(row => row.hour === item.hour && row.device === device)?.count || 0)])) }))
      const lifetime = await sql`SELECT COUNT(*)::int AS total FROM website_visitor_ips`
      return res.status(200).json({ date: requestedDate, hours: hourly, devices: deviceCounts, locations, dailyTotal: dayVisitors.length, total: lifetime[0].total })
    }

    if (req.method === 'POST') {
      const ip = getClientIp(req)
      if (!ip) return res.status(400).json({ error: 'Unable to determine visitor IP.' })
      if (await sharedRateLimited('visitors', ip, 30, 60)) {
        res.setHeader('Retry-After', '60')
        return res.status(429).json({ error: 'Too many visitor requests. Please try again later.' })
      }
      const ipHash = createHash('sha256').update(ip).digest('hex')
      const location = visitorLocation(req)
      await sql`INSERT INTO website_visitor_ips (ip_hash, country, region, city, latitude, longitude, timezone) VALUES (${ipHash}, ${location.country}, ${location.region}, ${location.city}, ${location.latitude}, ${location.longitude}, ${location.timezone}) ON CONFLICT (ip_hash) DO UPDATE SET country=COALESCE(NULLIF(EXCLUDED.country, ''), website_visitor_ips.country), region=COALESCE(NULLIF(EXCLUDED.region, ''), website_visitor_ips.region), city=COALESCE(NULLIF(EXCLUDED.city, ''), website_visitor_ips.city), latitude=COALESCE(NULLIF(EXCLUDED.latitude, ''), website_visitor_ips.latitude), longitude=COALESCE(NULLIF(EXCLUDED.longitude, ''), website_visitor_ips.longitude), timezone=COALESCE(NULLIF(EXCLUDED.timezone, ''), website_visitor_ips.timezone)`
      const current = indiaHourParts()
      const hourKey = `${current.date}-${String(current.hour).padStart(2, '0')}`
      // Preserve each hour's location snapshot, while allowing only one count
      // for the same public IP during that hour.
      await sql`INSERT INTO website_visitor_hours (hour_key, ip_hash, device_type, country, region, city, latitude, longitude, timezone) VALUES (${hourKey}, ${ipHash}, ${deviceType(req)}, ${location.country}, ${location.region}, ${location.city}, ${location.latitude}, ${location.longitude}, ${location.timezone}) ON CONFLICT (hour_key, ip_hash) DO UPDATE SET device_type=EXCLUDED.device_type, country=COALESCE(NULLIF(EXCLUDED.country, ''), website_visitor_hours.country), region=COALESCE(NULLIF(EXCLUDED.region, ''), website_visitor_hours.region), city=COALESCE(NULLIF(EXCLUDED.city, ''), website_visitor_hours.city), latitude=COALESCE(NULLIF(EXCLUDED.latitude, ''), website_visitor_hours.latitude), longitude=COALESCE(NULLIF(EXCLUDED.longitude, ''), website_visitor_hours.longitude), timezone=COALESCE(NULLIF(EXCLUDED.timezone, ''), website_visitor_hours.timezone), created_at=NOW()`
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    return sendError(res, error)
  }
}
