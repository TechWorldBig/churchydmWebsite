import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Search, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { WeeklyProgramPublic } from '../components/WeeklyPrograms'
import { programs } from '../data/siteData'
import { getMembers, getProgramPoints } from '../data/api'
import { Member, ProgramPoint } from '../data/memberStore'
import { currentYearDateBounds } from '../data/dateBounds'
import { formatMeetingDate, formatPercentage, summarizeProgramPoints } from '../data/programPoints'
import holyBibleGif from '../assets/holy-bible.gif'
import missionaryStoryWebp from '../assets/missionary-story.webp'
import musicGif from '../assets/music.gif'
import bibleQuizPng from '../assets/bible-quiz.png'
import bibleMessageGif from '../assets/bible-message-transparent.png'
import memberMaleGif from '../assets/member-male.gif'
import memberFemaleGif from '../assets/member-female.gif'

const scoreStyle = (score: number) => ({ background: `conic-gradient(#0b9f72 ${(score / 5) * 100}%, #e5484d 0)` })

export default function Programs() {
  const yearBounds = currentYearDateBounds()
  const [members, setMembers] = useState<Member[]>([])
  const [points, setPoints] = useState<ProgramPoint[]>([])
  const [name, setName] = useState('')
  const [program, setProgram] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [searched, setSearched] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => { void getMembers().then(setMembers).catch(() => undefined) }, [])
  useEffect(() => { if (!name.trim() || !from || (to && to < from)) { setPoints([]); return }; void getProgramPoints({ name, program, from, to }).then(setPoints).catch(() => setPoints([])) }, [name, program, from, to])
  const result = useMemo(() => { const member = members.find(item => item.name.trim().toLowerCase() === name.trim().toLowerCase()); return member ? { member, rows: points } : null }, [members, points, name])
  const summaries = useMemo(() => summarizeProgramPoints(result?.rows || []), [result])
  const search = () => { if (!name.trim() || !from) { setNotice('Member name and From date are required. To date is optional.'); setSearched(false); return }; if (to && to < from) { setNotice('To date must be on or after the From date.'); setSearched(false); return }; setNotice(''); setSearched(true) }

  return (
    <>
      <PageHero eyebrow="The Word. The worship. The walk." title="Programs rooted in Scripture" description="Meet with us during the 1st and 3rd weeks of every month to study the Bible, celebrate the gospel, learn from faithful servants and grow closer to Christ." icon={<Sparkles size={15} />} />
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {programs.map(item => {
              const image = item.id === 1 ? holyBibleGif : item.id === 2 ? missionaryStoryWebp : item.id === 3 ? musicGif : item.id === 4 ? bibleQuizPng : bibleMessageGif
              const attachedSymbol = item.id === 4 || item.id === 5
              return <article key={item.id} className="soft-card group relative overflow-hidden"><span className="absolute right-6 top-5 text-5xl font-black text-emerald-700">{item.icon}</span><span className={`program-bible-icon relative ${attachedSymbol ? 'program-symbol-attached' : ''}`}><img src={image} alt={item.title} /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">{item.schedule}</p><h2 className="mt-2 text-2xl font-black">{item.title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p></article>
            })}
          </div>
          <WeeklyProgramPublic />
          <section className="attendance-search-panel mt-12 rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-8">
            <p className="eyebrow">Program points</p><h2 className="mt-2 text-3xl font-black">Search a member’s program points</h2>
            <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5"><label className="grid gap-1 text-xs font-bold text-slate-500">Member name<input aria-label="Member name" className="field program-filter-field-3d" value={name} onChange={event => setName(event.target.value)} placeholder="Member name" /></label><label className="grid gap-1 text-xs font-bold text-slate-500">Program<select aria-label="Program name" className="field program-filter-field-3d" value={program} onChange={event => setProgram(event.target.value)}><option value="">All programs</option><option>Bible Reference</option><option>Bible Quiz</option><option>Song Survey</option></select></label><label className="grid gap-1 text-xs font-bold text-slate-500">From date<input aria-label="From date" min={yearBounds.min} max={yearBounds.max} className="field program-filter-field-3d" type="date" value={from} onChange={event => setFrom(event.target.value)} /></label><label className="grid gap-1 text-xs font-bold text-slate-500">To date<input aria-label="To date" min={yearBounds.min} max={yearBounds.max} className="field program-filter-field-3d" type="date" value={to} onChange={event => setTo(event.target.value)} /></label><button className="dark-btn search-button-3d self-end" type="button" onClick={search}><Search size={17} /> Search</button></div>
            {notice && <p className="mt-3 text-sm font-semibold text-rose-600">{notice}</p>}
            {searched && !result && <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No exact saved member name matched. Enter the member name exactly as it appears in the YDM member list.</p>}
            {searched && result && <div className="program-result-card mt-7 rounded-3xl bg-slate-50 p-5"><div className="program-result-identity"><div className="member-gif-figure program-result-character"><img src={result.member.gender?.toLowerCase() === 'female' ? memberFemaleGif : memberMaleGif} alt="Member illustration" /></div><div><p className="eyebrow">{result.member.seniority || 'Member'}</p><h3 className="mt-2 text-2xl font-black">{result.member.name}</h3><p className="text-sm text-slate-500">{result.member.role}</p></div></div>{!summaries.length ? <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-5"><p className="font-black text-slate-900">{to ? 'No program points found in this date range.' : 'No points recorded through today.'}</p><p className="mt-2 text-sm leading-6 text-slate-600">Keep attending, participating, and giving your best. Every meeting is a new opportunity to grow your points.</p></div> : <div className="mt-5 grid gap-4">{summaries.map(summary => <article key={summary.program} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Program summary</p><h4 className="mt-1 text-xl font-black">{summary.program}</h4></div><div className="rounded-xl bg-emerald-50 px-3 py-2 text-right"><p className="text-xs font-bold uppercase tracking-[.12em] text-emerald-700">Overall</p><p className="text-lg font-black text-emerald-900">{formatPercentage(summary.overallPercentage)}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Total points</p><p className="mt-1 font-black">{summary.totalPoints} / {summary.maximumPoints}</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Meetings</p><p className="mt-1 font-black">{summary.rows.length}</p></div><div className="col-span-2 rounded-xl bg-slate-50 p-3 sm:col-span-1"><p className="text-xs text-slate-500">Range</p><p className="mt-1 font-black">{from} – {to || 'Today'}</p></div></div><div className="mt-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">Points history</p><div className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-100">{summary.rows.map(row => <div key={row.id} className="flex items-center justify-between gap-3 px-3 py-3"><div><p className="font-bold">{formatMeetingDate(row.date)}</p><p className="text-xs text-slate-500">Meeting</p></div><div className="program-score-ring h-12 w-12 text-xs" style={scoreStyle(row.questionsAnswered)}><span className="h-9 w-9 text-xs">{row.questionsAnswered}/5</span></div></div>)}</div></div></article>)}</div>}</div>}
          </section>
          <div className="mt-12 flex items-center justify-between rounded-3xl bg-[#071f19] p-8 text-white"><div><p className="eyebrow text-[#e3bc62]">Find your place</p><h2 className="mt-2 text-3xl font-black">Grow with us.</h2></div><Link to="/about" className="primary-btn">Learn about us <ArrowRight size={17} /></Link></div>
        </div>
      </section>
    </>
  )
}
