import { useEffect, useMemo, useState } from 'react'
import { Download, Pencil, Trash2, X } from 'lucide-react'
import { deleteProgramPoint, getMembers, getProgramPoints, saveProgramPoint, updateProgramPoint } from '../data/api'
import { Member, ProgramPoint } from '../data/memberStore'
import { currentYearDateBounds } from '../data/dateBounds'
import { downloadHtmlPdf } from '../data/pdf'

const pointPrograms = ['Bible Reference', 'Bible Quiz', 'Song Survey']
const memberNameCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
const pointKey = (item: ProgramPoint) => `${item.memberId}-${item.program}-${item.date}`
const pointDateValue = (value: string) => Date.parse(`${value}T00:00:00`)
const uniquePoints = (items: ProgramPoint[]) => Array.from(new Map([...items].reverse().map(item => [pointKey(item), item])).values()).reverse()
const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const escapeCsv = (value: string | number) => `"${String(value).replace(/^[=+@-]/u, "'$&").replaceAll('"', '""')}"`

export default function AdminProgramPoints() {
  const yearBounds = currentYearDateBounds()
  const [members, setMembers] = useState<Member[]>([])
  const [points, setPoints] = useState<ProgramPoint[]>([])
  const [memberId, setMemberId] = useState('')
  const [program, setProgram] = useState('')
  const [date, setDate] = useState('')
  const [questionsAnswered, setQuestionsAnswered] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const loadPoints = async () => {
    const rows = await getProgramPoints({ year: yearBounds.min.slice(0, 4) })
    setPoints(uniquePoints(rows))
  }

  useEffect(() => {
    void getMembers().then(setMembers).catch(() => setMessage('Could not load saved members.'))
    void loadPoints().catch(() => setMessage('Could not load program points.'))
  }, [])

  const displayedPoints = useMemo(() => uniquePoints(points).sort((a, b) => memberNameCollator.compare(a.name.trim(), b.name.trim()) || a.name.localeCompare(b.name) || pointDateValue(b.date) - pointDateValue(a.date) || a.program.localeCompare(b.program) || a.id.localeCompare(b.id)), [points])
  const sortedMembers = useMemo(() => [...members].sort((a, b) => memberNameCollator.compare(a.name.trim(), b.name.trim()) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)), [members])

  const clearForm = () => {
    setMemberId('')
    setProgram('')
    setDate('')
    setQuestionsAnswered('')
    setEditingId(null)
  }

  const edit = (point: ProgramPoint) => {
    setEditingId(point.id)
    setMemberId(point.memberId)
    setProgram(point.program)
    setDate(point.date)
    setQuestionsAnswered(String(point.questionsAnswered))
    setMessage('Editing this program point. Save changes when ready.')
  }

  const save = async () => {
    const member = members.find(item => item.id === memberId)
    const answered = Number(questionsAnswered)
    if (!member || !program || !date || !Number.isInteger(answered) || answered < 0 || answered > 5) {
      setMessage('Select a saved member, program, date, and questions answered from 0 to 5.')
      return
    }
    const item: ProgramPoint = { id: editingId || crypto.randomUUID(), memberId, name: member.name, program, seniority: member.seniority, date, questionsAnswered: answered }
    try {
      const saved = editingId ? await updateProgramPoint(item) : await saveProgramPoint(item)
      // Reload the canonical row after an upsert. The API may update an existing
      // member/program/date record instead of creating a second row.
      await loadPoints()
      clearForm()
      setMessage(editingId ? 'Program point updated successfully.' : saved.created === false ? 'This member, program, and date already existed, so its score was updated.' : 'Program point added successfully.')
    } catch {
      setMessage(editingId ? 'Could not update program point. Check for a duplicate member, program, and date.' : 'Could not save program point.')
    }
  }

  const remove = async (point: ProgramPoint) => {
    if (!window.confirm(`Delete ${point.name}'s ${point.program} points for ${point.date}? This cannot be undone.`)) return
    try {
      await deleteProgramPoint(point.id)
      setPoints(current => current.filter(item => item.id !== point.id))
      if (editingId === point.id) clearForm()
      setMessage('Program point deleted successfully.')
    } catch {
      setMessage('Could not delete program point.')
    }
  }

  const exportPdf = () => {
    const rows = displayedPoints.map(point => `<tr><td>${escapeHtml(point.name)}</td><td>${escapeHtml(point.seniority || '—')}</td><td>${escapeHtml(point.program)}</td><td>${escapeHtml(point.date)}</td><td>${point.questionsAnswered}/5</td></tr>`).join('')
    const html = `<html><head><title>JSC YDM Program Points</title><style>body{font-family:Arial;color:#071f19;padding:24px}h1{color:#087f5b}p{color:#64748b}table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:18px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e8f5ef}</style></head><body><h1>JSC YDM Program Points Report</h1><p>${displayedPoints.length} records</p><table><thead><tr><th>Member</th><th>Seniority</th><th>Program</th><th>Date</th><th>Questions answered</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No program points.</td></tr>'}</tbody></table></body></html>`
    if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 600) { void downloadHtmlPdf(html, 'jsc-ydm-program-points-report.pdf').catch(() => setMessage('PDF export failed. Please try again.')); return }
    const popup = window.open('', '_blank')
    if (!popup) { setMessage('Please allow pop-ups to export the PDF.'); return }
    popup.document.write(html); popup.document.close(); setTimeout(() => { popup.focus(); popup.print() }, 150)
  }

  const exportCsv = () => {
    const rows = [['Member', 'Seniority', 'Program', 'Date', 'Questions answered'], ...displayedPoints.map(point => [point.name, point.seniority || '', point.program, point.date, point.questionsAnswered])]
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'jsc-ydm-program-points.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <section className="soft-card admin-program-points-form mt-6">
    <h2 className="font-black">Program points</h2>
    <p className="mt-1 text-sm text-slate-500">Add and manage member questions answered.</p>
    <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="field-label">Member name<select aria-label="Program member" className="field" value={memberId} onChange={event => setMemberId(event.target.value)}><option value="">Select member</option>{sortedMembers.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label className="field-label">Program name<select aria-label="Program name" className="field" value={program} onChange={event => setProgram(event.target.value)}><option value="">Select program</option>{pointPrograms.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="field-label">Date<input aria-label="Program date" className="field" type="date" min={yearBounds.min} max={yearBounds.max} value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="field-label">Questions answered<div className="flex min-w-0 gap-2"><input aria-label="Questions answered" className="field min-w-0" type="number" min="0" max="5" value={questionsAnswered} onChange={event => setQuestionsAnswered(event.target.value)} placeholder="0–5" /><button className="primary-btn shrink-0" onClick={() => void save()}>{editingId ? 'Update' : 'Save'}</button>{editingId && <button type="button" className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm transition hover:bg-slate-50" aria-label="Cancel editing program point" title="Cancel editing" onClick={clearForm}><X size={18} /></button>}</div></label>
    </div>
    {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
    <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5"><button type="button" onClick={exportPdf} className="secondary-dark-btn justify-center"><Download size={17} /> Export PDF</button><button type="button" onClick={exportCsv} className="secondary-dark-btn justify-center"><Download size={17} /> Export CSV</button></div>
    <div className="mt-3 overflow-x-auto" tabIndex={0} aria-label="Program points table. Swipe or use Shift and mouse wheel to view all columns.">
      <table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">Member</th><th>Seniority</th><th>Program</th><th>Date</th><th>Questions answered</th><th>Action</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{displayedPoints.map(point => <tr key={point.id}><td className="py-3 font-bold">{point.name}</td><td>{point.seniority || '—'}</td><td>{point.program}</td><td>{point.date}</td><td className="font-black">{point.questionsAnswered}/5</td><td><div className="flex items-center gap-2"><button type="button" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50" aria-label={`Edit ${point.name} ${point.program} point`} title="Edit" onClick={() => edit(point)}><Pencil size={16} /></button><button type="button" className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50" aria-label={`Delete ${point.name} ${point.program} point`} title="Delete" onClick={() => void remove(point)}><Trash2 size={16} /></button></div></td></tr>)}{displayedPoints.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">No program points added yet.</td></tr>}</tbody>
      </table>
    </div>
  </section>
}
