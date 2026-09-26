import { useState } from 'react'
import { Download, Palette } from 'lucide-react'
import { downloadHtmlPdf } from '../data/pdf'

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)

export default function AdminAnnualThemeBuilder() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [englishTheme, setEnglishTheme] = useState('Empowered by the Holy Spirit')
  const [tamilTheme, setTamilTheme] = useState('பரிசுத்த ஆவியினால் வல்லமை பெறுதல்')
  const [verse, setVerse] = useState('But ye shall receive power, after that the Holy Ghost is come upon you. — Acts 1:8')
  const [message, setMessage] = useState('A year of prayer, spiritual growth, faithful fellowship and Spirit-led service.')
  const [status, setStatus] = useState('')

  const createPdf = async () => {
    if (!/^\d{4}$/.test(year) || !englishTheme.trim() || !tamilTheme.trim() || !verse.trim()) {
      setStatus('Enter a four-digit year, both theme titles, and a Bible verse.')
      return
    }
    setStatus('Creating annual theme PDF…')
    const safe = { year: escapeHtml(year), english: escapeHtml(englishTheme), tamil: escapeHtml(tamilTheme), verse: escapeHtml(verse), message: escapeHtml(message) }
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4 landscape;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#f7f2df;background:#071f19}.page{width:1120px;height:790px;padding:54px;background:radial-gradient(circle at 85% 10%,#17684e 0,transparent 30%),#071f19}.frame{height:100%;border:3px solid #e3bc62;padding:10px}.inner{height:100%;border:1px solid rgba(227,188,98,.55);display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:42px 64px;text-align:center}.eyebrow{color:#e3bc62;letter-spacing:5px;font-weight:800;font-size:15px}.church{font-size:22px;font-weight:800;margin-top:10px}.year{font-size:72px;color:#e3bc62;font-family:Georgia,serif;margin:12px 0 4px}.title{font:700 46px Georgia,serif;max-width:900px}.tamil{font-size:26px;color:#d9f2e7;margin-top:14px}.verse{max-width:800px;font:italic 20px Georgia,serif;line-height:1.55;color:#f4dfaa}.message{max-width:820px;font-size:17px;line-height:1.5;color:#cde2d9}.signatures{width:100%;display:flex;justify-content:space-between;font-size:14px;color:#e3bc62}.line{border-top:1px solid #e3bc62;padding-top:9px;width:210px}</style></head><body><main class="page"><section class="frame"><div class="inner"><header><div class="eyebrow">ANNUAL MINISTRY THEME</div><div class="church">Jehovah Salvation Church · Youth Divine Movement</div></header><div><div class="year">${safe.year}</div><div class="title">${safe.english}</div><div class="tamil">${safe.tamil}</div></div><div class="verse">“${safe.verse}”</div><div class="message">${safe.message}</div><footer class="signatures"><div class="line">YDM President</div><div class="line">Church Pastor</div></footer></div></section></main></body></html>`
    try { await downloadHtmlPdf(html, `jsc-ydm-annual-theme-${year}.pdf`, 'a4-landscape'); setStatus('Annual theme PDF downloaded.') }
    catch { setStatus('The PDF could not be created. Please try again.') }
  }

  return <section className="soft-card mb-6 overflow-hidden border border-emerald-100">
    <div className="mb-6 flex items-center gap-3"><span className="icon-box"><Palette size={20} /></span><div><p className="eyebrow">Annual year</p><h2 className="text-xl font-black">Theme builder</h2><p className="text-sm text-slate-500">Edit the ministry theme and create a polished annual PDF.</p></div></div>
    <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <div className="grid content-start gap-4">
        <label className="field-label">Annual year<input className="field" inputMode="numeric" maxLength={4} value={year} onChange={event => setYear(event.target.value.replace(/\D/g, ''))} /></label>
        <label className="field-label">English theme<input className="field" value={englishTheme} onChange={event => setEnglishTheme(event.target.value)} /></label>
        <label className="field-label">Tamil theme<input className="field" value={tamilTheme} onChange={event => setTamilTheme(event.target.value)} /></label>
        <label className="field-label">Bible verse<textarea className="field min-h-24 resize-none" value={verse} onChange={event => setVerse(event.target.value)} /></label>
        <label className="field-label">Annual message<textarea className="field min-h-24 resize-none" value={message} onChange={event => setMessage(event.target.value)} /></label>
        <button className="primary-btn justify-center" onClick={() => void createPdf()}><Download size={17} /> Create PDF</button>
        {status && <p role="status" className="text-sm font-semibold text-emerald-800">{status}</p>}
      </div>
      <div aria-label="Annual theme preview" className="relative min-h-[430px] overflow-hidden rounded-[28px] border-2 border-[#e3bc62] bg-[#071f19] p-6 text-center text-white shadow-xl sm:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#e3bc62]/30 bg-emerald-700/20" />
        <div className="relative flex h-full min-h-[350px] flex-col items-center justify-between rounded-2xl border border-[#e3bc62]/50 p-5 sm:p-8">
          <div><p className="text-xs font-black tracking-[.3em] text-[#e3bc62]">ANNUAL MINISTRY THEME</p><p className="mt-2 text-sm font-bold text-emerald-100">Jehovah Salvation Church · Youth Divine Movement</p></div>
          <div><p className="font-serif text-5xl font-bold text-[#e3bc62] sm:text-6xl">{year || 'Year'}</p><h3 className="mt-3 font-serif text-2xl font-bold sm:text-4xl">{englishTheme || 'English theme'}</h3><p className="mt-3 text-base text-emerald-100 sm:text-xl">{tamilTheme || 'Tamil theme'}</p></div>
          <blockquote className="max-w-2xl font-serif text-sm italic leading-relaxed text-[#f4dfaa] sm:text-base">“{verse || 'Bible verse'}”</blockquote>
          <p className="max-w-2xl text-xs leading-relaxed text-emerald-100 sm:text-sm">{message}</p>
          <div className="flex w-full justify-between gap-6 text-[10px] font-bold uppercase tracking-wider text-[#e3bc62] sm:text-xs"><span className="w-32 border-t border-[#e3bc62] pt-2 sm:w-44">YDM President</span><span className="w-32 border-t border-[#e3bc62] pt-2 sm:w-44">Church Pastor</span></div>
        </div>
      </div>
    </div>
  </section>
}
