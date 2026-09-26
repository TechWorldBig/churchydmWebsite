import { useEffect, useMemo, useState } from 'react'
import { Download, Languages, RefreshCw, ScrollText } from 'lucide-react'
import { getAttendance, getGallery, getMembers, getProgramPoints, getWeeklyPrograms } from '../data/api'
import { downloadHtmlPdf } from '../data/pdf'
import type { AttendanceRecord, GalleryPhoto, Member, ProgramPoint, WeeklyProgram } from '../data/memberStore'

type Language = 'en' | 'ta'
type SpeechKind = 'welcome' | 'thanks'
type AnnualData = { members: Member[]; attendance: AttendanceRecord[]; points: ProgramPoint[]; gallery: GalleryPhoto[]; weekly: WeeklyProgram[] }
const emptyData: AnnualData = { members: [], attendance: [], points: [], gallery: [], weekly: [] }
const currentYear = String(new Date().getFullYear())
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)
const unique = (items: string[]) => [...new Set(items.map(item => item.trim()).filter(Boolean))]
const joinNames = (items: string[], fallback: string) => items.length ? items.join(', ') : fallback

function yearlySnapshot(data: AnnualData, year: string) {
  const prefix = `${year}-`
  const attendance = data.attendance.filter(row => row.date.startsWith(prefix))
  const points = data.points.filter(row => row.date.startsWith(prefix))
  const gallery = data.gallery.filter(row => row.date.startsWith(prefix))
  const weekly = data.weekly.filter(row => row.date.startsWith(prefix))
  const leaders = data.members.filter(member => { const role = member.role.toLowerCase(); return role && !role.includes('member') && !role.includes('children') })
  return {
    memberCount: data.members.length,
    leaders,
    meetingCount: new Set(attendance.map(row => row.date)).size,
    presentCount: attendance.filter(row => row.present).length,
    absentCount: attendance.filter(row => !row.present).length,
    participantCount: new Set([...attendance.map(row => row.memberId), ...points.map(row => row.memberId), ...weekly.map(row => row.memberId)]).size,
    answerCount: points.reduce((sum, row) => sum + row.questionsAnswered, 0),
    programs: unique(points.map(row => row.program)),
    weeklyPrograms: unique(weekly.map(row => row.programName)),
    eventHighlights: unique(gallery.map(row => row.description)),
  }
}

