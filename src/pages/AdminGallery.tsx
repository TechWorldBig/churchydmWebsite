import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { createGalleryPhoto, deleteGalleryPhoto, getGallery, updateGalleryPhoto } from '../data/api'
import { GalleryPhoto } from '../data/memberStore'
import { todayDate } from '../data/dateBounds'

const emptyPhoto: Omit<GalleryPhoto, 'id'> = {
  photo: '',
  date: todayDate(),
  description: '',
}

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const fullDateLabel = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

const dateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

const monthFromDate = (value: string) => {
  const [year, month] = value.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

export default function AdminGallery() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [photo, setPhoto] = useState(emptyPhoto)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => monthFromDate(emptyPhoto.date))
  const [selectedDate, setSelectedDate] = useState(emptyPhoto.date)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const photosByDate = useMemo(() => {
    const grouped = new Map<string, GalleryPhoto[]>()
    photos.forEach(item => grouped.set(item.date, [...(grouped.get(item.date) || []), item]))
    return grouped
  }, [photos])

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear()
    const month = visibleMonth.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstWeekday + 1
      return day > 0 && day <= daysInMonth ? { day, key: dateKey(year, month, day) } : null
    })
  }, [visibleMonth])

  const selectedEvents = photosByDate.get(selectedDate) || []

  useEffect(() => {
    getGallery()
      .then(setPhotos)
      .catch(() => setMessage('Could not load gallery. Check the database connection.'))
  }, [])

  const resetForm = () => {
    setPhoto(emptyPhoto)
    setEditingId(null)
    setSelectedDate(emptyPhoto.date)
    setVisibleMonth(monthFromDate(emptyPhoto.date))
    if (inputRef.current) inputRef.current.value = ''
  }

  const chooseCalendarDate = (value: string) => {
    setSelectedDate(value)
    setPhoto(current => ({ ...current, date: value }))
  }

  const changeMonth = (offset: number) => {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1))
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
    try {
      await deleteGalleryPhoto(id)
      setPhotos(current => current.filter(item => item.id !== id))
      setPendingDeleteId(null)
      setMessage('Gallery photo deleted successfully.')
    } catch {
      setMessage('Could not delete gallery photo.')
    }
  }

  const edit = (item: GalleryPhoto) => {
    setEditingId(item.id)
    setPhoto({ photo: item.photo, date: item.date, description: item.description })
    setSelectedDate(item.date)
    setVisibleMonth(monthFromDate(item.date))
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

      <div className="event-calendar-3d mb-6" aria-labelledby="event-calendar-title">
        <div className="event-calendar-toolbar">
          <div>
            <p className="eyebrow">Event calendar</p>
            <h3 id="event-calendar-title" className="mt-1 text-xl font-black">{monthLabel.format(visibleMonth)}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="event-calendar-nav" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={18} /></button>
            <button type="button" className="event-calendar-today" onClick={() => { const today = todayDate(); setVisibleMonth(monthFromDate(today)); chooseCalendarDate(today) }}>Today</button>
            <button type="button" className="event-calendar-nav" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className="event-calendar-weekdays" aria-hidden="true">
          {dayNames.map(day => <span key={day}>{day}</span>)}
        </div>
        <div className="event-calendar-grid">
          {calendarDays.map((item, index) => item ? (() => {
            const count = photosByDate.get(item.key)?.length || 0
            const isSelected = item.key === selectedDate
            const isToday = item.key === todayDate()
            return <button
              type="button"
              key={item.key}
              className={`event-calendar-day${count ? ' has-events' : ''}${isSelected ? ' is-selected' : ''}${isToday ? ' is-today' : ''}`}
              aria-label={`${fullDateLabel.format(new Date(`${item.key}T00:00:00`))}${count ? `, ${count} event photo${count === 1 ? '' : 's'}` : ''}`}
              aria-pressed={isSelected}
              onClick={() => chooseCalendarDate(item.key)}
            >
              <span>{item.day}</span>
              {count > 0 && <small>{count}</small>}
            </button>
          })() : <span key={`blank-${index}`} className="event-calendar-blank" />)}
        </div>
        <div className="event-calendar-summary" aria-live="polite">
          <span className="event-calendar-date-badge"><CalendarDays size={16} /> {fullDateLabel.format(new Date(`${selectedDate}T00:00:00`))}</span>
          <p>{selectedEvents.length ? `${selectedEvents.length} event photo${selectedEvents.length === 1 ? '' : 's'} saved for this date.` : 'No event photos saved for this date. The upload form is ready for it.'}</p>
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
              <input type="date" value={photo.date} onChange={event => { const value = event.target.value; if (!value) return; setPhoto(current => ({ ...current, date: value })); setSelectedDate(value); setVisibleMonth(monthFromDate(value)) }} className="field" />
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
                  {pendingDeleteId === item.id ? <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirm deletion of event photo from ${item.date}`}>
                    <span className="text-xs font-bold text-rose-700">Delete permanently?</span>
                    <button type="button" onClick={() => void remove(item.id)} className="rounded-xl bg-rose-700 px-3 py-2 text-sm font-bold text-white">Delete</button>
                    <button type="button" onClick={() => setPendingDeleteId(null)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">Cancel</button>
                  </div> : <button type="button" onClick={() => setPendingDeleteId(item.id)} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700"><Trash2 size={14} /> Delete</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
