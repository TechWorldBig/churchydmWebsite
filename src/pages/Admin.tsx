import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, Check, Download, LockKeyhole, Pencil, Plus, Search, ShieldCheck, Trash2, UserCog, UserPlus, X } from 'lucide-react'
import PageHero from '../components/PageHero'
import { AttendanceRecord, Member } from '../data/memberStore'
import { createAttendance, createMember, deleteAttendance, deleteMember, getAttendance, getMembers, updateAttendance, updateMember } from '../data/api'
import { clearAdminSession, getAdminSession, startAdminSession } from '../data/adminSession'
import AdminProgramPoints from '../components/AdminProgramPoints'
import AdminMemberExport from '../components/AdminMemberExport'
import AdminGallery from './AdminGallery'
import AdminAttendanceExport from '../components/AdminAttendanceExport'
import AdminVisitorStats from '../components/AdminVisitorStats'
import AdminAuditLogs from '../components/AdminAuditLogs'
import AdminReports from '../components/AdminReports'
import AdminWeeklyPrograms from '../components/WeeklyPrograms'
import { currentYearDateBounds, todayDate } from '../data/dateBounds'

const emptyMember: Omit<Member, 'id'> = { name: '', role: '', email: '', phone: '', address: '', gender: '', seniority: '', dateOfBirth: '', focus: '', photo: '' }
const uniqueMembers = (items: Member[]) => Array.from(new Map(items.map(item => [item.name.trim().toLowerCase(), item])).values()).sort((a, b) => a.name.localeCompare(b.name))
const uniqueRecords = (items: AttendanceRecord[]) => Array.from(new Map(items.map(item => [`${item.memberId}-${item.date}`, item])).values())

