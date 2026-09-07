import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { getAttendance, getMembers, getProgramPoints } from '../data/api'
import { AttendanceRecord, Member, ProgramPoint } from '../data/memberStore'

const esc = (value: unknown) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const printOrWord = (html: string, format: string, filename: string, setMessage: (message: string) => void) => {
  if (format === 'word') { const url = URL.createObjectURL(new Blob([html], { type: 'application/msword' })); const link = document.createElement('a'); link.href = url; link.download = `${filename}.doc`; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return }
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' })); const popup = window.open(url, '_blank'); if (!popup) { URL.revokeObjectURL(url); setMessage('Please allow pop-ups to create the PDF.'); return }; popup.addEventListener('load', () => { popup.focus(); popup.print(); setTimeout(() => URL.revokeObjectURL(url), 1000) })
}
const shell = (title: string, body: string) => `<html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Arial;padding:24px;color:#071f19}h1,h2{color:#087f5b}h1{border-bottom:2px solid #087f5b;padding-bottom:8px}h2{margin-top:28px}table{border-collapse:collapse;width:100%;font-size:11px;margin-bottom:16px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#e8f5ef}.empty{color:#64748b;font-style:italic}</style></head><body><h1>${esc(title)}</h1>${body}</body></html>`
const groupLabel = (seniority: string, absent: number) => `${seniority} members · ${absent === 0 ? 'Present every day' : `${absent} day${absent === 1 ? '' : 's'} absent`}`

type AttendanceSummary = { member: Member; seniority: string; absent: number; percentage: number }
const attendanceReport = (members: Member[], records: AttendanceRecord[]) => {
  const days = [...new Set(records.map(record => record.date))]
  const summaries: AttendanceSummary[] = members.flatMap(member => {
    const rows = records.filter(record => record.memberId === member.id)
    if (!rows.length || !days.length || !member.seniority) return []
    const presentDays = new Set(rows.filter(record => record.present).map(record => record.date))
    const absent = days.filter(day => !presentDays.has(day)).length
    return [{ member, seniority: member.seniority, absent, percentage: Math.round((presentDays.size / days.length) * 100) }]
  }).filter(item => item.absent <= 2)
  const sections = [0, 1, 2].flatMap(absent => ['Junior', 'Senior'].map(seniority => {
    const rows = summaries.filter(item => item.absent === absent && item.seniority === seniority)
    if (!rows.length) return ''
    return `<h2>${groupLabel(seniority, absent)}</h2><table><thead><tr><th>Name</th><th>Seniority</th><th>Overall percentage</th></tr></thead><tbody>${rows.map(row => `<tr><td>${esc(row.member.name)}</td><td>${esc(row.seniority)}</td><td>${row.percentage}%</td></tr>`).join('')}</tbody></table>`
  })).join('')
  return shell('JSC YDM Attendance Report', sections || '<p class="empty">No members match the attendance report criteria.</p>')
}

const programReport = (points: ProgramPoint[]) => {
  const programs = ['Bible Quiz', 'Bible Reference', 'Song Survey']
  const sections = programs.flatMap(program => ['Junior', 'Senior'].map(seniority => {
    const totals = new Map<string, { name: string; seniority: string; points: number }>()
    points.filter(point => point.program === program && point.seniority === seniority).forEach(point => { const current = totals.get(point.memberId) || { name: point.name, seniority: point.seniority, points: 0 }; current.points += point.questionsAnswered; totals.set(point.memberId, current) })
    const rows = [...totals.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)).slice(0, 2)
    if (!rows.length) return ''
    return `<h2>${esc(program)} · ${esc(seniority)}</h2><table><thead><tr><th>Rank</th><th>Name</th><th>Seniority</th><th>Total points</th></tr></thead><tbody>${rows.map((row, index) => `<tr><td>${index + 1}</td><td>${esc(row.name)}</td><td>${esc(row.seniority)}</td><td>${row.points}</td></tr>`).join('')}</tbody></table>`
  })).join('')
  return shell('JSC YDM Program Points Report', sections || '<p class="empty">No program points are available.</p>')
}

function ReportCard({ title, description, format, setFormat, download, message }: { title: string; description: string; format: string; setFormat: (value: string) => void; download: () => void; message: string }) {
  return <section className="soft-card admin-report-card mt-6"><div><h2 className="font-black">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div><div className="mt-4 flex flex-wrap gap-2"><select aria-label={`${title} format`} className="field" value={format} onChange={event => setFormat(event.target.value)}><option value="pdf">PDF</option><option value="word">Word</option></select><button className="primary-btn" onClick={download}><Download size={17} /> Download</button></div>{message && <p className="mt-3 text-sm text-rose-700">{message}</p>}</section>
}

export default function AdminReports() {
  const [members, setMembers] = useState<Member[]>([]); const [records, setRecords] = useState<AttendanceRecord[]>([]); const [points, setPoints] = useState<ProgramPoint[]>([])
  const [attendanceFormat, setAttendanceFormat] = useState('pdf'); const [programFormat, setProgramFormat] = useState('pdf'); const [attendanceMessage, setAttendanceMessage] = useState(''); const [programMessage, setProgramMessage] = useState('')
  useEffect(() => { void Promise.all([getMembers(), getAttendance(), getProgramPoints()]).then(([savedMembers, savedRecords, savedPoints]) => { setMembers(savedMembers); setRecords(savedRecords); setPoints(savedPoints) }).catch(() => { setAttendanceMessage('Could not load saved attendance data.'); setProgramMessage('Could not load saved program points.') }) }, [])
  const attendanceCount = useMemo(() => attendanceReport(members, records).match(/<tr><td>/g)?.length || 0, [members, records])
  const downloadAttendance = () => printOrWord(attendanceReport(members, records), attendanceFormat, 'jsc-ydm-attendance-report', setAttendanceMessage)
  const downloadPrograms = () => printOrWord(programReport(points), programFormat, 'jsc-ydm-program-points-report', setProgramMessage)
  return <><ReportCard title="Download attendance report" description={`${attendanceCount} qualifying members · grouped by seniority and absent days`} format={attendanceFormat} setFormat={setAttendanceFormat} download={downloadAttendance} message={attendanceMessage} /><ReportCard title="Download program points report" description="Top two Junior and Senior members for Bible Quiz, Bible Reference and Song Survey" format={programFormat} setFormat={setProgramFormat} download={downloadPrograms} message={programMessage} /></>
}