function createSpeech(kind: SpeechKind, language: Language, year: string, snapshot: ReturnType<typeof yearlySnapshot>) {
  const leaderNames = joinNames(snapshot.leaders.map(member => `${member.name} (${member.role})`), language === 'en' ? 'our ministry leaders' : 'எங்கள் ஊழியத் தலைவர்கள்')
  const programs = joinNames(snapshot.programs, language === 'en' ? 'Bible-centred learning activities' : 'வேதாகம மையமான கற்றல் நிகழ்ச்சிகள்')
  const weekly = joinNames(snapshot.weeklyPrograms, language === 'en' ? 'weekly worship and fellowship programs' : 'வாராந்திர ஆராதனை மற்றும் ஐக்கிய நிகழ்ச்சிகள்')
  const events = joinNames(snapshot.eventHighlights, language === 'en' ? 'our fellowship and ministry events' : 'எங்கள் ஐக்கிய மற்றும் ஊழிய நிகழ்வுகள்')
  if (language === 'ta') {
    if (kind === 'welcome') return `கர்த்தருடைய பரிசுத்த நாமத்திற்கு மகிமை உண்டாவதாக! இயேசு கிறிஸ்துவின் இனிய நாமத்தில் மதிப்பிற்குரிய போதகர், YDM தலைவர், ஊழியப் பொறுப்பாளர்கள், பெற்றோர்கள் மற்றும் அன்பான இளைஞர்கள் அனைவரையும் ${year} ஆம் ஆண்டின் இந்த ஆசீர்வாதமான கூடுகைக்கு அன்புடன் வரவேற்கிறேன்.

“ஆவியினாலே அனலாயிருந்து, கர்த்தருக்கு ஊழியஞ்செய்யுங்கள்” என்ற ரோமர் 12:11 வசனத்தின்படி, ஜெபம், தேவவசனம், பரிசுத்த ஆவியின் வழிநடத்துதல் மற்றும் அன்பின் ஐக்கியத்தில் இந்த ஆண்டைத் தொடங்குகிறோம்.

எங்கள் Youth Divine Movement குடும்பத்தில் ${snapshot.memberCount} உறுப்பினர்கள் உள்ளனர். ${leaderNames} ஆகியோரின் அர்ப்பணிப்பான வழிநடத்துதலுக்காக தேவனை ஸ்தோத்திரிக்கிறோம். பதிவுகளின்படி ${snapshot.participantCount} பேர் ஊழியச் செயல்பாடுகளில் பங்கேற்றுள்ளனர்; ${snapshot.meetingCount} கூடுகை நாட்களில் ${snapshot.presentCount} வருகைப் பதிவுகள் செய்யப்பட்டுள்ளன.

${programs} போன்ற வேதாகம நிகழ்ச்சிகளின் மூலம் மொத்தம் ${snapshot.answerCount} பதில்கள் பதிவு செய்யப்பட்டுள்ளன. ${weekly} ஆகிய வாராந்திர நிகழ்ச்சிகளும், ${events} போன்ற நிகழ்வுகளும் நமது ஐக்கியத்தை வளப்படுத்தின.

இந்த ஆண்டில் ஒவ்வொரு இளைஞரும் பரிசுத்த ஆவியின் வல்லமையால் நிரப்பப்பட்டு, கிறிஸ்துவில் வளர்ந்து, சபைக்கும் சமுதாயத்திற்கும் சாட்சியாக வாழ ஜெபிப்போம். உங்கள் அனைவரையும் மீண்டும் அன்புடன் வரவேற்கிறேன். கர்த்தர் நம்மை ஆசீர்வதிப்பாராக. ஆமென்.`
    return `கர்த்தருடைய பரிசுத்த நாமத்திற்கு மகிமை உண்டாவதாக! இந்த ${year} ஆம் ஆண்டின் ஊழியப் பயணத்தை ஆசீர்வதித்து வழிநடத்திய சர்வவல்லமையுள்ள தேவனுக்கு முதலில் நன்றியையும் ஸ்தோத்திரத்தையும் செலுத்துகிறோம்.

“எல்லாவற்றிற்கும் ஸ்தோத்திரஞ்செய்யுங்கள்” என்ற 1 தெசலோனிக்கேயர் 5:18 வசனத்தின்படி, தேவன் செய்த சகல நன்மைகளையும் நன்றியுடன் நினைவுகூருகிறோம்.

எங்கள் ${snapshot.memberCount} உறுப்பினர்களுக்கும், குறிப்பாக ${leaderNames} ஆகியோரின் ஜெபமுள்ள தலைமைக்கும் அர்ப்பணிப்பான சேவைக்கும் மனமார்ந்த நன்றி. பதிவுசெய்யப்பட்ட ${snapshot.meetingCount} கூடுகை நாட்களில் ${snapshot.presentCount} வருகைகள் மற்றும் ${snapshot.absentCount} வராத பதிவுகள் உள்ளன; தொடர்ந்து பங்கேற்ற ஒவ்வொருவரையும் பாராட்டுகிறோம்.

${programs} நிகழ்ச்சிகளில் மொத்தம் ${snapshot.answerCount} பதில்கள் அளித்த இளைஞர்களுக்கும், ${weekly} நிகழ்ச்சிகளை ஒருங்கிணைத்த அனைவருக்கும் நன்றி. ${events} போன்ற நினைவுகூரத்தக்க நிகழ்வுகளைக் காண்பிக்கும் படங்களும் சாட்சிகளும் இந்த ஆண்டின் தேவ கிருபையை நினைவூட்டுகின்றன.

போதகர், YDM தலைவர், ஆலோசகர்கள், நிர்வாகிகள், பெற்றோர்கள், சபை விசுவாசிகள் மற்றும் ஒவ்வொரு இளைஞரின் ஜெபம், நேரம், திறமை மற்றும் ஆதரவிற்காக மனமார்ந்த நன்றி. வருகிற ஆண்டிலும் பரிசுத்த ஆவியானவர் நம்மை வழிநடத்தி, கிறிஸ்துவின் நாமம் மகிமைப்படும்படி பயன்படுத்துவாராக. அனைவருக்கும் நன்றி. தேவன் உங்களை ஆசீர்வதிப்பாராக. ஆமென்.`
  }
  if (kind === 'welcome') return `Praise the Lord! In the precious name of Jesus Christ, I warmly welcome our respected Pastor, YDM President, ministry leaders, parents, church family and every young person to this blessed gathering for the year ${year}.

As Romans 12:11 teaches us to be fervent in spirit and serve the Lord, we begin this year with prayer, the Word of God, the fellowship of believers and complete dependence on the leading of the Holy Spirit.

Our Youth Divine Movement family has ${snapshot.memberCount} members. We praise God for the faithful leadership of ${leaderNames}. Our ministry records show ${snapshot.participantCount} participants across the year's activities, with ${snapshot.presentCount} present attendances recorded over ${snapshot.meetingCount} meeting days.

Through Bible-centred programs including ${programs}, our young people recorded ${snapshot.answerCount} answers. Weekly ministry such as ${weekly}, together with memorable events including ${events}, strengthened our worship, learning and fellowship.

May this year lead every young person into a deeper relationship with Jesus Christ, a Spirit-filled prayer life and joyful service to the church and community. Once again, we welcome each one of you. May the Lord bless this gathering and use it for His glory. Amen.`
  return `Praise the Lord! First and above all, we offer our heartfelt thanksgiving and praise to Almighty God for His faithfulness, protection and gracious leading throughout the year ${year}.

In the spirit of 1 Thessalonians 5:18—“In every thing give thanks”—we gratefully remember every person through whom the Lord strengthened this ministry.

We thank all ${snapshot.memberCount} members of our Youth Divine Movement family and especially ${leaderNames} for their prayerful leadership and faithful service. Across ${snapshot.meetingCount} recorded meeting days, our records contain ${snapshot.presentCount} present attendances and ${snapshot.absentCount} absences. We appreciate every member who participated with commitment.

We congratulate the young people who completed ${snapshot.answerCount} answers through ${programs}. We also thank everyone who planned and served in ${weekly}. The photographs and testimonies from ${events} preserve precious reminders of God's grace during this year.

Our sincere thanks go to our Pastor, YDM President, advisors, office bearers, parents, church believers and every young person who offered prayer, time, talent and support. May the Holy Spirit continue to guide us, unite us and use us so that the name of Jesus Christ alone is glorified. Thank you all, and may God richly bless you. Amen.`
}