export default function Admin() {
  const [isAuthed, setIsAuthed] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [expiresAt, setExpiresAt] = useState(0)
  const [loginMessage, setLoginMessage] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('')
  const [members, setMembers] = useState<Member[]>([]); const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [member, setMember] = useState(emptyMember); const [editingId, setEditingId] = useState<string | null>(null)
  const [memberId, setMemberId] = useState(''); const [date, setDate] = useState(todayDate())
  const [note, setNote] = useState(''); const [status, setStatus] = useState<'present' | 'absent'>('present')
  const [memberMessage, setMemberMessage] = useState(''); const [attendanceMessage, setAttendanceMessage] = useState('')
  const [query, setQuery] = useState(''); const [loading, setLoading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const loadData = () => {
    setLoading(true)
    return Promise.all([getMembers(), getAttendance()]).then(([savedMembers, savedRecords]) => { setMembers(uniqueMembers(savedMembers)); setRecords(uniqueRecords(savedRecords)) }).catch(() => { setMemberMessage('Could not connect to the database. Check Vercel DATABASE_URL.'); setAttendanceMessage('Could not connect to the database. Check Vercel DATABASE_URL.') }).finally(() => setLoading(false))
  }
  useEffect(() => {
    void getAdminSession().then(session => { setIsAuthed(session.authenticated); setExpiresAt(session.expiresAt || 0) }).catch(() => setIsAuthed(false)).finally(() => setCheckingSession(false))
    const expire = () => { setIsAuthed(false); setLoginMessage('Your session expired. Please sign in again.') }
    window.addEventListener('ydm-session-expired', expire)
    return () => window.removeEventListener('ydm-session-expired', expire)
  }, [])
  useEffect(() => { if (isAuthed) void loadData() }, [isAuthed])
  useEffect(() => {
    if (!isAuthed) return
    const remaining = expiresAt - Date.now()
    if (remaining <= 0) { setIsAuthed(false); return }
    const timer = window.setTimeout(() => { setIsAuthed(false) }, remaining)
    return () => window.clearTimeout(timer)
  }, [isAuthed, expiresAt])
  const filtered = useMemo(() => { const term = query.toLowerCase(); return records.filter(record => record.name.toLowerCase().includes(term) || record.date.includes(term)) }, [records, query])
  const yearBounds = currentYearDateBounds()
  const updateMemberField = (key: keyof typeof emptyMember, value: string) => setMember(current => ({ ...current, [key]: value }))
  const uploadPhoto = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 2_000_000 || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) { setMemberMessage('Choose a JPG, PNG, WebP or GIF image under 2 MB.'); return }; const reader = new FileReader(); reader.onload = () => updateMemberField('photo', String(reader.result)); reader.readAsDataURL(file) }

  const saveMember = async () => {
    if (!member.name.trim()) { setMemberMessage('Enter a member name first.'); return }
    if (members.some(item => item.id !== editingId && item.name.trim().toLowerCase() === member.name.trim().toLowerCase())) { setMemberMessage('This member is already saved.'); return }
    const next: Member = { id: editingId || crypto.randomUUID(), ...member, name: member.name.trim(), role: member.role.trim() || 'YDM Member' }
    try { if (editingId) await updateMember(next); else await createMember(next); setMembers(current => editingId ? current.map(item => item.id === editingId ? next : item) : [next, ...current]); setMember(emptyMember); setEditingId(null); setMemberMessage('Member saved successfully.') }
    catch { setMemberMessage('Could not save member. Check the database connection.') }
  }
  const removeMember = async (id: string) => { try { await deleteMember(id); setMembers(current => current.filter(item => item.id !== id)); setRecords(current => current.filter(record => record.memberId !== id)); setMemberMessage('Member removed successfully.') } catch { setMemberMessage('Could not remove member. Check the database connection.') } }
  const addAttendance = async () => {
    const selected = members.find(item => item.id === memberId); if (!selected) { setAttendanceMessage('Select a member before adding attendance.'); return }
    const existing = records.find(record => record.memberId === selected.id && record.date === date)
    const record: AttendanceRecord = { id: existing?.id || crypto.randomUUID(), memberId: selected.id, name: selected.name, date, present: status === 'present', note: note.trim() }
    try { await createAttendance(record); setRecords(current => existing ? current.map(item => item.id === existing.id ? record : item) : [record, ...current]); setNote(''); setAttendanceMessage('Attendance saved successfully.') } catch { setAttendanceMessage('Could not save attendance. Check the database connection.') }
  }
  const toggleAttendance = async (record: AttendanceRecord) => { const updated = { ...record, present: !record.present }; try { await updateAttendance(updated); setRecords(current => current.map(item => item.id === record.id ? updated : item)); setAttendanceMessage('Attendance updated successfully.') } catch { setAttendanceMessage('Could not update attendance. Check the database connection.') } }
  const removeAttendance = async (id: string) => { try { await deleteAttendance(id); setRecords(current => current.filter(record => record.id !== id)); setAttendanceMessage('Attendance removed successfully.') } catch { setAttendanceMessage('Could not remove attendance. Check the database connection.') } }
  const exportCsv = () => { const rows = [['Name', 'Date', 'Status', 'Note'], ...records.map(record => [record.name, record.date, record.present ? 'Present' : 'Absent', record.note])]; const csv = rows.map(row => row.map(value => `"${String(value).replace(/^[=+@-]/u, "'$&").replaceAll('"', '""')}"`).join(',')).join('\n'); const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); link.download = 'jsc-ydm-attendance.csv'; link.click(); URL.revokeObjectURL(link.href) }
  const handleLogin = async () => {
    if (signingIn) return
    setSigningIn(true); setLoginMessage('')
    try {
      const session = await startAdminSession(username, password)
      setIsAuthed(session.authenticated); setExpiresAt(session.expiresAt || 0); setUsername(''); setPassword('')
    } catch (error) { setLoginMessage(error instanceof Error ? error.message : 'Sign-in failed.') }
    finally { setSigningIn(false) }
  }
  const handleLogout = async () => {
    try { await clearAdminSession(); setIsAuthed(false) }
    catch { setMemberMessage('Could not sign out. Please try again.') }
  }
  if (checkingSession) return <section className="px-4 pb-20 pt-32"><p role="status" className="text-center">Checking your session...</p></section>

  if (!isAuthed) return <section className="admin-login min-h-[70svh] px-4 pb-20 pt-32 sm:px-5 sm:pt-40"><div className="mx-auto max-w-md"><div className="soft-card border border-emerald-100 shadow-lg"><div className="mb-6 flex items-center gap-3"><span className="icon-box"><ShieldCheck size={20} /></span><div><p className="eyebrow">Admin access</p><h1 className="mt-1 text-2xl font-black">Sign in to continue</h1></div></div><div className="grid gap-4"><label className="field-label">Username<input value={username} onChange={event => setUsername(event.target.value)} className="field" autoComplete="username" /></label><label className="field-label">Password<input value={password} onChange={event => setPassword(event.target.value)} type="password" className="field" autoComplete="current-password" onKeyDown={event => event.key === 'Enter' && handleLogin()} /></label><button disabled={signingIn} onClick={() => void handleLogin()} className="primary-btn justify-center"><LockKeyhole size={17} /> {signingIn ? 'Signing in...' : 'Enter admin area'}</button>{loginMessage && <p role="alert" className="text-sm text-rose-700">{loginMessage}</p>}</div></div></div></section>

  return <><PageHero eyebrow="Administration" title="Member and attendance management" description="Add complete member profiles, upload photos, and manage attendance records from one place." icon={<UserCog size={15} />} /><section className="admin-page py-10 sm:py-16"><div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8"><div className="mb-5 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">{loading ? 'Loading shared data...' : 'Connected to shared database'}</p><button onClick={() => void handleLogout()} className="self-end rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 sm:self-auto">Log out</button></div><div className="grid min-w-0 gap-5 lg:grid-cols-[420px_1fr]">
    <aside className="soft-card h-fit"><div className="mb-6 flex items-center gap-3"><span className="icon-box"><UserPlus size={20} /></span><div><h2 className="font-black">{editingId ? 'Edit member' : 'Add member'}</h2><p className="text-xs text-slate-500">All details appear in Attendance</p></div></div><div className="grid gap-3"><label className="field-label">Full name<input value={member.name} onChange={event => updateMemberField('name', event.target.value)} className="field" placeholder="Member name" /></label><label className="field-label">Role<input value={member.role} onChange={event => updateMemberField('role', event.target.value)} className="field" placeholder="e.g. Youth Leader" /></label><label className="field-label">Seniority level<select value={member.seniority} onChange={event => updateMemberField('seniority', event.target.value as Member['seniority'])} className="field"><option value="">Select seniority</option><option value="Kutties">Kutties</option><option value="Junior">Junior</option><option value="Senior">Senior</option></select></label><div className="grid gap-3 sm:grid-cols-2"><label className="field-label">Email<input type="email" value={member.email} onChange={event => updateMemberField('email', event.target.value)} className="field" /></label><label className="field-label">Phone<input value={member.phone} onChange={event => updateMemberField('phone', event.target.value)} className="field" /></label></div><label className="field-label">Gender<select value={member.gender} onChange={event => updateMemberField('gender', event.target.value)} className="field"><option value="">Select gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option><option value="Prefer not to say">Prefer not to say</option></select></label><label className="field-label">Date of birth<input type="date" value={member.dateOfBirth} onChange={event => updateMemberField('dateOfBirth', event.target.value)} className="field" /></label><label className="field-label">Address<input value={member.address} onChange={event => updateMemberField('address', event.target.value)} className="field" /></label><label className="field-label">About / ministry focus<textarea value={member.focus} onChange={event => updateMemberField('focus', event.target.value)} className="field min-h-20 resize-none" /></label><label className="field-label">Profile photo<input ref={photoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadPhoto} className="field file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-bold file:text-emerald-700" /></label>{member.photo && <div className="flex items-center gap-3"><img src={member.photo} alt="Selected profile" className="h-24 w-24 rounded-2xl object-cover" /><button type="button" onClick={() => { updateMemberField('photo', ''); if (photoInputRef.current) photoInputRef.current.value = '' }} className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">Remove photo</button></div>}<div className="flex gap-2"><button onClick={saveMember} className="primary-btn flex-1 justify-center"><Plus size={17} /> {editingId ? 'Save changes' : 'Add member'}</button>{editingId && <button onClick={() => { setEditingId(null); setMember(emptyMember); if (photoInputRef.current) photoInputRef.current.value = '' }} className="secondary-dark-btn">Cancel</button>}</div>{memberMessage && <p className="text-sm text-emerald-700">{memberMessage}</p>}</div></aside>
    <div className="grid min-w-0 gap-5"><div className="soft-card"><div className="mb-5 flex items-center gap-3"><span className="icon-box"><CalendarDays size={20} /></span><div><h2 className="font-black">Add attendance</h2><p className="text-xs text-slate-500">Choose a saved member and status</p></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_150px_120px]"><select aria-label="Attendance member" value={memberId} onChange={event => setMemberId(event.target.value)} className="field"><option value="">Select member</option>{members.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input aria-label="Attendance date" min={yearBounds.min} max={yearBounds.max} value={date} onChange={event => setDate(event.target.value)} type="date" className="field" /><select aria-label="Attendance status" value={status} onChange={event => setStatus(event.target.value as 'present' | 'absent')} className="field"><option value="present">Present</option><option value="absent">Absent</option></select><input value={note} onChange={event => setNote(event.target.value)} className="field" placeholder="Optional note" /><button onClick={() => void addAttendance()} className="primary-btn justify-center">Save <Plus size={17} /></button></div>{attendanceMessage && <p className="mt-3 text-sm font-semibold text-emerald-700">{attendanceMessage}</p>}</div>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={query} onChange={event => setQuery(event.target.value)} className="w-full rounded-xl bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none ring-emerald-700 focus:ring-2" placeholder="Search attendance" /></div><AdminAttendanceExport members={members} records={records} /><button onClick={exportCsv} className="secondary-dark-btn justify-center"><Download size={17} /> Export CSV</button></div><div className="overflow-x-auto" tabIndex={0} aria-label="Attendance records table. Swipe or use Shift and mouse wheel to view all columns."><table className="w-full min-w-[620px] text-left"><thead className="bg-slate-50 text-xs uppercase tracking-[.12em] text-slate-500"><tr><th className="px-5 py-4">Member</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Note</th><th className="px-5 py-4 text-right">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{filtered.length === 0 ? <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-400">No attendance records yet.</td></tr> : filtered.map(record => <tr key={record.id} className="text-sm"><td className="px-5 py-4 font-bold">{record.name}</td><td className="px-5 py-4 text-slate-500">{record.date}</td><td className="px-5 py-4"><button onClick={() => void toggleAttendance(record)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${record.present ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{record.present ? <Check size={13} /> : <X size={13} />} {record.present ? 'Present' : 'Absent'}</button></td><td className="max-w-[220px] truncate px-5 py-4 text-slate-500">{record.note || '—'}</td><td className="px-5 py-4 text-right"><button aria-label={`Delete attendance for ${record.name}`} onClick={() => void removeAttendance(record.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={17} /></button></td></tr>)}</tbody></table></div></div>
      <div className="soft-card"><h2 className="mb-4 font-black">Saved members ({members.length})</h2><div className="grid gap-3 sm:grid-cols-2">{members.map(item => <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">{item.photo ? <img src={item.photo} alt="" className="h-12 w-12 rounded-xl object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#071f19] font-black text-[#e3bc62]">{item.name.slice(0, 2).toUpperCase()}</div>}<div className="min-w-0 flex-1"><p className="truncate font-bold">{item.name}</p><p className="truncate text-xs text-slate-500">{item.role}</p></div><button aria-label={`Edit member ${item.name}`} onClick={() => { const { id: _id, ...details } = item; setMember(details); setEditingId(item.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-emerald-700"><Pencil size={16} /></button><button aria-label={`Delete member ${item.name}`} onClick={() => void removeMember(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-rose-600"><Trash2 size={16} /></button></div>)}</div>{members.length === 0 && <p className="text-sm text-slate-500">Add your first member using the form.</p>}</div>
    </div>
  </div><AdminVisitorStats /><AdminAuditLogs /><AdminMemberExport /><AdminReports /><AdminProgramPoints /><AdminWeeklyPrograms /><AdminGallery /></div></section></>
}
