import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, CalendarDays, Clock3, Search, TrendingUp, Users } from 'lucide-react'
import PageHero from '../components/PageHero'
import { AttendanceRecord, Member } from '../data/memberStore'
import { getAttendance, getLastUpdated, getMembers } from '../data/api'
import memberMaleGif from '../assets/member-male-transparent.png'
import memberFemaleGif from '../assets/member-female-transparent.png'
import noRecordMale from '../assets/no-record-male.png'
import noRecordFemale from '../assets/no-record-female.png'

const formatDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const formatDateTime = (value: string) => new Date(value).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
const memberInitials = (name: string) => name.split(/\s+/u).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
const memberGender = (gender: string): 'female' | 'male' => gender.trim().toLocaleLowerCase() === 'female' ? 'female' : 'male'

export default function Attendance() {
  const [members, setMembers] = useState<Member[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [lastUpdatedValue, setLastUpdatedValue] = useState<string | null>(null)
  const [memberSearch, setMemberSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const [searchNotice, setSearchNotice] = useState('')

  useEffect(() => {
    Promise.all([getMembers(), getAttendance(), getLastUpdated()])
      .then(([savedMembers, savedRecords, updated]) => {
        setMembers(savedMembers)
        setRecords(savedRecords)
        setLastUpdatedValue(updated.value)
      })
      .catch(() => { setMembers([]); setRecords([]); setLastUpdatedValue(null) })
  }, [])

  const month = new Date().toISOString().slice(0, 7)
  const year = month.slice(0, 4)
  const monthRecords = records.filter(record => record.date.startsWith(month))
  const yearRecords = records.filter(record => record.date.startsWith(year))
  const percentage = (items: AttendanceRecord[]) => items.length ? Math.round(items.filter(item => item.present).length / items.length * 100) : 0
  const stats: Array<[string, string, typeof Users]> = [
    ['Active members', String(members.length), Users],
    ['Meetings this month', String(new Set(monthRecords.map(record => record.date)).size), CalendarCheck],
    ['Meetings this year', String(new Set(yearRecords.map(record => record.date)).size), CalendarCheck],
    ['Monthly attendance', `${percentage(monthRecords)}%`, TrendingUp],
    ['Yearly attendance', `${percentage(yearRecords)}%`, TrendingUp],
    ['Last updated', lastUpdatedValue ? formatDateTime(lastUpdatedValue) : 'Not updated yet', Clock3],
  ]

  const searchedMembers = useMemo(() => {
    const search = memberSearch.trim().toLocaleLowerCase()
    if (!search || !fromDate) return []
    return members.filter(member => member.name.toLocaleLowerCase().includes(search)).map(member => {
      const isMemberRecord = (record: AttendanceRecord) => record.memberId === member.id || (!record.memberId && record.name === member.name)
      const matchingRecords = records.filter(record => {
        return isMemberRecord(record) && (toDate ? record.date >= fromDate && record.date <= toDate : record.date === fromDate)
      }).sort((a, b) => b.date.localeCompare(a.date))
      const yearlyRecords = records.filter(record => isMemberRecord(record) && record.date.startsWith(year))
      const present = yearlyRecords.filter(record => record.present).length
      return { member, matchingRecords, present, absent: yearlyRecords.length - present, percentage: percentage(yearlyRecords) }
    })
  }, [fromDate, memberSearch, members, records, toDate, year])

  const runSearch = () => {
    if (!memberSearch.trim() || !fromDate) {
      setHasSearched(false)
      setSearchNotice('Please enter both a member name and a From Date to view attendance records.')
      return
    }
    setSearchNotice('')
    setHasSearched(true)
  }

  const resetSearch = () => {
    setHasSearched(false)
    setSearchNotice('')
  }

  return <>
    <PageHero compact eyebrow="Participation" title="Attendance" description="View member attendance information in one place." icon={<CalendarCheck size={15} />} />
    <section className="attendance-page py-10 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-5 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map(([label, value, Icon]) => <article key={label} className="soft-card p-4 sm:p-5">
            <Icon className="text-emerald-700" size={22} />
            <p className="mt-4 break-words text-2xl font-black leading-tight xl:text-xl">{value}</p>
            <p className="mt-2 text-xs leading-5 text-slate-500">{label}</p>
          </article>)}
        </div>

        <section className="attendance-search-panel mt-8 rounded-3xl border border-emerald-100 bg-white p-5 shadow-[0_18px_45px_rgba(7,31,25,.1)] sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="eyebrow">Find attendance</p><h2 className="mt-2 text-2xl font-black">Search a member&apos;s attendance</h2></div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-6">
            <label className="field-label md:col-span-3">Member name
              <input value={memberSearch} onChange={event => { setMemberSearch(event.target.value); resetSearch() }} className="field member-name-field-3d" placeholder="Search by name" />
            </label>
            <label className="field-label md:col-span-1">From date
              <span className="calendar-control-3d"><input value={fromDate} onChange={event => { setFromDate(event.target.value); resetSearch() }} type="date" className="field" /><CalendarDays aria-hidden="true" size={17} /></span>
            </label>
            <label className="field-label md:col-span-1"><span className="date-label-heading">To date <small>(optional)</small></span>
              <span className="calendar-control-3d"><input value={toDate} min={fromDate || undefined} onChange={event => { setToDate(event.target.value); resetSearch() }} type="date" className="field" /><CalendarDays aria-hidden="true" size={17} /></span>
            </label>
            <button type="button" onClick={runSearch} className="dark-btn search-button-3d self-end md:col-span-1"><Search size={17} /> Search</button>
          </div>
          {searchNotice && <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">{searchNotice}</p>}

          {hasSearched && <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {searchedMembers.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">No member matches this name.</p> : searchedMembers.map(({ member, matchingRecords, present, absent, percentage: annualPercentage }) => <article key={member.id} className="attendance-search-card attendance-member-card overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="attendance-member-banner -m-5 mb-5 grid h-40 place-items-center sm:-m-6 sm:mb-6 sm:h-48">{member.photo ? <img src={member.photo} alt={`${member.name} profile`} className="h-full w-full object-cover" /> : <span>{memberInitials(member.name)}</span>}</div>
              <div>
                <p className="text-center text-xs font-bold uppercase tracking-[.18em] text-emerald-700">{member.role || 'YDM member'}</p>
                <h3 className="mt-2 text-center text-2xl font-black">{member.name}</h3>
                <p className="mt-1 text-center text-sm text-slate-500">{formatDate(fromDate)}{toDate ? ` to ${formatDate(toDate)}` : ''}</p>
              </div>
              <div className="attendance-member-visual mt-5">
                <div className="member-gif-figure">
                  <img src={memberGender(member.gender) === 'female' ? memberFemaleGif : memberMaleGif} alt={`${memberGender(member.gender) === 'female' ? 'Female' : 'Male'} member animation`} />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="attendance-year-chart" style={{ background: `conic-gradient(#059669 0 ${annualPercentage}%, #ef4444 ${annualPercentage}% 100%)` }} aria-label={`${year} attendance: ${annualPercentage}% present`}><span>{annualPercentage}%</span></div>
                  <p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{year} overall</p>
                </div>
              </div>
              <div className="attendance-search-summary mt-5 flex flex-wrap justify-center gap-4 text-xs font-bold"><span className="text-emerald-700">Present: {present}</span><span className="text-rose-600">Absent: {absent}</span></div>
              <div className="mt-5 border-t border-slate-200 pt-4"><p className="mb-3 text-xs font-bold uppercase tracking-[.14em] text-slate-500">Attendance history</p>
                {matchingRecords.length === 0 ? <div className="no-record-3d-panel"><img src={memberGender(member.gender) === 'female' ? noRecordFemale : noRecordMale} alt={`${memberGender(member.gender) === 'female' ? 'Female' : 'Male'} member has no attendance record`} /><div><p className="text-sm font-black text-white">No attendance record found</p><p className="mt-1 text-xs leading-5 text-white/65">There is no saved attendance for the selected date range.</p></div></div> : <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">{matchingRecords.map(record => <div key={record.id} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold ${record.present ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700'}`}><span>{formatDate(record.date)}</span><span>{record.present ? 'Present' : 'Absent'}</span></div>)}</div>}
              </div>
            </article>)}
          </div>}
        </section>
      </div>
    </section>
  </>
}
