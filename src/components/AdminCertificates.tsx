import { useEffect, useMemo, useState } from 'react'
import { Award, Download, RefreshCw } from 'lucide-react'
import { getAttendance, getMembers, getProgramPoints } from '../data/api'
import { getCertificateAwards, type CertificateAward } from '../data/certificates'
import { downloadHtmlPdf } from '../data/pdf'
import type { AttendanceRecord, Member, ProgramPoint } from '../data/memberStore'
import ydmLogo from '../assets/jsc-ydm-logo-certificate.png'

const verse = 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men;'
const escapeHtml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')

const certificateCss = `
.ydm-certificate{container-type:inline-size;position:relative;isolation:isolate;display:flex;flex-direction:column;justify-content:space-between;aspect-ratio:297/210;min-width:640px;overflow:hidden;border:10px solid #071f19;background:#fffdf7;color:#071f19;font-family:Georgia,'Times New Roman',serif;text-align:center;box-shadow:inset 0 0 0 3px #e3bc62,inset 0 0 0 12px #fffdf7,inset 0 0 0 13px #c4a04d}
.ydm-certificate:before,.ydm-certificate:after{content:'';position:absolute;z-index:-1;pointer-events:none;border-radius:50%}
.ydm-certificate:before{width:38%;aspect-ratio:1;left:-13%;top:-31%;border:28px solid rgba(8,127,91,.055)}
.ydm-certificate:after{width:44%;aspect-ratio:1;right:-17%;bottom:-43%;border:32px solid rgba(227,188,98,.12)}
.ydm-cert-top{position:relative;padding:5.4cqw 10cqw 0}
.ydm-cert-logo{position:absolute;right:5.6cqw;top:3.8cqw;width:10cqw;height:10cqw;object-fit:contain}
.ydm-cert-ministry{margin:0;color:#087f5b;font:700 1.35cqw Arial,sans-serif;letter-spacing:.24em;text-transform:uppercase}
.ydm-cert-praise{margin:2.4cqw 0 0;font-size:2.9cqw;font-weight:700;letter-spacing:.04em}
.ydm-cert-verse{max-width:75%;margin:1.15cqw auto 0;color:#39534a;font-size:1.55cqw;line-height:1.5;font-style:italic}
.ydm-cert-reference{margin:.5cqw 0 0;color:#087f5b;font:700 1.15cqw Arial,sans-serif;letter-spacing:.13em;text-transform:uppercase}
.ydm-cert-main{padding:0 6cqw}
.ydm-cert-rule{display:flex;justify-content:center;align-items:center;gap:1.2cqw;margin:0 auto 1.2cqw;color:#b28b34;font:700 1.8cqw Georgia,serif}
.ydm-cert-rule:before,.ydm-cert-rule:after{content:'';width:8cqw;height:1px;background:#c4a04d}
.ydm-cert-kicker{margin:0;color:#087f5b;font:700 1.2cqw Arial,sans-serif;letter-spacing:.4em;text-transform:uppercase}
.ydm-cert-title{margin:.7cqw 0 1.1cqw;color:#071f19;font-size:5cqw;line-height:1.02;letter-spacing:.025em;text-transform:uppercase}
.ydm-cert-intro{margin:0;color:#53665d;font:1.5cqw Arial,sans-serif}
.ydm-cert-name{max-width:85%;margin:1.1cqw auto .55cqw;padding-bottom:.4cqw;border-bottom:1px solid #c4a04d;color:#087f5b;font-size:4cqw;font-weight:700;line-height:1.1;overflow-wrap:anywhere}
.ydm-cert-reason{max-width:78%;margin:0 auto;color:#223c32;font-size:1.8cqw;line-height:1.45}
.ydm-cert-detail{display:inline-block;margin:1.25cqw 0 0;padding:.55cqw 1.5cqw;border:1px solid #c4a04d;border-radius:99px;color:#755614;font:700 1.25cqw Arial,sans-serif;letter-spacing:.05em}
.ydm-cert-bottom{display:flex;justify-content:space-between;align-items:flex-end;gap:5cqw;padding:0 7cqw 4.8cqw}
.ydm-cert-signature{width:24%;padding-top:.7cqw;border-top:1px solid #071f19;color:#071f19;font:700 1.35cqw Arial,sans-serif;text-align:left}
.ydm-cert-signature:last-child{text-align:right}
.ydm-cert-year{color:#90702c;font:700 1.3cqw Arial,sans-serif;letter-spacing:.25em}
@media print{html,body{width:297mm;height:210mm;margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}.ydm-certificate{width:297mm;height:210mm;min-width:0;aspect-ratio:auto;box-shadow:inset 0 0 0 3px #e3bc62,inset 0 0 0 12px #fffdf7,inset 0 0 0 13px #c4a04d;break-inside:avoid}.ydm-cert-top{padding-top:5cqw}}
`

