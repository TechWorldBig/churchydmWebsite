import { useEffect, useState } from 'react'
import { Download } from 'lucide-react'
import { getMembers } from '../data/api'
import { Member } from '../data/memberStore'

const esc = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const roleRank = (role: string) => {
  const normalized = role.trim().toLowerCase()
  if (normalized.includes('ydm president') && !normalized.includes('vice')) return 0
  if (normalized.includes('vice president')) return 1
  if (normalized.includes('ydm member')) return 3
  return 2
}
const seniorityRank = (seniority: Member['seniority']) => seniority === 'Senior' ? 0 : seniority === 'Junior' ? 1 : 2
const orderedMembers = (members: Member[]) => [...members].sort((a, b) => roleRank(a.role) - roleRank(b.role) || seniorityRank(a.seniority) - seniorityRank(b.seniority) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
const report = (members: Member[]) => `<html><head><meta charset="utf-8"><title>JSC YDM Member Details</title><style>body{font-family:Arial;padding:24px;color:#071f19}h1{color:#087f5b}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #cbd5e1;padding:7px;text-align:left}th{background:#e8f5ef}</style></head><body><h1>JSC YDM Member Details</h1><p>Private administrator report</p><table><thead><tr><th>Name</th><th>Role</th><th>Seniority</th><th>Gender</th><th>Email</th><th>Phone</th><th>Address</th><th>Date of birth</th><th>Focus</th></tr></thead><tbody>${members.map(m => `<tr><td>${esc(m.name)}</td><td>${esc(m.role)}</td><td>${esc(m.seniority || '')}</td><td>${esc(m.gender)}</td><td>${esc(m.email)}</td><td>${esc(m.phone)}</td><td>${esc(m.address)}</td><td>${esc(m.dateOfBirth)}</td><td>${esc(m.focus)}</td></tr>`).join('')}</tbody></table></body></html>`

export default function AdminMemberExport() {
  const [members, setMembers] = useState<Member[]>([]); const [format, setFormat] = useState('pdf'); const [message, setMessage] = useState('')
  useEffect(() => { void getMembers().then(setMembers).catch(() => setMessage('Could not load member data.')) }, [])
  const download = () => { if (!members.length) { setMessage('No saved members to download.'); return }; const html = report(orderedMembers(members)); if (format === 'word') { const url = URL.createObjectURL(new Blob([html], { type: 'application/msword' })); const link = document.createElement('a'); link.href = url; link.download = 'jsc-ydm-member-details.doc'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return }; const url = URL.createObjectURL(new Blob([html], { type: 'text/html' })); const printWindow = window.open(url, '_blank'); if (!printWindow) { URL.revokeObjectURL(url); setMessage('Please allow pop-ups to create the PDF.'); return }; printWindow.addEventListener('load', () => { printWindow.focus(); printWindow.print(); setTimeout(() => URL.revokeObjectURL(url), 1000) }) }
  return <section className="soft-card admin-member-export mt-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-black">Download member details</h2><p className="mt-1 text-sm text-slate-500">Private Admin report · {members.length} saved members</p></div><div className="flex flex-wrap gap-2"><select aria-label="Download format" className="field" value={format} onChange={event => setFormat(event.target.value)}><option value="pdf">PDF</option><option value="word">Word</option></select><button className="primary-btn" onClick={download}><Download size={17} /> Download</button></div></div>{message && <p className="mt-3 text-sm text-rose-700">{message}</p>}</section>
}
