import { useEffect, useState } from 'react'
import { ChevronDown, History, RefreshCw } from 'lucide-react'
import { AuditLog, getAuditLogs } from '../data/api'

const formatDate = (value: string) => new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
}).format(new Date(value))

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const load = () => {
    setLoading(true)
    setMessage('')
    getAuditLogs().then(setLogs).catch(() => setMessage('Audit logs are available only to authenticated administrators.')).finally(() => setLoading(false))
  }

  useEffect(() => { if (open && logs.length === 0) load() }, [open])

  return <section className="soft-card mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="icon-box"><History size={20} /></span><div><p className="eyebrow">Security</p><h2 className="font-black">Audit logs</h2><p className="mt-1 text-sm text-slate-500">{open ? 'Latest admin create, update, and delete actions' : 'Collapsed to keep Admin compact'}</p></div></div><div className="flex flex-wrap gap-2"><button onClick={() => setOpen(current => !current)} className="secondary-dark-btn" aria-expanded={open} aria-controls="admin-audit-log-table"><ChevronDown size={17} className={`transition ${open ? 'rotate-180' : ''}`} /> {open ? 'Hide logs' : 'View logs'}</button>{open && <button onClick={load} className="secondary-dark-btn" aria-label="Refresh audit logs" title="Refresh audit logs"><RefreshCw size={17} /> Refresh</button>}</div></div>{open && (message ? <p role="alert" className="mt-4 text-sm text-rose-700">{message}</p> : <div id="admin-audit-log-table" className="mt-5 overflow-hidden rounded-2xl border border-slate-100"><div className="max-h-80 overflow-y-auto"><table className="w-full min-w-[840px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[.12em] text-slate-500"><tr><th className="px-4 py-3">Time</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">IP address</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Summary</th></tr></thead><tbody className="divide-y divide-slate-100">{loading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Loading audit logs...</td></tr> : logs.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No audit logs yet.</td></tr> : logs.map(log => <tr key={log.id}><td className="px-4 py-3 text-slate-500">{formatDate(log.createdAt)}</td><td className="px-4 py-3 font-bold">{log.actor}</td><td className="px-4 py-3 font-mono text-xs text-slate-500">{log.ipAddress || '-'}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-emerald-700">{log.action}</span></td><td className="px-4 py-3 text-slate-700">{log.entity}</td><td className="max-w-[260px] truncate px-4 py-3 text-slate-500">{log.summary || log.entityId || '-'}</td></tr>)}</tbody></table></div></div>)}</section>
}
