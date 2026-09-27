import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Archive, CalendarDays, ClipboardList, Download, RefreshCw, Users } from 'lucide-react'
import { getAttendance, getProgramPoints } from '../data/api'
import { downloadHtmlPdf } from '../data/pdf'
import type { AttendanceRecord, ProgramPoint } from '../data/memberStore'
import { currentYearDateBounds } from '../data/dateBounds'

const yearFrom = (value: string) => value.slice(0, 4)
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)

export default function AdminYearArchive() {
  const currentYear = currentYearDateBounds().min.slice(0, 4)
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [points, setPoints] = useState<ProgramPoint[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [savedAttendance, savedPoints] = await Promise.all([getAttendance({ allYears: true }), getProgramPoints({ allYears: true })])
      setAttendance(savedAttendance)
      setPoints(savedPoints)
    } catch {
      setError('Could not load the year archive. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const years = useMemo(() => [...new Set([...attendance.map(item => yearFrom(item.date)), ...points.map(item => yearFrom(item.date))])]
    .filter(year => /^\d{4}$/u.test(year) && year < currentYear)
    .sort((left, right) => right.localeCompare(left)), [attendance, currentYear, points])

  useEffect(() => {
    setSelectedYear(current => years.includes(current) ? current : (years[0] || ''))
  }, [years])

  const yearAttendance = useMemo(() => attendance.filter(item => yearFrom(item.date) === selectedYear).sort((left, right) => right.date.localeCompare(left.date) || left.name.localeCompare(right.name)), [attendance, selectedYear])
  const yearPoints = useMemo(() => points.filter(item => yearFrom(item.date) === selectedYear).sort((left, right) => right.date.localeCompare(left.date) || left.name.localeCompare(right.name)), [points, selectedYear])
  const present = yearAttendance.filter(item => item.present).length
  const absent = yearAttendance.length - present

  const downloadArchive = async () => {
    if (!selectedYear || downloading) return
    setDownloading(true)
    setDownloadError('')
    const attendanceRows = yearAttendance.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.date)}</td><td>${item.present ? 'Present' : 'Absent'}</td><td>${escapeHtml(item.note || '—')}</td></tr>`).join('') || '<tr><td colspan="4">No attendance records saved.</td></tr>'
    const pointRows = yearPoints.map(item => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.seniority || '—')}</td><td>${escapeHtml(item.program)}</td><td>${escapeHtml(item.date)}</td><td>${item.questionsAnswered}/5</td></tr>`).join('') || '<tr><td colspan="5">No program points saved.</td></tr>'
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172b24;margin:0}.page{border:2px solid #d9ad43;padding:28px;background:linear-gradient(140deg,#f4fbf7,#fff)}header{border-bottom:2px solid #087f5b;padding-bottom:16px}.eyebrow{color:#087f5b;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase}h1{font:700 30px Georgia,serif;margin:8px 0;color:#071f19}.sub{color:#526c62;font-size:13px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:20px 0}.metric{background:#edf7f1;border:1px solid #c7dfd4;padding:10px}.metric b{display:block;font-size:22px;color:#071f19}.metric span{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#526c62}h2{font-size:16px;color:#087f5b;margin:24px 0 8px}table{width:100%;border-collapse:collapse;font-size:10px}th{background:#071f19;color:#fff;text-align:left;padding:7px}td{border-bottom:1px solid #dce8e1;padding:7px;vertical-align:top}footer{margin-top:20px;border-top:1px solid #c7dfd4;padding-top:10px;color:#526c62;font-size:9px;text-align:center}</style></head><body><main class="page"><header><div class="eyebrow">Jehovah Salvation Church · Youth Divine Movement</div><h1>Year Archive · ${escapeHtml(selectedYear)}</h1><div class="sub">Read-only annual attendance and program-point record</div></header><section class="summary"><div class="metric"><b>${yearAttendance.length}</b><span>Attendance records</span></div><div class="metric"><b>${present}</b><span>Present</span></div><div class="metric"><b>${absent}</b><span>Absent</span></div><div class="metric"><b>${yearPoints.length}</b><span>Program points</span></div></section><h2>Attendance</h2><table><thead><tr><th>Member</th><th>Date</th><th>Status</th><th>Note</th></tr></thead><tbody>${attendanceRows}</tbody></table><h2>Program points</h2><table><thead><tr><th>Member</th><th>Seniority</th><th>Program</th><th>Date</th><th>Answered</th></tr></thead><tbody>${pointRows}</tbody></table><footer>Generated from the protected YDM year archive</footer></main></body></html>`
    try {
      await downloadHtmlPdf(html, `ydm-year-archive-${selectedYear}.pdf`)
    } catch {
      setDownloadError('The archive PDF could not be created. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  return <section className="mt-6 rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_18px_45px_rgba(7,31,25,.08)] sm:p-7">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-3"><span className="icon-box"><Archive size={20} /></span><div><p className="eyebrow">Protected history</p><h2 className="text-xl font-black text-slate-900">Year archive</h2><p className="mt-1 max-w-2xl text-sm text-slate-500">Completed years are kept here for review. Active attendance and program points automatically start fresh each India-calendar year; archive records are read-only.</p></div></div>
      <button type="button" onClick={() => void load()} className="secondary-dark-btn shrink-0" disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh</button>
    </div>
    {error && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-slate-500">Loading archived ministry records…</p> : years.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-7 text-center"><Archive className="mx-auto text-emerald-700" size={28} /><p className="mt-3 font-bold">No completed-year records yet</p><p className="mt-1 text-sm text-slate-500">When the calendar moves beyond {currentYear}, the saved attendance and program points from the completed year will appear here automatically.</p></div> : <>
      <div className="mt-6 flex flex-wrap items-end gap-3"><label className="field-label max-w-xs">Archived year<select aria-label="Archived year" className="field mt-1" value={selectedYear} onChange={event => setSelectedYear(event.target.value)}>{years.map(year => <option key={year} value={year}>{year}</option>)}</select></label><p className="pb-2 text-sm text-slate-500">Read-only record for {selectedYear}.</p><button type="button" onClick={() => void downloadArchive()} disabled={downloading} className="primary-btn shrink-0"><Download size={17} /> {downloading ? 'Preparing PDF…' : 'Download PDF'}</button></div>
      {downloadError && <p role="alert" className="mt-3 text-sm font-semibold text-rose-700">{downloadError}</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon={<CalendarDays size={18} />} label="Attendance records" value={yearAttendance.length} /><Metric icon={<Users size={18} />} label="Present" value={present} /><Metric icon={<Users size={18} />} label="Absent" value={absent} /><Metric icon={<ClipboardList size={18} />} label="Program points" value={yearPoints.length} /></div>
      <ArchiveTable title="Attendance" empty="No attendance records were saved for this year." count={yearAttendance.length}><table className="w-full min-w-[620px] text-left text-sm"><thead><tr><th>Member</th><th>Date</th><th>Status</th><th>Note</th></tr></thead><tbody>{yearAttendance.map(item => <tr key={item.id}><td className="font-bold">{item.name}</td><td>{item.date}</td><td><span className={item.present ? 'text-emerald-700' : 'text-rose-700'}>{item.present ? 'Present' : 'Absent'}</span></td><td className="max-w-64 truncate">{item.note || '—'}</td></tr>)}</tbody></table></ArchiveTable>
      <ArchiveTable title="Program points" empty="No program points were saved for this year." count={yearPoints.length}><table className="w-full min-w-[780px] text-left text-sm"><thead><tr><th>Member</th><th>Seniority</th><th>Program</th><th>Date</th><th>Answered</th></tr></thead><tbody>{yearPoints.map(item => <tr key={item.id}><td className="font-bold">{item.name}</td><td>{item.seniority || '—'}</td><td>{item.program}</td><td>{item.date}</td><td>{item.questionsAnswered}/5</td></tr>)}</tbody></table></ArchiveTable>
    </>}
  </section>
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-center gap-2 text-emerald-700">{icon}<span className="text-xs font-black uppercase tracking-wider text-slate-500">{label}</span></div><p className="mt-3 text-3xl font-black text-slate-900">{value}</p></div>
}

function ArchiveTable({ title, empty, count, children }: { title: string; empty: string; count: number; children: ReactNode }) {
  return <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200"><div className="border-b border-slate-100 bg-slate-50 px-5 py-3 font-black">{title}</div>{count === 0 ? <p className="p-5 text-sm text-slate-500">{empty}</p> : <div className="archive-table overflow-x-auto">{children}</div>}</div>
}
