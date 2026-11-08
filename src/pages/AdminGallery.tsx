import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { CalendarDays, ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { createGalleryPhoto, deleteGalleryPhoto, getGallery, updateGalleryPhoto } from '../data/api'
import { GalleryPhoto } from '../data/memberStore'
import { todayDate } from '../data/dateBounds'

const emptyPhoto: Omit<GalleryPhoto, 'id'> = {
  photo: '',
  date: todayDate(),
  description: '',
}

export default function AdminGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [photo, setPhoto] = useState(emptyPhoto)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getGallery()
      .then(setPhotos)
      .catch(() => setMessage('Could not load gallery. Check the database connection.'))
  }, [])

  const resetForm = () => {
    setPhoto(emptyPhoto)
    setEditingId(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (file.size > 2_000_000 || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setMessage('Choose a JPG, PNG, WebP or GIF image under 2 MB.'); return }

    setOptimizing(true)
    setMessage('')
    try {
      const source = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })

      // Keep animated GIFs intact. Photos are resized before upload so gallery
      // cards do not make visitors download multi-megabyte camera originals.
      if (file.type === 'image/gif') {
        setPhoto(current => ({ ...current, photo: source }))
      } else {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
          const element = new Image()
          element.onload = () => resolve(element)
          element.onerror = () => reject(new Error('The image could not be read.'))
          element.src = source
        })
        const maxDimension = 1600
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight))
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Image optimization is unavailable.')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const optimized = canvas.toDataURL('image/webp', .8)
        setPhoto(current => ({ ...current, photo: optimized.length < source.length ? optimized : source }))
      }
    } catch {
      setMessage('Could not prepare that photo. Choose another image and try again.')
      if (inputRef.current) inputRef.current.value = ''
    } finally {
      setOptimizing(false)
    }
  }

  const save = async () => {
    if (!photo.photo) {
      setMessage('Choose a photo first.')
      return
    }

    const next: GalleryPhoto = { id: editingId || crypto.randomUUID(), ...photo }

    try {
      if (editingId) await updateGalleryPhoto(next)
      else await createGalleryPhoto(next)

      setPhotos(current => editingId
        ? current.map(item => item.id === editingId ? next : item)
        : [next, ...current])
      resetForm()
      setMessage('Gallery photo saved successfully.')
    } catch {
      setMessage('Could not save gallery photo. Check the database connection.')
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('Delete this gallery photo? This cannot be undone.')) return
    try {
      await deleteGalleryPhoto(id)
      setPhotos(current => current.filter(item => item.id !== id))
      setMessage('Gallery photo deleted successfully.')
    } catch {
      setMessage('Could not delete gallery photo.')
    }
  }

  const edit = (item: GalleryPhoto) => {
    setEditingId(item.id)
    setPhoto({ photo: item.photo, date: item.date, description: item.description })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="admin-gallery-inline mt-6 border-t border-slate-200 pt-8">
      <div className="mb-5 flex items-center gap-3">
        <span className="icon-box"><CalendarDays size={19} /></span>
        <div>
          <p className="eyebrow">Gallery</p>
          <h2 className="mt-1 text-2xl font-black">Add event photos</h2>
          <p className="mt-1 text-sm text-slate-500">Upload a photo, event date and description. It will appear in the public Gallery.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3">
            <label className="field-label">
              Photo
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={event => void upload(event)} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-bold file:text-emerald-700" />
            </label>
            {photo.photo && <img src={photo.photo} alt="Selected event" className="h-36 w-full rounded-xl object-cover" />}
            <label className="field-label">
              Event date
              <input type="date" value={photo.date} onChange={event => setPhoto(current => ({ ...current, date: event.target.value }))} className="field" />
            </label>
            <label className="field-label">
              Description
              <textarea value={photo.description} onChange={event => setPhoto(current => ({ ...current, description: event.target.value }))} className="field min-h-20 resize-none" placeholder="Describe the event or ministry moment" />
            </label>
            <div className="flex gap-2">
              <button onClick={() => void save()} disabled={optimizing} className="primary-btn flex-1 justify-center disabled:cursor-wait disabled:opacity-60"><ImagePlus size={16} /> {optimizing ? 'Preparing photo…' : editingId ? 'Save changes' : 'Upload photo'}</button>
              {editingId && <button onClick={resetForm} className="secondary-dark-btn">Cancel</button>}
            </div>
            {message && <p className="text-sm text-emerald-700">{message}</p>}
          </div>
        </div>

        <div className="admin-gallery-photo-list grid gap-4 sm:grid-cols-2">
          {photos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 sm:col-span-2">No event photos added yet.</div>
          ) : photos.map(item => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <img loading="lazy" decoding="async" src={item.photo} alt={item.description || 'Event photo'} className="h-40 w-full object-cover" />
              <div className="p-4">
                <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">{item.date}</p>
                {item.description && <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => edit(item)} className="secondary-dark-btn"><Pencil size={14} /> Edit</button>
                  <button onClick={() => void remove(item.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700"><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