export function certificateMarkup(award: CertificateAward) {
  return `<article class="ydm-certificate" aria-label="Certificate for ${escapeHtml(award.member.name)}"><header class="ydm-cert-top"><img class="ydm-cert-logo" src="${escapeHtml(ydmLogo)}" alt="YDM logo"><p class="ydm-cert-ministry">Jehovah Salvation Church · Youth Divine Movement</p><p class="ydm-cert-praise">Praise the Lord</p><p class="ydm-cert-verse">“${verse}”</p><p class="ydm-cert-reference">Colossians 3:23</p></header><div class="ydm-cert-main"><div class="ydm-cert-rule" aria-hidden="true">✦</div><p class="ydm-cert-kicker">JSC YDM Kollemcode</p><h2 class="ydm-cert-title">Certificate</h2><p class="ydm-cert-intro">Proudly presented to</p><p class="ydm-cert-name">${escapeHtml(award.member.name)}</p><p class="ydm-cert-reason">${escapeHtml(award.reason)}</p><p class="ydm-cert-detail">${escapeHtml(award.title)}</p></div><footer class="ydm-cert-bottom"><div class="ydm-cert-signature">YDM President<br>Signature</div><span class="ydm-cert-year">${escapeHtml(award.year)}</span><div class="ydm-cert-signature">Church Pastor<br>Signature</div></footer></article>`
}

