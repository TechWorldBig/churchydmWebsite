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
    const opening = kind === 'welcome' ? 'இந்த ஆசீர்வாதமான ஆண்டு விழாவிற்கு உங்கள் அனைவரையும் அன்புடன் வரவேற்கிறேன்.' : 'இந்த ஆண்டு விழாவை ஆசீர்வாதமாக நிறைவு செய்ய உதவிய அனைவருக்கும் மனமார்ந்த நன்றியைத் தெரிவித்துக்கொள்கிறேன்.'
    const closing = kind === 'welcome' ? 'உங்கள் அனைவரையும் மீண்டும் அன்புடன் வரவேற்கிறேன். பரிசுத்த ஆவியானவர் இந்த ஆண்டு விழாவின் ஒவ்வொரு நிகழ்வையும் நடத்தி, இயேசு கிறிஸ்துவின் நாமத்தை மகிமைப்படுத்துவாராக. ஆமென்.' : 'ஒவ்வொருவரின் ஜெபம், நேரம், திறமை மற்றும் அன்பான பங்களிப்பிற்காக மீண்டும் நன்றி கூறுகிறோம். எல்லா மகிமையும் இயேசு கிறிஸ்துவுக்கே உரியது. தேவன் உங்கள் அனைவரையும் ஆசீர்வதிப்பாராக. ஆமென்.'
    return `கர்த்தருக்கு ஸ்தோத்திரம்! ${opening}

முதலாவதாக, நம்மை இரட்சித்து, இந்த ${year} ஆம் ஆண்டில் காத்து, வழிநடத்தி, இந்த ஆண்டு விழாவில் ஒன்றுகூடச் செய்த நம்முடைய ஆண்டவரும் இரட்சகருமான இயேசு கிறிஸ்துவுக்கு நன்றியும் மகிமையும் செலுத்துகிறோம். “எல்லாவற்றிற்கும் ஸ்தோத்திரஞ்செய்யுங்கள்; அப்படிச் செய்வதே கிறிஸ்து இயேசுவுக்குள் உங்களைக்குறித்துத் தேவனுடைய சித்தமாயிருக்கிறது” — 1 தெசலோனிக்கேயர் 5:18.

இரண்டாவதாக, எங்கள் அன்பிற்குரிய சபை போதகர் பாஸ்டர் Finny அவர்களையும், அவருடைய குடும்பத்தினரையும் மரியாதையுடனும் அன்புடனும் வரவேற்று நன்றி கூறுகிறோம். அவர்களுடைய ஜெபம், ஆவிக்குரிய ஆலோசனை, ஊக்கம் மற்றும் தியாகமான ஆதரவு YDM இளைஞர்களை கிறிஸ்துவில் வளர உதவுகிறது.

மூன்றாவதாக, சபைக் கமிட்டி உறுப்பினர்கள் அனைவருக்கும் எங்கள் மனமார்ந்த வரவேற்பையும் நன்றியையும் தெரிவித்துக்கொள்கிறோம். சபையின் ஒழுங்கு, திட்டமிடல், ஆதரவு மற்றும் ஊழிய வாய்ப்புகளுக்காக அவர்கள் வழங்கும் ஒத்துழைப்பை நன்றியுடன் நினைவுகூருகிறோம்.

நான்காவதாக, YDM தலைவர்கள் மற்றும் ஒருங்கிணைப்பாளர்களான ${leaderNames} ஆகியோரை அன்புடன் கௌரவிக்கிறோம். ஜெபத்துடன் திட்டமிட்டு, இளைஞர்களை வழிநடத்தி, நிகழ்ச்சிகளை ஒருங்கிணைத்து, ஒவ்வொரு உறுப்பினரையும் ஊக்குவித்த அவர்களுடைய உண்மையுள்ள சேவைக்கு நன்றி.

ஐந்தாவதாக, எங்கள் YDM குடும்பத்தின் ${snapshot.memberCount} உறுப்பினர்கள் அனைவரையும் அன்புடன் வரவேற்று நன்றி கூறுகிறோம். உங்கள் விசுவாசமான பங்கேற்பு, ஜெபம், பாடல், சாட்சி, வேதவசனப் பயிற்சி மற்றும் சேவை இந்த ஊழியத்தின் உயிரோட்டமாக உள்ளது.

ஆறாவதாக, இன்று நடைபெறும் இந்த ஆண்டு விழாவில் நேரில் கலந்துகொண்டுள்ள மதிப்பிற்குரிய விருந்தினர்கள், பெற்றோர்கள், சபை விசுவாசிகள், நண்பர்கள் மற்றும் அனைவரையும் அன்புடன் வரவேற்று மனமார்ந்த நன்றி கூறுகிறோம். உங்கள் வருகை இந்த விழாவிற்கு மகிழ்ச்சியையும் ஊக்கத்தையும் அளிக்கிறது.

இந்த ஆண்டின் பதிவுகளின்படி ${snapshot.participantCount} பேர் ஊழியச் செயல்பாடுகளில் பங்கேற்றுள்ளனர்; ${snapshot.meetingCount} கூடுகை நாட்களில் ${snapshot.presentCount} வருகைகள் பதிவு செய்யப்பட்டுள்ளன. ${programs} நிகழ்ச்சிகளில் ${snapshot.answerCount} பதில்கள் அளிக்கப்பட்டன. ${weekly} மற்றும் ${events} போன்ற நிகழ்வுகள் நமது ஜெபம், வேதாகமக் கற்றல், சேவை மற்றும் ஐக்கியத்தை வளப்படுத்தின.

${closing}`
  }
  const opening = kind === 'welcome' ? 'It is my joy to warmly welcome every one of you to this blessed Annual Day celebration.' : 'It is my privilege to offer our heartfelt vote of thanks to everyone who helped make this Annual Day celebration meaningful and blessed.'
  const closing = kind === 'welcome' ? 'Once again, we warmly welcome you all. May the Holy Spirit lead every part of this Annual Day and may the name of Jesus Christ alone be glorified. Amen.' : 'We once again thank everyone for your prayers, time, talents and loving contribution. All glory belongs to Jesus Christ alone. May God richly bless you all. Amen.'
  return `Praise the Lord! ${opening}

First, we thank and glorify our Lord and Saviour Jesus Christ, who redeemed us, protected us, guided us throughout ${year}, and graciously brought us together for this Annual Day. “In every thing give thanks: for this is the will of God in Christ Jesus concerning you.” — 1 Thessalonians 5:18.

Second, we respectfully welcome and thank our beloved Church Pastor, Pastor Finny, and his family. Their prayers, spiritual counsel, encouragement and sacrificial support help the young people of YDM grow in Christ and remain faithful to the church.

Third, we warmly welcome and thank every member of the Church Committee. We gratefully recognise their cooperation in church administration, planning, practical support and the ministry opportunities they provide for our young people.

Fourth, we honour and thank our YDM leaders and coordinators, including ${leaderNames}. Their prayerful planning, guidance, coordination and faithful encouragement have helped every member participate, develop their gifts and serve with unity.

Fifth, we lovingly welcome and thank all ${snapshot.memberCount} members of our YDM family. Your faithful participation, prayers, songs, testimonies, Bible learning and service give life and strength to this ministry.

Sixth, we warmly welcome and sincerely thank everyone present here today for this Annual Day function—our honoured guests, parents, church believers, friends and well-wishers. Your presence adds joy, encouragement and fellowship to this celebration.

Our records show ${snapshot.participantCount} participants across the year, with ${snapshot.presentCount} present attendances over ${snapshot.meetingCount} meeting days. Our young people completed ${snapshot.answerCount} answers through ${programs}. Weekly ministry such as ${weekly}, together with memorable events including ${events}, strengthened our prayer, biblical learning, service and fellowship.

${closing}`
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
