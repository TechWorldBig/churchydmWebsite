import { authorizeMutation, endpointRateLimited, getSessionExpiry } from './_lib/security.js'
import { readMutation } from './_lib/validation.js'
import { ensureSchema, getSql, sendError } from './_lib/db.js'
import { writeAuditLog } from './_lib/audit.js'
import { del, put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'

const dataImage = /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/u
const blobUrl = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//iu
const extensions = { png: 'png', jpeg: 'jpg', webp: 'webp', gif: 'gif' } as const

async function uploadPhoto(id: string, source: string): Promise<string> {
  const match = source.match(dataImage)
  if (!match) throw new Error('Invalid gallery image payload')
  const type = match[1] as keyof typeof extensions
  const image = Buffer.from(match[2], 'base64')
  if (!image.length || image.length > 2_000_000) throw new Error('Invalid gallery image size')
  const uploaded = await put(`gallery/${id}-${randomUUID()}.${extensions[type]}`, image, {
    access: 'public',
    contentType: `image/${type}`,
    addRandomSuffix: false,
    cacheControlMaxAge: 31_536_000,
  })
  return uploaded.url
}

async function removeBlob(source: string) {
  if (!blobUrl.test(source)) return
  try { await del(source) } catch { console.error('Gallery Blob cleanup failed') }
}

async function migrateLegacyPhotos(rows: any[], sql: ReturnType<typeof getSql>) {
  for (const row of rows) {
    if (!dataImage.test(row.photo)) continue
    try {
      const url = await uploadPhoto(row.id, row.photo)
      await sql`UPDATE gallery_photos SET photo=${url} WHERE id=${row.id} AND photo=${row.photo}`
      row.photo = url
    } catch {
      // Keep the legacy image available until Blob storage is connected.
    }
  }
  return rows
}

export default async function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', req.method === 'GET' ? 'public, max-age=30, stale-while-revalidate=120' : 'no-store')
  try {
    if (req.method !== 'GET' && !await authorizeMutation(req, res)) return
    const body = req.method === 'GET' ? null : readMutation(req, res, 'gallery')
    if (req.method !== 'GET' && !body) return
    if (req.method !== 'GET') await ensureSchema()
    const sql = getSql()
    if (req.method === 'GET') {
      if (await endpointRateLimited(req, res, 'gallery')) return
      const rows = await sql`SELECT id, photo, date, description FROM gallery_photos ORDER BY date DESC, created_at DESC`
      const hasLegacyPhotos = rows.some(row => dataImage.test(row.photo))
      const photos = hasLegacyPhotos && await getSessionExpiry(req) ? await migrateLegacyPhotos(rows, sql) : rows
      return res.status(200).json(photos)
    }
    if (req.method === 'POST') {
      if (!dataImage.test(body.photo)) return res.status(400).json({ error: 'Choose a new gallery image.' })
      const url = await uploadPhoto(body.id, body.photo)
      try {
        await sql`INSERT INTO gallery_photos (id, photo, date, description) VALUES (${body.id}, ${url}, ${body.date}, ${body.description || ''})`
      } catch (error) {
        await removeBlob(url)
        throw error
      }
      await writeAuditLog(req, { action: 'create', entity: 'gallery_photo', entityId: body.id, summary: body.date })
    } else if (req.method === 'PUT') {
      const existing = await sql`SELECT photo FROM gallery_photos WHERE id=${body.id} LIMIT 1`
      if (!existing[0]) return res.status(404).json({ error: 'Gallery photo was not found.' })
      const replacement = dataImage.test(body.photo) ? await uploadPhoto(body.id, body.photo) : body.photo
      if (!dataImage.test(body.photo) && body.photo !== existing[0].photo) return res.status(400).json({ error: 'Invalid gallery image reference.' })
      try {
        await sql`UPDATE gallery_photos SET photo=${replacement}, date=${body.date}, description=${body.description || ''} WHERE id=${body.id}`
      } catch (error) {
        if (replacement !== existing[0].photo) await removeBlob(replacement)
        throw error
      }
      if (replacement !== existing[0].photo) await removeBlob(existing[0].photo)
      await writeAuditLog(req, { action: 'update', entity: 'gallery_photo', entityId: body.id, summary: body.date })
    } else if (req.method === 'DELETE') {
      const deleted = await sql`DELETE FROM gallery_photos WHERE id=${body.id} RETURNING photo`
      if (deleted[0]?.photo) await removeBlob(deleted[0].photo)
      await writeAuditLog(req, { action: 'delete', entity: 'gallery_photo', entityId: body.id })
    } else return res.status(405).json({ error: 'Method not allowed' })
    return res.status(200).json({ ok: true })
  } catch (error) { return sendError(res, error) }
}