export function certificateDocument(award: CertificateAward) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(award.member.name)} · ${escapeHtml(award.title)} · JSC YDM</title><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff}${certificateCss}</style></head><body>${certificateMarkup(award)}</body></html>`
}

export default function AdminCertificates() {
  const [members, setMembers] = useState<Member[]>([])
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [points, setPoints] = useState<ProgramPoint[]>([])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [filter, setFilter] = useState<'all' | 'attendance' | 'program'>('all')
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = async () => {
    setLoading(true); setError('')
    try {
      const [savedMembers, savedRecords, savedPoints] = await Promise.all([getMembers(), getAttendance(), getProgramPoints()])
      setMembers(savedMembers); setRecords(savedRecords); setPoints(savedPoints)
    } catch { setMembers([]); setRecords([]); setPoints([]); setSelectedId(''); setError('Could not load certificate data. Check the connection and try again.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])

  const years = useMemo(() => [...new Set([year, String(new Date().getFullYear()), ...records.map(row => row.date.slice(0, 4)), ...points.map(row => row.date.slice(0, 4))])].sort().reverse(), [records, points, year])
  const awards = useMemo(() => getCertificateAwards(members, records, points, year), [members, records, points, year])
  const standardAwards = awards.filter(award => award.kind !== 'appreciation' && award.kind !== 'overall')
  const appreciationAwards = awards.filter(award => award.kind === 'appreciation')
  const overallAwards = awards.filter(award => award.kind === 'overall')
  const visibleAwards = standardAwards.filter(award => filter === 'all' || award.kind === filter)
  const selected = visibleAwards.find(award => award.id === selectedId) || visibleAwards[0]
  const [selectedAppreciationId, setSelectedAppreciationId] = useState('')
  const selectedAppreciation = appreciationAwards.find(award => award.id === selectedAppreciationId) || appreciationAwards[0]
  const [selectedOverallId, setSelectedOverallId] = useState('')
  const selectedOverall = overallAwards.find(award => award.id === selectedOverallId) || overallAwards[0]

  const download = (award: CertificateAward) => {
    if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 600) { void downloadHtmlPdf(certificateDocument(award), `jsc-ydm-${award.kind}-certificate-${award.member.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`).catch(() => setError('PDF download failed. Please try again.')); return }
    const popup = window.open('', '_blank')
    if (!popup) { setError('Allow pop-ups for this site, then try Download PDF again.'); return }
    popup.document.open(); popup.document.write(certificateDocument(award)); popup.document.close()
    const images = [...popup.document.images]
    void Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => { image.onload = () => resolve(); image.onerror = () => resolve() })))
      .then(() => { if (!popup.closed) { popup.focus(); popup.print() } })
  }

  return <section className="soft-card admin-certificates" aria-labelledby="admin-certificates-title">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3"><span className="icon-box shrink-0"><Award size={20} /></span><div><p className="eyebrow">Recognition</p><h2 id="admin-certificates-title" className="mt-1 text-2xl font-black">Certificates</h2><p className="mt-1 text-sm text-slate-500">Perfect attendance and first or second place in Bible Quiz, Bible Reference and Song Survey.</p></div></div>
      <button type="button" onClick={() => void refresh()} disabled={loading} className="secondary-dark-btn disabled:cursor-not-allowed disabled:opacity-60"><RefreshCw size={17} /> Refresh results</button>
    </div>
    <div className="mt-5 grid gap-3 sm:grid-cols-[180px_220px_1fr]"><label className="field-label">Year<select className="field" value={year} onChange={event => { setYear(event.target.value); setSelectedId('') }}>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label><label className="field-label">Award type<select className="field" value={filter} onChange={event => { setFilter(event.target.value as typeof filter); setSelectedId('') }}><option value="all">All certificates</option><option value="attendance">Perfect attendance</option><option value="program">Program awards</option></select></label><p className="self-end text-sm text-slate-500">Attendance requires a Present record on every recorded meeting date in the selected year. Program places are ranked by total points within each seniority level; tied scores share the place.</p></div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {loading ? <p role="status" className="mt-6 text-sm text-slate-500">Loading eligible members…</p> : error ? null : !visibleAwards.length ? <p className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">No eligible certificates for {year}. Add attendance or program points, then refresh results.</p> : <>
      <p className="mt-6 text-sm font-bold text-slate-700">{visibleAwards.length} certificate{visibleAwards.length === 1 ? '' : 's'} ready</p>
      <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
        <div className="max-h-[36rem] space-y-2 overflow-y-auto pr-1" aria-label="Eligible certificate recipients">{visibleAwards.map(award => <button type="button" key={award.id} onClick={() => setSelectedId(award.id)} aria-pressed={selected?.id === award.id} className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${selected?.id === award.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'}`}><span className="block font-black text-slate-900">{award.member.name}</span><span className="mt-1 block text-sm font-semibold text-emerald-800">{award.title}</span><span className="mt-1 block text-xs text-slate-500">{award.detail}</span></button>)}</div>
        {selected && <div className="min-w-0"><div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-2" tabIndex={0} aria-label="Certificate preview. Scroll horizontally to see the full certificate."><style>{certificateCss}</style><div dangerouslySetInnerHTML={{ __html: certificateMarkup(selected) }} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">Choose “Save as PDF” in the print dialog. Print on A4 landscape with background graphics enabled.</p><button type="button" onClick={() => download(selected)} className="primary-btn"><Download size={17} /> Download PDF</button></div></div>}
      </div>
    </>}
    {!loading && !error && <section className="mt-8 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5" aria-labelledby="admin-appreciation-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="eyebrow">Year-end recognition</p><h3 id="admin-appreciation-title" className="mt-1 text-xl font-black text-slate-900">Leadership &amp; service appreciation</h3><p className="mt-1 max-w-3xl text-sm text-slate-600">A professional appreciation certificate for leaders and office holders who helped make the year wonderful. YDM Members and YDM Children are excluded.</p></div>
        <p className="rounded-full bg-white px-3 py-2 text-xs font-bold text-emerald-800">{appreciationAwards.length} certificate{appreciationAwards.length === 1 ? '' : 's'} ready</p>
      </div>
      {!appreciationAwards.length ? <p className="mt-5 rounded-2xl border border-dashed border-emerald-200 bg-white/70 p-5 text-sm text-slate-600">No named leaders or office holders are available for {year} yet.</p> : <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]">
        <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1" aria-label="Leadership appreciation recipients">{appreciationAwards.map(award => <button type="button" key={award.id} onClick={() => setSelectedAppreciationId(award.id)} aria-pressed={selectedAppreciation?.id === award.id} className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${selectedAppreciation?.id === award.id ? 'border-emerald-600 bg-white' : 'border-emerald-100 bg-white/70 hover:border-emerald-300 hover:bg-white'}`}><span className="block font-black text-slate-900">{award.member.name}</span><span className="mt-1 block text-sm font-semibold text-emerald-800">{award.member.role}</span><span className="mt-1 block text-xs text-slate-500">{award.detail}</span></button>)}</div>
        {selectedAppreciation && <div className="min-w-0"><div className="overflow-x-auto rounded-2xl border border-emerald-100 bg-white p-2" tabIndex={0} aria-label="Leadership appreciation certificate preview. Scroll horizontally to see the full certificate."><style>{certificateCss}</style><div dangerouslySetInnerHTML={{ __html: certificateMarkup(selectedAppreciation) }} /></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">This certificate recognizes faithful leadership and service throughout the selected year.</p><button type="button" onClick={() => download(selectedAppreciation)} className="primary-btn"><Download size={17} /> Download appreciation PDF</button></div></div>}
      </div>}
    </section>}
    {!loading && !error && <section className="mt-8 rounded-3xl border border-amber-100 bg-amber-50/60 p-5" aria-labelledby="admin-overall-title">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow">Highest achievement</p><h3 id="admin-overall-title" className="mt-1 text-xl font-black text-slate-900">Overall champion award</h3><p className="mt-1 max-w-3xl text-sm text-slate-600">Awarded to any eligible leader or office holder with 100% attendance and first place in Bible Quiz, Bible Reference and Song Survey. YDM Members and YDM Children are excluded.</p></div><p className="rounded-full bg-white px-3 py-2 text-xs font-bold text-amber-800">{overallAwards.length} champion{overallAwards.length === 1 ? '' : 's'} ready</p></div>
      {!overallAwards.length ? <p className="mt-5 rounded-2xl border border-dashed border-amber-200 bg-white/70 p-5 text-sm text-slate-600">No overall champion qualifies for {year} yet.</p> : <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(240px,320px)_minmax(0,1fr)]"><div className="space-y-2" aria-label="Overall champion recipients">{overallAwards.map(award => <button type="button" key={award.id} onClick={() => setSelectedOverallId(award.id)} aria-pressed={selectedOverall?.id === award.id} className={`w-full rounded-2xl border p-4 text-left transition ${selectedOverall?.id === award.id ? 'border-amber-500 bg-white' : 'border-amber-100 bg-white/70 hover:border-amber-300 hover:bg-white'}`}><span className="block font-black text-slate-900">{award.member.name}</span><span className="mt-1 block text-sm font-semibold text-amber-800">{award.title}</span><span className="mt-1 block text-xs text-slate-500">{award.detail}</span></button>)}</div>{selectedOverall && <div className="min-w-0"><div className="overflow-x-auto rounded-2xl border border-amber-100 bg-white p-2" tabIndex={0} aria-label="Overall champion certificate preview. Scroll horizontally to see the full certificate."><style>{certificateCss}</style><div dangerouslySetInnerHTML={{ __html: certificateMarkup(selectedOverall) }} /></div><div className="mt-4 flex justify-end"><button type="button" onClick={() => download(selectedOverall)} className="primary-btn"><Download size={17} /> Download champion PDF</button></div></div>}</div>}
    </section>}
  </section>
}
