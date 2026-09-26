import { Download } from 'lucide-react'
import { AttendanceRecord, Member } from '../data/memberStore'
import { downloadHtmlPdf } from '../data/pdf'

const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const normalizeSeniority = (value: string) => value.trim().toLocaleLowerCase()
const normalizeName = (value: string) => value.trim().toLocaleLowerCase()
const belongsToMember = (record: AttendanceRecord, member: Member) => record.memberId === member.id || (!record.memberId && normalizeName(record.name) === normalizeName(member.name))

export default function AdminAttendanceExport({ members, records }: { members: Member[]; records: AttendanceRecord[] }) {
  const download = () => {
    const groups = ['Kutties', 'Junior', 'Senior'].map(seniority => {
      const groupMembers = members.filter(member => normalizeSeniority(member.seniority) === normalizeSeniority(seniority))
      const groupRecords = records.filter(record => groupMembers.some(member => belongsToMember(record, member)))
      const memberRecords = (member: Member) => groupRecords.filter(record => belongsToMember(record, member))
      const absentDays = (member: Member) => new Set(memberRecords(member).filter(record => !record.present).map(record => record.date)).size
      const hasRecords = (member: Member) => memberRecords(member).length > 0
      const summary = `<p><strong>All present:</strong> ${groupMembers.filter(member => hasRecords(member) && absentDays(member) === 0).length} &nbsp; <strong>1 day absent:</strong> ${groupMembers.filter(member => absentDays(member) === 1).length} &nbsp; <strong>2 days absent:</strong> ${groupMembers.filter(member => absentDays(member) === 2).length}</p>`
      const rows = groupRecords.map(record => `<tr><td>${esc(record.name)}</td><td>${esc(record.date)}</td><td>${record.present ? 'Present' : 'Absent'}</td><td>${esc(record.note || '—')}</td></tr>`).join('')
      return `<h2>${seniority}</h2>${summary}<table><thead><tr><th>Member</th><th>Date</th><th>Status</th><th>Note</th></tr></thead><tbody>${rows || '<tr><td colspan="4">No attendance records.</td></tr>'}</tbody></table>`
    }).join('')
    const html = `<html><head><title>JSC YDM Attendance</title><style>body{font-family:Arial;color:#071f19;padding:24px}h1{color:#087f5b}h2{margin-top:28px;color:#087f5b}p{color:#64748b}table{border-collapse:collapse;width:100%;font-size:12px;margin-bottom:18px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#e8f5ef}</style></head><body><h1>JSC YDM Attendance Report</h1><p>${members.length} members · ${records.length} records</p>${groups}</body></html>`
    if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 600) { void downloadHtmlPdf(html, 'jsc-ydm-attendance-report.pdf').catch(() => undefined); return }
    const popup = window.open('', '_blank')
    if (!popup) return
    popup.document.write(html); popup.document.close(); setTimeout(() => { popup.focus(); popup.print() }, 150)
  }
  return <button onClick={download} className="secondary-dark-btn justify-center"><Download size={17} /> Export PDF</button>
}
