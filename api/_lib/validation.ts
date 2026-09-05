const text = (value: unknown, limit: number, required = false): boolean => typeof value === 'string' && value.length <= limit && (!required || Boolean(value.trim()))
const date = (value: unknown): boolean => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
const photo = (value: unknown): boolean => value === '' || (text(value, 2_800_000) && /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+={0,2}$/u.test(value as string))

export function readMutation(req: any, res: any, kind: 'members' | 'attendance' | 'gallery'): any | null {
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (Buffer.byteLength(raw) > 3_000_000) { res.status(413).json({ error: 'Request too large.' }); return null }
    const body = JSON.parse(raw)
    if (!body || Array.isArray(body) || !text(body.id, 100, true)) throw new Error()
    if (req.method !== 'DELETE') {
      if (kind === 'members') {
        if (!text(body.name, 100, true) || !['role', 'email', 'phone', 'address', 'focus'].every(key => body[key] === undefined || text(body[key], key === 'focus' ? 2000 : 300)) || (body.gender !== undefined && !['', 'Male', 'Female', 'Other', 'Prefer not to say'].includes(body.gender)) || (body.dateOfBirth && !date(body.dateOfBirth)) || !photo(body.photo || '')) throw new Error()
      } else if (kind === 'attendance') {
        if (typeof body.present !== 'boolean' || (body.note !== undefined && !text(body.note, 2000))) throw new Error()
        if (req.method === 'POST' && (!text(body.memberId, 100, true) || !text(body.name, 100, true) || !date(body.date))) throw new Error()
      } else if (!photo(body.photo) || !body.photo || !date(body.date) || (body.description !== undefined && !text(body.description, 2000))) throw new Error()
    }
    return body
  } catch {
    res.status(400).json({ error: 'Invalid request fields.' })
    return null
  }
}
