import { Download } from 'lucide-react'
import { AttendanceRecord, Member } from '../data/memberStore'

const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export default function AdminAttendanceExport({ members, records }: { members: Member[]; records: AttendanceRecord[] }) {
  const download = () => {
    const rows = records.map(record => `<tr><td>${esc(record.name)}</td><td>${esc(record.date)}</td><td>${record.present ? 'Present' : 'Absent'}</td><td>${esc(record.note || '—')}</td></tr>`).join('')
    const html = `<html><head><title>JSC YDM Attendance</title><style>body{font-family:Arial;color:#071f19;padding:24px}h1{color:#087f5b}p{color:#64748b}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e8f5ef}</style></head><body><h1>JSC YDM Attendance Report</h1><p>${members.length} members · ${records.length} records</p><table><thead><tr><th>Member</th><th>Date</th><th>Status</th><th>Note</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No attendance records.</td></tr>'}</tbody></table></body></html>`
    const popup = window.open('', '_blank')
    if (!popup) return
    popup.document.write(html); popup.document.close(); setTimeout(() => { popup.focus(); popup.print() }, 150)
  }
  return <button onClick={download} className="secondary-dark-btn justify-center"><Download size={17} /> Export PDF</button>
}
