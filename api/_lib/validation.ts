const text = (value: unknown, limit: number, required = false): boolean => typeof value === 'string' && value.length <= limit && (!required || Boolean(value.trim()))
const date = (value: unknown): boolean => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
const imageData = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/u
const blobPhoto = (value: unknown): boolean => typeof value === 'string' && /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/iu.test(value)

const validImageSignature = (type: string, bytes: Buffer) => {
  if (type === 'png') return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (type === 'jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (type === 'gif') return bytes.length >= 6 && (bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a')
  return bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP'
}

export const parseImageData = (value: unknown): { type: 'png' | 'jpeg' | 'webp' | 'gif'; bytes: Buffer } | null => {
  if (typeof value !== 'string' || value.length > 2_800_000) return null
  const match = value.match(imageData)
  if (!match) return null
  const bytes = Buffer.from(match[2], 'base64')
  const type = match[1] as 'png' | 'jpeg' | 'webp' | 'gif'
  return bytes.length && bytes.length <= 2_000_000 && validImageSignature(type, bytes) ? { type, bytes } : null
}

const photo = (value: unknown): boolean => value === '' || Boolean(parseImageData(value))

export function readMutation(req: any, res: any, kind: 'members' | 'attendance' | 'gallery'): any | null {
  try {
    const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
    if (Buffer.byteLength(raw) > 3_000_000) { res.status(413).json({ error: 'Request too large.' }); return null }
    const body = JSON.parse(raw)
    if (!body || Array.isArray(body) || !text(body.id, 100, true)) throw new Error()
    if (req.method !== 'DELETE') {
      if (kind === 'members') {
        if (!text(body.name, 100, true) || !['role', 'email', 'phone', 'address', 'focus'].every(key => body[key] === undefined || text(body[key], key === 'focus' ? 2000 : 300)) || (body.photoName !== undefined && !text(body.photoName, 255)) || (body.gender !== undefined && !['', 'Male', 'Female'].includes(body.gender)) || (body.seniority !== undefined && !['', 'Kutties', 'Junior', 'Senior'].includes(body.seniority)) || (body.dateOfBirth && !date(body.dateOfBirth)) || !photo(body.photo || '')) throw new Error()
      } else if (kind === 'attendance') {
        if (typeof body.present !== 'boolean' || (body.note !== undefined && !text(body.note, 2000))) throw new Error()
        if (req.method === 'POST' && (!text(body.memberId, 100, true) || !text(body.name, 100, true) || !date(body.date))) throw new Error()
      } else if ((!photo(body.photo) && !blobPhoto(body.photo)) || !body.photo || !date(body.date) || (body.description !== undefined && !text(body.description, 2000))) throw new Error()
    }
    return body
  } catch {
    res.status(400).json({ error: 'Invalid request fields.' })
    return null
  }
}
