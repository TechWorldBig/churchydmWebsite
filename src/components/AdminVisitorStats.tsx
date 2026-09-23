import { useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarDays, RefreshCw, Users } from 'lucide-react'
import { VisitorLocation, getVisitorStats } from '../data/api'

type VisitorStats = {
  date: string
  hours: Array<{ hour: number; count: number; devices: Record<string, number> }>
  devices: Array<{ device: string; count: number }>
  locations: VisitorLocation[]
  dailyTotal: number
  total: number
}

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
const label = (hour: number) => `${hour === 0 ? 12 : hour > 12 ? hour - 12 : hour}${hour < 12 ? ' AM' : ' PM'}`
const place = (location: VisitorLocation) => [location.city, location.region, location.country].filter(Boolean).join(', ') || 'Unknown'
const lastSeen = (value: string) => new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))

export default function AdminVisitorStats() {
  const [date, setDate] = useState(today())
  const [stats, setStats] = useState<VisitorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const load = () => { setLoading(true); setMessage(''); getVisitorStats(date).then(setStats).catch(() => setMessage('Visitor statistics are available only to authenticated administrators.')).finally(() => setLoading(false)) }
  useEffect(() => { load() }, [date])
  const max = useMemo(() => Math.max(...(stats?.hours.map(item => item.count) || [1]), 1), [stats])

  return <section className="soft-card mt-6 border border-emerald-100 bg-white shadow-[0_18px_40px_rgba(7,31,25,.08)]">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-center gap-3"><span className="icon-box"><BarChart3 size={20} /></span><div><p className="eyebrow">Private analytics</p><h2 className="font-black">Website visitors</h2><p className="mt-1 text-sm text-slate-500">Unique public IP addresses · India time</p></div></div>
      <div className="flex items-center gap-2"><label className="sr-only" htmlFor="visitor-date">Visitor date</label><div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input id="visitor-date" type="date" value={date} onChange={event => setDate(event.target.value)} className="field pl-10" /></div><button onClick={load} className="secondary-dark-btn" aria-label="Refresh visitor statistics" title="Refresh"><RefreshCw size={17} /></button></div>
    </div>
    {message ? <p role="alert" className="mt-5 text-sm text-rose-700">{message}</p> : <>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-[#071f19] p-5 text-white"><p className="text-xs font-bold uppercase tracking-[.14em] text-[#e3bc62]">Total unique visitors</p><p className="mt-2 text-4xl font-black">{loading ? '-' : stats?.total ?? 0}</p><p className="mt-2 text-xs text-white/60">Cumulative total · does not reset</p></div>
        <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-950"><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">Selected day</p><p className="mt-2 text-4xl font-black">{loading ? '-' : stats?.dailyTotal ?? 0}</p><p className="mt-2 text-xs text-emerald-800">Unique IPs on {date}</p></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">{['mobile', 'tablet', 'desktop', 'unknown'].map(device => <div key={device} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{device}</p><p className="mt-1 text-2xl font-black text-slate-900">{loading ? '-' : stats?.devices.find(item => item.device === device)?.count ?? 0}</p><p className="text-xs text-slate-400">Unique IPs</p></div>)}</div>
      <div className="mt-6"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-black text-slate-900">24-hour activity</p><span className="text-xs font-bold text-slate-400">12 AM - 11 PM</span></div><div className="grid grid-cols-12 items-end gap-1.5 sm:grid-cols-24">{(stats?.hours || Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0, devices: {} }))).map(item => <div key={item.hour} className="group flex min-w-0 flex-col items-center gap-1"><div className="flex h-36 w-full items-end rounded-lg bg-slate-50 p-1"><div className="w-full rounded-md bg-emerald-600 transition-all" style={{ height: `${item.count ? Math.max((item.count / max) * 100, 8) : 2}%` }} title={`${label(item.hour)}: ${item.count}`} /></div><span className="text-[9px] text-slate-400">{item.hour % 3 === 0 ? label(item.hour).replace(' ', '') : ''}</span></div>)}</div></div>
      <div className="mt-6"><div className="mb-3"><p className="text-sm font-black text-slate-900">All captured visitor locations</p><p className="mt-1 text-xs text-slate-500">{loading ? 'Loading visitor locations...' : `Showing all ${stats?.locations.length || 0} recorded IP-hour visits, newest first.`} City, region, coordinates and time zone may be approximate.</p></div><div className="overflow-hidden rounded-2xl border border-slate-100"><div className="max-h-72 overflow-y-auto" tabIndex={0} aria-label="Visitor locations table. Swipe or use Shift and mouse wheel to view all columns."><table className="w-full min-w-[940px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[.12em] text-slate-500"><tr><th className="px-4 py-3">Location</th><th className="px-4 py-3">Last seen (India)</th><th className="px-4 py-3">Latitude</th><th className="px-4 py-3">Longitude</th><th className="px-4 py-3">Time zone</th><th className="px-4 py-3">Device</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading locations...</td></tr> : (stats?.locations.length || 0) === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No IP location data available yet.</td></tr> : stats?.locations.map((location, index) => <tr key={`${location.lastSeenAt}-${index}`}><td className="px-4 py-3 font-bold text-slate-800">{place(location)}</td><td className="px-4 py-3 text-slate-500">{location.lastSeenAt ? lastSeen(location.lastSeenAt) : '-'}</td><td className="px-4 py-3 font-mono text-xs text-slate-500">{location.latitude || '-'}</td><td className="px-4 py-3 font-mono text-xs text-slate-500">{location.longitude || '-'}</td><td className="px-4 py-3 text-slate-500">{location.timezone || '-'}</td><td className="px-4 py-3 text-slate-500">{location.device || 'unknown'}</td></tr>)}</tbody></table></div></div></div>
      <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><Users size={15} /> Selected day and device cards count each IP once. Hour bars count each IP once per hour. Visitor location is approximate from public IP, not GPS.</div>
    </>}
  </section>
}
