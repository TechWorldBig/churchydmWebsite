import { useState } from 'react'
import { CakeSlice, Download } from 'lucide-react'
import { downloadHtmlPdf } from '../data/pdf'
import ydmLogo from '../assets/jsc-ydm-logo-certificate.png'

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)

function coverMarkup(year: string, greeting: string, verse: string, sender: string) {
  return `<article class="cake-cover"><div class="star" aria-hidden="true">✦</div><div class="ring ring-one"></div><div class="ring ring-two"></div><header><img src="${escapeHtml(ydmLogo)}" alt="Youth Divine Movement logo"><p>Jehovah Salvation Church · Kollemcode</p></header><main><div class="season">Christmas Blessings · ${escapeHtml(year)}</div><h1>${escapeHtml(greeting)}</h1><div class="ornament" aria-hidden="true"><span></span>✦<span></span></div><blockquote>“${escapeHtml(verse)}”<cite>Luke 2:11</cite></blockquote></main><footer><p>With prayer and love from</p><strong>${escapeHtml(sender)}</strong></footer></article>`
}

const coverCss = `
*{box-sizing:border-box}.sheet{width:794px;min-height:1122px;display:grid;place-items:center;background:#fff;padding:55px}.cake-cover{position:relative;isolation:isolate;display:flex;flex-direction:column;justify-content:space-between;width:680px;aspect-ratio:1;overflow:hidden;border:5px solid #e3bc62;outline:2px solid #071f19;outline-offset:7px;background:radial-gradient(circle at 50% 12%,#17684e 0,transparent 30%),linear-gradient(145deg,#071f19,#0b4b39);padding:54px;color:#fff;text-align:center;font-family:Arial,sans-serif}.cake-cover:before{content:'';position:absolute;inset:18px;z-index:-1;border:1px solid rgba(227,188,98,.62)}.cake-cover .star{position:absolute;left:50%;top:15px;transform:translateX(-50%);color:#e3bc62;font-size:58px;text-shadow:0 0 24px rgba(227,188,98,.7)}.cake-cover .ring{position:absolute;z-index:-2;border:1px solid rgba(227,188,98,.2);border-radius:50%}.cake-cover .ring-one{width:420px;height:420px;right:-230px;top:-220px}.cake-cover .ring-two{width:370px;height:370px;left:-210px;bottom:-210px}.cake-cover header img{width:105px;height:105px;object-fit:contain}.cake-cover header p{margin:9px 0 0;color:#d9eee5;font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase}.cake-cover .season{color:#e3bc62;font-size:13px;font-weight:800;letter-spacing:3px;text-transform:uppercase}.cake-cover h1{max-width:560px;margin:18px auto;font-family:Georgia,'Times New Roman',serif;font-size:52px;line-height:1.08;white-space:pre-line}.cake-cover .ornament{display:flex;align-items:center;justify-content:center;gap:12px;color:#e3bc62}.cake-cover .ornament span{width:75px;height:1px;background:#e3bc62}.cake-cover blockquote{max-width:520px;margin:22px auto 0;color:#edf8f3;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-style:italic;line-height:1.55}.cake-cover cite{display:block;margin-top:8px;color:#e3bc62;font-family:Arial,sans-serif;font-size:11px;font-style:normal;font-weight:800;letter-spacing:2px;text-transform:uppercase}.cake-cover footer p{margin:0;color:#b9d6c9;font-size:12px;text-transform:uppercase;letter-spacing:2px}.cake-cover footer strong{display:block;margin-top:8px;color:#e3bc62;font-family:Georgia,'Times New Roman',serif;font-size:22px}@media print{html,body{margin:0;width:210mm;height:297mm}.sheet{width:210mm;min-height:297mm;padding:14mm}.cake-cover{width:180mm}}
`

function coverDocument(year: string, greeting: string, verse: string, sender: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JSC YDM Christmas cake cover ${escapeHtml(year)}</title><style>@page{size:A4 portrait;margin:0}${coverCss}</style></head><body><main class="sheet">${coverMarkup(year, greeting, verse, sender)}</main></body></html>`
}

export default function AdminCakeCover() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [greeting, setGreeting] = useState('Merry Christmas\nand Happy New Year')
  const [verse, setVerse] = useState('For unto you is born this day in the city of David a Saviour, which is Christ the Lord.')
  const [sender, setSender] = useState('YDM JSC Kollemcode')
  const [status, setStatus] = useState('')
  const download = async () => {
    if (!/^\d{4}$/.test(year) || !greeting.trim() || !verse.trim() || !sender.trim()) { setStatus('Enter a four-digit year and complete all cover text.'); return }
    setStatus('Creating cake cover PDF…')
    try { await downloadHtmlPdf(coverDocument(year, greeting, verse, sender), `jsc-ydm-christmas-cake-cover-${year}.pdf`); setStatus('Cake cover PDF downloaded.') }
    catch { setStatus('The cake cover PDF could not be created. Please try again.') }
  }
  return <section className="soft-card" aria-labelledby="cake-cover-title">
    <div className="flex items-start gap-3"><span className="icon-box shrink-0"><CakeSlice size={20} /></span><div><p className="eyebrow">Christmas print</p><h2 id="cake-cover-title" className="mt-1 text-2xl font-black">Cake cover</h2><p className="mt-1 text-sm text-slate-500">Create a professional A4 print with one square cover for Christmas cake distribution.</p></div></div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[370px_1fr]">
      <div className="grid content-start gap-4"><label className="field-label">Year<input className="field" inputMode="numeric" maxLength={4} value={year} onChange={event => setYear(event.target.value.replace(/\D/g, ''))} /></label><label className="field-label">Main wish<textarea className="field min-h-24 resize-none" value={greeting} onChange={event => setGreeting(event.target.value)} /></label><label className="field-label">Bible verse<textarea className="field min-h-28 resize-none" value={verse} onChange={event => setVerse(event.target.value)} /></label><label className="field-label">From<input className="field" value={sender} onChange={event => setSender(event.target.value)} /></label><button type="button" className="primary-btn justify-center" onClick={() => void download()}><Download size={17} /> Download cake cover PDF</button>{status && <p role="status" className="text-sm font-semibold text-emerald-800">{status}</p>}<p className="text-xs leading-5 text-slate-500">Print at 100% scale on A4 paper, then trim around the outer square line.</p></div>
      <div className="min-w-0 overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-3" tabIndex={0} aria-label="Cake cover preview. Scroll horizontally on a small screen to view the full design."><style>{coverCss}</style><div className="mx-auto w-[680px] max-w-none" dangerouslySetInnerHTML={{ __html: coverMarkup(year || 'Year', greeting || 'Merry Christmas', verse || 'Bible verse', sender || 'YDM JSC Kollemcode') }} /></div>
    </div>
  </section>
}
