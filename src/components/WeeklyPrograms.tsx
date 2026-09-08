import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Download, Trash2 } from 'lucide-react'
import { createWeeklyProgram, deleteWeeklyProgram, getMembers, getWeeklyPrograms } from '../data/api'
import { Member, WeeklyProgram } from '../data/memberStore'

const today = new Date().toISOString().slice(0, 10)
const ordered = (items: WeeklyProgram[]) => [...items].sort((a, b) => b.date.localeCompare(a.date) || a.serialNo - b.serialNo)
const prettyDate = (date: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(`${date}T00:00:00`))
const groupsFor = (items: WeeklyProgram[]) => Array.from(items.reduce((groups, item) => {
  const rows = groups.get(item.date) || []
  rows.push(item)
  groups.set(item.date, rows)
  return groups
}, new Map<string, WeeklyProgram[]>()).entries())
  .sort(([a], [b]) => b.localeCompare(a))
  .map(([date, rows]) => [date, rows.sort((a, b) => a.serialNo - b.serialNo)] as const)
const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export function WeeklyProgramPublic() {
  const [items, setItems] = useState<WeeklyProgram[]>([])

  useEffect(() => {
    const load = () => { void getWeeklyPrograms().then(setItems).catch(() => setItems([])) }
    load()
    const timer = window.setInterval(load, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const groups = useMemo(() => groupsFor(items), [items])
  if (!groups.length) return null

  return <section className="weekly-program-section mt-12">
    <div className="mb-5">
      <p className="eyebrow">Weekly program</p>
      <h2 className="mt-2 text-3xl font-black">This week&apos;s program</h2>
    </div>
    <div className="grid gap-5">
      {groups.map(([date, rows]) => <article key={date} className="soft-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="icon-box"><CalendarDays size={19} /></span>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">Date</p><h3 className="text-xl font-black">{prettyDate(date)}</h3></div>
        </div>
        <div className="overflow-x-auto"><table className="mt-3 w-full min-w-[520px] text-left">
          <thead className="text-xs uppercase tracking-[.12em] text-slate-500"><tr><th className="py-3">Sl.No</th><th>Program Name</th><th>Member Name</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{rows.map(row => <tr key={row.id}><td className="py-3 font-bold">{row.serialNo}</td><td>{row.programName}</td><td>{row.memberName}</td></tr>)}</tbody>
        </table></div>
      </article>)}
    </div>
  </section>
}

export default function AdminWeeklyPrograms() {
  const [members, setMembers] = useState<Member[]>([])
  const [items, setItems] = useState<WeeklyProgram[]>([])
  const [date, setDate] = useState(today)
  const [serialNo, setSerialNo] = useState('')
  const [programName, setProgramName] = useState('')
  const [memberId, setMemberId] = useState('')
  const [message, setMessage] = useState('')

  const load = () => {
    void getMembers().then(savedMembers => setMembers([...savedMembers].sort((a, b) => a.name.localeCompare(b.name)))).catch(() => setMessage('Could not load saved members.'))
    void getWeeklyPrograms(true).then(savedItems => setItems(ordered(savedItems))).catch(() => setMessage('Could not load weekly programs.'))
  }
  useEffect(() => { load() }, [])

  const activeItems = useMemo(() => ordered(items.filter(item => !item.archivedAt)), [items])
  const archiveGroups = useMemo(() => groupsFor(items.filter(item => item.archivedAt)), [items])

  const save = async () => {
    const member = members.find(item => item.id === memberId)
    const number = Number(serialNo)
    if (!date || !programName.trim() || !member || !Number.isInteger(number) || number < 1 || number > 15) {
      setMessage('Enter a date, serial number from 1 to 15, program name, and member.')
      return
    }
    if (activeItems.filter(item => item.date === date).length >= 15) { setMessage('A date can contain a maximum of 15 rows.'); return }
    if (activeItems.some(item => item.date === date && item.serialNo === number)) { setMessage('That serial number already exists for this date.'); return }
    const next: WeeklyProgram = { id: crypto.randomUUID(), date, serialNo: number, programName: programName.trim(), memberId, memberName: member.name }
    try {
      await createWeeklyProgram(next)
      setItems(current => ordered([next, ...current]))
      setSerialNo(''); setProgramName(''); setMemberId('')
      setMessage('Weekly program saved successfully.')
    } catch { setMessage('Could not save weekly program. Check the date and serial number.') }
  }

  const remove = async (id: string) => {
    try { await deleteWeeklyProgram(id); setItems(current => current.filter(item => item.id !== id)); setMessage('Weekly program deleted successfully.') }
    catch { setMessage('Could not delete weekly program.') }
  }

  const downloadWeekArchive = (dateValue: string, programs: WeeklyProgram[]) => {
    const rows = programs.map(program => `<tr><td>${program.serialNo}</td><td>${esc(program.programName)}</td><td>${esc(program.memberName)}</td></tr>`).join('')
    const html = `<html><head><meta charset="utf-8"><title>Weekly Program Archive</title><style>@page{margin:14mm}body{font-family:Arial;color:#071f19}h1{color:#087f5b}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left;vertical-align:top}th{background:#e8f5ef}</style></head><body><h1>Weekly Program Archive</h1><p><strong>Date of Program:</strong> ${esc(prettyDate(dateValue))}</p><p>Generated on ${esc(new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date()))}</p><table><thead><tr><th>Sl.No</th><th>Program Name</th><th>Member Name</th></tr></thead><tbody>${rows}</tbody></table></body></html>`
    const popup = window.open('', '_blank')
    if (!popup) { setMessage('Please allow pop-ups to create the PDF.'); return }
    popup.document.open(); popup.document.write(html); popup.document.close()
    try { popup.history.replaceState(null, '', `/admin/reports/weekly-program-archive-${dateValue}`) } catch { /* The print document is still usable. */ }
    setTimeout(() => { popup.focus(); popup.print() }, 150)
  }

  return <section className="soft-card mt-6">
    <div className="mb-5 flex items-center gap-3"><span className="icon-box"><CalendarDays size={19} /></span><div><p className="eyebrow">Weekly program</p><h2 className="mt-1 text-2xl font-black">Add weekly program</h2><p className="mt-1 text-sm text-slate-500">Add up to 15 program rows for each date.</p></div></div>
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[150px_110px_1fr_1fr_auto]">
      <label className="field-label">Date<input type="date" value={date} onChange={event => setDate(event.target.value)} className="field" /></label>
      <label className="field-label">Sl.No<input type="number" min="1" max="15" value={serialNo} onChange={event => setSerialNo(event.target.value)} className="field" placeholder="1–15" /></label>
      <label className="field-label">Program name<input value={programName} onChange={event => setProgramName(event.target.value)} className="field" placeholder="Program name" /></label>
      <label className="field-label">Member name<select value={memberId} onChange={event => setMemberId(event.target.value)} className="field"><option value="">Select member</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <button className="primary-btn self-end" onClick={() => void save()}>Save</button>
    </div>
    {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
    <div className="mt-6 overflow-x-auto border-t border-slate-200 pt-5"><h3 className="mb-3 font-black">Current weekly entries</h3><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">Date</th><th>Sl.No</th><th>Program Name</th><th>Member Name</th><th className="text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{activeItems.map(row => <tr key={row.id}><td className="py-3">{prettyDate(row.date)}</td><td className="font-bold">{row.serialNo}</td><td>{row.programName}</td><td>{row.memberName}</td><td className="text-right"><button aria-label={`Delete weekly program ${row.programName}`} onClick={() => void remove(row.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={16} /></button></td></tr>)}{!activeItems.length && <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">No active weekly programs added yet.</td></tr>}</tbody></table></div>
    <div className="mt-8 border-t border-slate-200 pt-5"><div className="mb-3"><p className="eyebrow">Archive</p><h3 className="mt-1 font-black">Archived weekly programs</h3></div><div className="max-h-[30rem] overflow-auto rounded-2xl border border-slate-200"><table className="w-full min-w-[780px] text-left text-sm"><thead className="sticky top-0 bg-white text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">Sl.No</th><th className="px-4 py-3">Date of Program</th><th className="px-4 py-3">Program List</th><th className="px-4 py-3 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{archiveGroups.map(([dateValue, programs], index) => <tr key={dateValue}><td className="px-4 py-3 font-bold">{index + 1}</td><td className="px-4 py-3">{prettyDate(dateValue)}</td><td className="px-4 py-3">{programs.map(program => <p key={program.id}>{program.serialNo}. {program.programName} — {program.memberName}</p>)}</td><td className="px-4 py-3 text-right"><button aria-label={`Download weekly program archive for ${prettyDate(dateValue)}`} title="Download this week as PDF" onClick={() => downloadWeekArchive(dateValue, programs)} className="inline-grid h-10 w-10 cursor-pointer place-items-center rounded-xl border border-[#d4a632] bg-[#e3bc62] text-[#071f19] shadow-[0_4px_0_#b98416] transition hover:-translate-y-0.5 hover:shadow-[0_6px_0_#b98416] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"><Download size={17} /></button></td></tr>)}{!archiveGroups.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">No archived weekly programs yet.</td></tr>}</tbody></table></div></div>
  </section>
}