function documentHtml(title: string, kind: SpeechKind, language: Language, year: string, content: string) {
  const paragraphs = content.split(/\n\s*\n/).map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')
  const labels = language === 'ta' ? { praise: 'கர்த்தருக்கு ஸ்தோத்திரம்', year: 'ஆண்டு ஊழியம்', kind: kind === 'welcome' ? 'தொடக்க வரவேற்புரை' : 'நிறைவு நன்றியுரை', president: 'YDM தலைவர்', pastor: 'சபை போதகர்' } : { praise: 'Praise the Lord', year: 'Annual Ministry', kind: kind === 'welcome' ? 'Opening address' : 'Closing thanksgiving', president: 'YDM President', pastor: 'Church Pastor' }
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><style>@page{size:A4 portrait;margin:15mm}*{box-sizing:border-box}body{margin:0;color:#172b24;font-family:Arial,sans-serif}.page{min-height:1040px;border:2px solid #e3bc62;padding:42px 50px;background:linear-gradient(180deg,#f4fbf7,#fff 28%)}header{text-align:center;border-bottom:1px solid #c7dfd4;padding-bottom:24px}.ministry{font-size:12px;font-weight:800;letter-spacing:2px;color:#087f5b;text-transform:uppercase}.praise{font:700 20px Georgia,serif;margin:15px 0 6px}.year{color:#9a7526;font-weight:800}.title{font:700 34px Georgia,serif;color:#071f19;margin:12px 0 0}.kind{font-size:12px;letter-spacing:2px;color:#087f5b;text-transform:uppercase}.content{padding-top:22px;font-size:15px;line-height:1.8;text-align:justify}.content p{margin:0 0 15px}.verse{margin:18px 0;padding:14px 18px;border-left:4px solid #e3bc62;background:#e8f5ef;color:#164f3d;font-style:italic}footer{display:flex;justify-content:space-between;margin-top:45px;padding-top:20px;color:#526c62;font-size:12px}.line{width:190px;border-top:1px solid #39534a;padding-top:8px;text-align:center}</style></head><body><main class="page"><header><div class="ministry">Jehovah Salvation Church · Youth Divine Movement</div><div class="praise">${labels.praise}</div><div class="year">${labels.year} · ${escapeHtml(year)}</div><h1 class="title">${escapeHtml(title)}</h1><div class="kind">${labels.kind}</div></header><section class="content">${paragraphs}</section><footer><div class="line">${labels.president}</div><div class="line">${labels.pastor}</div></footer></main></body></html>`
}

export default function AdminAnnualSpeeches() {
  const [data, setData] = useState<AnnualData>(emptyData)
  const [year, setYear] = useState(currentYear)
  const [language, setLanguage] = useState<Language>('en')
  const [welcome, setWelcome] = useState('')
  const [thanks, setThanks] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const load = async () => { setLoading(true); setError(''); try { const [members, attendance, points, gallery, weekly] = await Promise.all([getMembers(), getAttendance(), getProgramPoints(), getGallery(), getWeeklyPrograms(true)]); setData({ members, attendance, points, gallery, weekly }) } catch { setData(emptyData); setError('Could not load annual speech data. Check the connection and try again.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const snapshot = useMemo(() => yearlySnapshot(data, year), [data, year])
  useEffect(() => { setWelcome(createSpeech('welcome', language, year, snapshot)); setThanks(createSpeech('thanks', language, year, snapshot)); setStatus('') }, [language, year, snapshot])
  const years = useMemo(() => unique([currentYear, ...data.attendance, ...data.points, ...data.gallery, ...data.weekly].map(item => typeof item === 'string' ? item : item.date.slice(0, 4))).sort().reverse(), [data])
  const download = async (kind: SpeechKind) => { const content = kind === 'welcome' ? welcome : thanks; const title = language === 'en' ? (kind === 'welcome' ? 'Year Welcome Speech' : 'Vote of Thanks') : (kind === 'welcome' ? 'ஆண்டு வரவேற்புரை' : 'நன்றியுரை'); if (!content.trim()) { setStatus('Add speech content before creating the PDF.'); return } setStatus('Creating PDF…'); try { await downloadHtmlPdf(documentHtml(title, kind, language, year, content), `jsc-ydm-${year}-${kind}-${language}.pdf`); setStatus(`${title} PDF downloaded.`) } catch { setStatus('The PDF could not be created. Please try again.') } }
  const cards = [{ kind: 'welcome' as const, title: language === 'en' ? 'Year welcome speech' : 'ஆண்டு வரவேற்புரை', subtitle: language === 'en' ? 'A Spirit-filled opening address grounded in the selected year’s ministry records.' : 'தேர்ந்தெடுக்கப்பட்ட ஆண்டின் ஊழியப் பதிவுகளின் அடிப்படையிலான பரிசுத்த ஆவி நிறைந்த தொடக்க உரை.', value: welcome, setValue: setWelcome }, { kind: 'thanks' as const, title: language === 'en' ? 'Vote of thanks' : 'நன்றியுரை', subtitle: language === 'en' ? 'A gracious closing thanksgiving recognising ministry, leaders and participation.' : 'ஊழியம், தலைவர்கள் மற்றும் பங்கேற்பை மதிக்கும் நன்றியுள்ள நிறைவு உரை.', value: thanks, setValue: setThanks }]
  return <section className="soft-card" aria-labelledby="annual-speeches-title">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="icon-box shrink-0"><ScrollText size={20} /></span><div><p className="eyebrow">Annual ministry documents</p><h2 id="annual-speeches-title" className="mt-1 text-2xl font-black">Welcome speech &amp; vote of thanks</h2><p className="mt-1 max-w-3xl text-sm text-slate-500">Prepared from saved annual ministry activity. Private contact and identity details are never included.</p></div></div><button type="button" className="secondary-dark-btn" disabled={loading} onClick={() => void load()}><RefreshCw size={17} /> Refresh data</button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-[180px_220px_1fr]"><label className="field-label">Annual year<select className="field" value={year} onChange={event => setYear(event.target.value)}>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label className="field-label">PDF language<select className="field" value={language} onChange={event => setLanguage(event.target.value as Language)}><option value="en">English</option><option value="ta">தமிழ்</option></select></label><div className="self-end rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900"><Languages className="mr-2 inline" size={16} />Changing year or language regenerates both editable speeches.</div></div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-slate-500">Preparing annual speeches…</p> : !error && <><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Members', snapshot.memberCount], ['Meeting days', snapshot.meetingCount], ['Present records', snapshot.presentCount], ['Program answers', snapshot.answerCount]].map(([label, value]) => <div key={label} className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4"><p className="text-xs font-bold uppercase tracking-[.12em] text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}</div><div className="mt-6 grid gap-5 xl:grid-cols-2">{cards.map(card => <article key={card.kind} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5"><h3 className="text-xl font-black">{card.title}</h3><p className="mt-1 min-h-10 text-sm text-slate-500">{card.subtitle}</p><label className="field-label mt-4">Editable speech<textarea className="field min-h-[28rem] resize-none leading-7" value={card.value} onChange={event => card.setValue(event.target.value)} /></label><button type="button" className="primary-btn mt-4 w-full justify-center sm:w-auto" onClick={() => void download(card.kind)}><Download size={17} /> Download {card.title} PDF</button></article>)}</div></>}
    {status && <p role="status" className="mt-4 text-sm font-semibold text-emerald-800">{status}</p>}
  </section>
}
