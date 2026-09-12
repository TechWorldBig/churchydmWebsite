import { useEffect, useMemo, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { deleteProgramPoint, getMembers, getProgramPoints, saveProgramPoint, updateProgramPoint } from '../data/api'
import { Member, ProgramPoint } from '../data/memberStore'
import { currentYearDateBounds } from '../data/dateBounds'

const pointPrograms = ['Bible Reference', 'Bible Quiz', 'Song Survey']
const uniquePoints = (items: ProgramPoint[]) => Array.from(new Map([...items].reverse().map(item => [`${item.memberId}-${item.program}-${item.date}`, item])).values()).reverse()
const memberNameCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

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

  useEffect(() => {
    void getMembers().then(setMembers).catch(() => setMessage('Could not load saved members.'))
    void getProgramPoints().then(rows => setPoints(uniquePoints(rows))).catch(() => setMessage('Could not load program points.'))
  }, [])

  const displayedPoints = useMemo(() => uniquePoints(points).sort((a, b) => memberNameCollator.compare(a.name.trim(), b.name.trim()) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)), [points])

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
      const record = { ...item, id: saved.id || item.id }
      setPoints(current => editingId ? uniquePoints(current.map(existing => existing.id === record.id ? record : existing)) : uniquePoints([record, ...current]))
      clearForm()
      setMessage(editingId ? 'Program point updated successfully.' : 'Program point saved successfully.')
    } catch {
      setMessage(editingId ? 'Could not update program point. Check for a duplicate member, program, and date.' : 'Could not save program point.')
    }
  }

  const remove = async (point: ProgramPoint) => {
    try {
      await deleteProgramPoint(point.id)
      setPoints(current => current.filter(item => item.id !== point.id))
      if (editingId === point.id) clearForm()
      setMessage('Program point deleted successfully.')
    } catch {
      setMessage('Could not delete program point.')
    }
  }

  return <section className="soft-card admin-program-points-form mt-6">
    <h2 className="font-black">Program points</h2>
    <p className="mt-1 text-sm text-slate-500">Add and manage member questions answered.</p>
    <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <label className="field-label">Member name<select aria-label="Program member" className="field" value={memberId} onChange={event => setMemberId(event.target.value)}><option value="">Select member</option>{members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
      <label className="field-label">Program name<select aria-label="Program name" className="field" value={program} onChange={event => setProgram(event.target.value)}><option value="">Select program</option>{pointPrograms.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="field-label">Date<input aria-label="Program date" className="field" type="date" min={yearBounds.min} max={yearBounds.max} value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="field-label">Questions answered<div className="flex min-w-0 gap-2"><input aria-label="Questions answered" className="field min-w-0" type="number" min="0" max="5" value={questionsAnswered} onChange={event => setQuestionsAnswered(event.target.value)} placeholder="0–5" /><button className="primary-btn shrink-0" onClick={() => void save()}>{editingId ? 'Update' : 'Save'}</button>{editingId && <button type="button" className="shrink-0 rounded-xl border border-slate-200 bg-white p-3 text-slate-600 shadow-sm transition hover:bg-slate-50" aria-label="Cancel editing program point" title="Cancel editing" onClick={clearForm}><X size={18} /></button>}</div></label>
    </div>
    {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
    <div className="mt-6 overflow-x-auto border-t border-slate-200 pt-5">
      <table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase tracking-wider text-slate-500"><tr><th className="py-2">Member</th><th>Seniority</th><th>Program</th><th>Date</th><th>Questions answered</th><th>Action</th></tr></thead>
        <tbody className="divide-y divide-slate-100">{displayedPoints.map(point => <tr key={point.id}><td className="py-3 font-bold">{point.name}</td><td>{point.seniority || '—'}</td><td>{point.program}</td><td>{point.date}</td><td className="font-black">{point.questionsAnswered}/5</td><td><div className="flex items-center gap-2"><button type="button" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50" aria-label={`Edit ${point.name} ${point.program} point`} title="Edit" onClick={() => edit(point)}><Pencil size={16} /></button><button type="button" className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-50" aria-label={`Delete ${point.name} ${point.program} point`} title="Delete" onClick={() => void remove(point)}><Trash2 size={16} /></button></div></td></tr>)}{displayedPoints.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-sm text-slate-400">No program points added yet.</td></tr>}</tbody>
      </table>
    </div>
  </section>
}
