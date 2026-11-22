import { useEffect, useMemo, useState } from 'react'
import { Archive, Download, Plus, Trash2 } from 'lucide-react'
import { archiveAnnualProgram, getMembers } from '../data/api'
import { annualProgramHtml } from '../data/annualProgramPdf'
import { downloadHtmlPdf } from '../data/pdf'
import type { AnnualProgramRow, Member } from '../data/memberStore'
import { currentYearDateBounds, todayDate } from '../data/dateBounds'

const emptyRow = (): AnnualProgramRow => ({ serialNo: 1, programName: '', memberName: '' })

export default function AdminAnnualProgram() {
  const yearBounds = currentYearDateBounds()
  const initialDate = todayDate()
  const [date, setDate] = useState(initialDate)
  const [theme, setTheme] = useState('')
  const [rows, setRows] = useState<AnnualProgramRow[]>([emptyRow()])
  const [members, setMembers] = useState<Member[]>([])
  const [archiveAfterDownload, setArchiveAfterDownload] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const year = date.slice(0, 4)
  const memberNames = useMemo(() => [...new Set(members.map(member => member.name))].sort(), [members])

  useEffect(() => { void getMembers().then(setMembers).catch(() => setMessage('Saved members could not be loaded. You can still type member names.')) }, [])

  const updateRow = (index: number, field: 'programName' | 'memberName', value: string) => setRows(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))
  const addRow = () => setRows(current => [...current, { ...emptyRow(), serialNo: current.length + 1 }])
  const removeRow = (index: number) => setRows(current => current.filter((_, rowIndex) => rowIndex !== index).map((row, rowIndex) => ({ ...row, serialNo: rowIndex + 1 })))

  const download = async () => {
    if (busy) return
    const cleanRows = rows.map(row => ({ ...row, programName: row.programName.trim(), memberName: row.memberName.trim() }))
    if (!date || !theme.trim() || cleanRows.some(row => !row.programName || !row.memberName)) { setMessage('Enter the date, annual theme, program name, and member name for every row.'); return }
    const program = { id: crypto.randomUUID(), year, date, theme: theme.trim(), rows: cleanRows }
    setBusy(true); setMessage('')
    try {
      if (archiveAfterDownload) await archiveAnnualProgram(program)
      await downloadHtmlPdf(annualProgramHtml(program), `ydm-annual-program-${year}.pdf`, 'a4', '.page')
      setMessage(archiveAfterDownload ? `PDF downloaded and moved to the ${year} Year archive.` : 'Annual program PDF downloaded.')
    } catch { setMessage(archiveAfterDownload ? 'The PDF could not be archived or downloaded. Please try again.' : 'The PDF could not be downloaded. Please try again.') }
    finally { setBusy(false) }
  }

  return <section className="soft-card mt-6">
    <div><p className="eyebrow">Annual program</p><h2 className="mt-1 text-2xl font-black">Prepare annual program</h2><p className="mt-1 text-sm text-slate-500">Add the yearly theme and program list, then download the signed-format PDF.</p></div>
    <div className="mt-6 grid gap-4 md:grid-cols-[220px_1fr]">
      <label className="field-label">Date of program<input type="date" min={yearBounds.min} max={yearBounds.max} value={date} onChange={event => setDate(event.target.value)} className="field" /></label>
      <label className="field-label">Theme of {year}<input value={theme} onChange={event => setTheme(event.target.value)} className="field" maxLength={300} placeholder="Enter the annual theme" /></label>
    </div>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200" tabIndex={0} aria-label="Annual program entries table"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="w-20 px-4 py-3">Sl.No</th><th className="px-4 py-3">Name of program</th><th className="px-4 py-3">Member name</th><th className="w-16 px-4 py-3"><span className="sr-only">Action</span></th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={index}><td className="px-4 py-3 text-center font-black">{row.serialNo}</td><td className="px-4 py-3"><input aria-label={`Program name ${row.serialNo}`} value={row.programName} onChange={event => updateRow(index, 'programName', event.target.value)} className="field" maxLength={200} /></td><td className="px-4 py-3"><input aria-label={`Member name ${row.serialNo}`} list="annual-program-members" value={row.memberName} onChange={event => updateRow(index, 'memberName', event.target.value)} className="field" maxLength={120} /></td><td className="px-4 py-3"><button type="button" aria-label={`Remove row ${row.serialNo}`} title="Remove row" disabled={rows.length === 1} onClick={() => removeRow(index)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-30"><Trash2 size={17} /></button></td></tr>)}</tbody></table></div>
    <datalist id="annual-program-members">{memberNames.map(name => <option key={name} value={name} />)}</datalist>
    <button type="button" onClick={addRow} disabled={rows.length >= 100} className="secondary-dark-btn mt-4"><Plus size={17} /> Add program row</button>
    <div className="mt-7 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-bold text-emerald-900"><input type="checkbox" checked={archiveAfterDownload} onChange={event => setArchiveAfterDownload(event.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-700" /><span><span className="flex items-center gap-2"><Archive size={16} /> Move to Year archive</span><span className="mt-1 block text-xs font-normal text-emerald-800">When checked, this PDF record is saved under {year} after download.</span></span></label><button type="button" onClick={() => void download()} disabled={busy} className="primary-btn shrink-0 justify-center"><Download size={17} /> {busy ? 'Preparing PDF…' : 'Download PDF'}</button></div>
    {message && <p role="status" className={`mt-4 text-sm font-semibold ${message.includes('could not') || message.startsWith('Enter') ? 'text-rose-700' : 'text-emerald-700'}`}>{message}</p>}
  </section>
}
