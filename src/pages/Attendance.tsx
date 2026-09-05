import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CheckCircle2, Clock3, Mail, Phone, TrendingUp, Users } from 'lucide-react'
import PageHero from '../components/PageHero'
import { AttendanceRecord, Member } from '../data/memberStore'
import { getAttendance, getLastUpdated, getMembers } from '../data/api'

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const formatDateTime = (value: string) => new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function Attendance() {
  const [members, setMembers] = useState<Member[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [lastUpdatedValue, setLastUpdatedValue] = useState<string | null>(null)
  useEffect(() => {
    Promise.all([getMembers(), getAttendance(), getLastUpdated()]).then(([savedMembers, savedRecords, updated]) => {
      setMembers(savedMembers)
      setRecords(savedRecords)
      setLastUpdatedValue(updated.value)
    }).catch(() => { setMembers([]); setRecords([]); setLastUpdatedValue(null) })
  }, [])
  const month = new Date().toISOString().slice(0, 7)
  const year = month.slice(0, 4)
  const monthRecords = records.filter(record => record.date.startsWith(month))
  const yearRecords = records.filter(record => record.date.startsWith(year))
  const meetingCount = new Set(monthRecords.map(record => record.date)).size
  const yearlyMeetingCount = new Set(yearRecords.map(record => record.date)).size
  const monthlyAttendance = monthRecords.length ? Math.round((monthRecords.filter(record => record.present).length / monthRecords.length) * 100) : 0
  const yearlyAttendance = yearRecords.length ? Math.round((yearRecords.filter(record => record.present).length / yearRecords.length) * 100) : 0
  const lastUpdated = lastUpdatedValue ? formatDateTime(lastUpdatedValue) : 'Not updated yet'
  const stats: Array<[string, string, typeof Users]> = [
    ['Active members', String(members.length), Users],
    ['Meetings this month', String(meetingCount), CalendarCheck],
    ['Meetings this year', String(yearlyMeetingCount), CalendarCheck],
    ['Monthly attendance', `${monthlyAttendance}%`, TrendingUp],
    ['Yearly attendance', `${yearlyAttendance}%`, TrendingUp],
    ['Last updated', lastUpdated, Clock3],
  ]

  const memberRows = useMemo(() => members.map(member => {
    const memberRecords = records.filter(record => record.memberId === member.id || (!record.memberId && record.name === member.name)).sort((a, b) => b.date.localeCompare(a.date))
    const present = memberRecords.filter(record => record.present).length
    return { member, memberRecords, present, lastDate: memberRecords[0] ? formatDate(memberRecords[0].date) : 'No record' }
  }), [members, records])

  return <><PageHero compact eyebrow="Participation" title="Attendance" description="View member profiles and their attendance information in one place." icon={<CalendarCheck size={15} />} /><section className="attendance-page py-10 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{stats.map(([label, value, Icon]) => <article key={label} className="soft-card p-4 sm:p-5"><Icon className="text-emerald-700" size={22}/><p className="mt-4 break-words text-2xl font-black leading-tight xl:text-xl">{value}</p><p className="mt-2 text-xs leading-5 text-slate-500">{label}</p></article>)}</div>
    {memberRows.length === 0 ? <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Member profiles added by the administrator will appear here.</div> : <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{memberRows.map(({ member, memberRecords, present, lastDate }) => <article key={member.id} className="soft-card overflow-hidden p-0">{member.photo ? <img src={member.photo} alt={member.name} className="h-56 w-full object-cover" /> : <div className="grid h-56 place-items-center bg-[#071f19] text-5xl font-black text-[#e3bc62]">{member.name.slice(0, 2).toUpperCase()}</div>}<div className="p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">{member.role}</p><h2 className="mt-2 text-2xl font-black">{member.name}</h2>{member.focus && <p className="mt-3 text-sm leading-6 text-slate-600">{member.focus}</p>}<div className="mt-5 grid gap-2 border-t border-slate-100 pt-4 text-sm text-slate-500">{member.email && <p className="flex items-center gap-2"><Mail size={15} /> {member.email}</p>}{member.phone && <p className="flex items-center gap-2"><Phone size={15} /> {member.phone}</p>}{member.address && <p>{member.address}</p>}{member.dateOfBirth && <p>Date of birth: {member.dateOfBirth}</p>}</div><div className="mt-5 flex items-end justify-between rounded-2xl bg-slate-50 p-4"><div><p className="text-xs uppercase tracking-[.12em] text-slate-500">Attendance</p><p className="mt-1 text-xl font-black text-emerald-700">{present}/{memberRecords.length || 0} present</p></div><p className="text-right text-xs text-slate-500">Last: {lastDate}</p></div>{memberRecords.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4"><p className="mb-3 text-xs font-bold uppercase tracking-[.12em] text-slate-500">Attendance history</p><div className="grid max-h-48 gap-2 overflow-y-auto pr-1">{memberRecords.map(record => <div key={record.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-sm"><span className="text-slate-600">{formatDate(record.date)}</span><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.present ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{record.present ? 'Present' : 'Absent'}</span></div>)}</div></div>}</div></article>)}</div>}
    <div className="mt-10 grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-3xl bg-[#071f19] p-8 text-white"><p className="eyebrow text-[#e3bc62]">Why attendance matters</p><h2 className="mt-3 text-3xl font-black">Presence helps us care better.</h2><p className="mt-4 max-w-xl leading-8 text-white/60">Attendance helps us understand participation, follow up with youth who may need encouragement, and improve planning for gatherings and activities.</p></div><div className="soft-card"><CheckCircle2 className="text-emerald-700" /><h3 className="mt-5 text-xl font-black">Member details</h3><p className="mt-3 text-sm leading-7 text-slate-600">Profiles and attendance summaries are published here from the administrator’s member register.</p></div></div>
  </div></section></>
}
