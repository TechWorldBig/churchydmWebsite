import { useState } from 'react'
import { Download, FileText, Palette } from 'lucide-react'
import { downloadHtmlPdf } from '../data/pdf'
import ydmLogo from '../assets/jsc-ydm-logo-certificate.png'

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] || character)

const themeCss = `
.theme-preview-scale{width:1120px;height:790px;transform:scale(.68);transform-origin:top left}
*{box-sizing:border-box}.annual-theme-sheet{width:1120px;height:790px;padding:42px;background:#f5f0e4;font-family:Arial,sans-serif}.annual-theme-art{position:relative;isolation:isolate;width:100%;height:100%;overflow:hidden;border:1px solid #d7c183;border-radius:30px;background:linear-gradient(145deg,#fffef9 0%,#f5f1e7 58%,#e8f4ee 100%);color:#071f19;text-align:center;box-shadow:0 26px 50px rgba(7,31,25,.17),inset 0 0 0 9px rgba(255,255,255,.78)}.annual-theme-art:before{content:'';position:absolute;inset:18px;z-index:-1;border:1px solid rgba(8,127,91,.2);border-radius:20px}.annual-theme-art .ribbon{position:absolute;z-index:-2;width:720px;height:240px;border-radius:50%;transform:rotate(-12deg);background:linear-gradient(135deg,#0a6f51,#0fa276);box-shadow:0 18px 0 #07523d,0 28px 45px rgba(7,82,61,.24)}.annual-theme-art .ribbon-one{left:-430px;top:-125px}.annual-theme-art .ribbon-two{right:-430px;bottom:-145px;transform:rotate(-10deg)}.annual-theme-art .orb{position:absolute;z-index:-1;border-radius:50%;background:radial-gradient(circle at 30% 26%,#fff9c4 0,#efc85f 28%,#c59022 68%,#8b6212 100%);box-shadow:inset -10px -12px 20px rgba(92,57,0,.2),0 14px 24px rgba(123,91,25,.2)}.annual-theme-art .orb-one{right:72px;top:62px;width:66px;height:66px}.annual-theme-art .orb-two{left:74px;bottom:70px;width:42px;height:42px}.annual-theme-art .content{display:flex;height:100%;flex-direction:column;align-items:center;justify-content:center;padding:40px 96px}.annual-theme-art .logo-shell{display:grid;width:118px;height:118px;place-items:center;border:1px solid #e2cb83;border-radius:30px;background:linear-gradient(145deg,#fff,#eee7d5);box-shadow:10px 12px 0 rgba(227,188,98,.4),0 22px 38px rgba(7,31,25,.14),inset 0 2px 0 #fff}.annual-theme-art .logo-shell img{width:98px;height:98px;object-fit:contain;filter:drop-shadow(0 8px 7px rgba(7,31,25,.18))}.annual-theme-art .eyebrow{margin:28px 0 0;color:#087f5b;font-size:13px;font-weight:900;letter-spacing:5px;text-transform:uppercase}.annual-theme-art .church{margin:8px 0 0;color:#557067;font-size:15px;font-weight:700;letter-spacing:.8px}.annual-theme-art .year{display:inline-block;margin:20px 0 8px;padding:8px 22px;border:1px solid #e3bc62;border-radius:999px;background:linear-gradient(#fffdf6,#f4e6bc);color:#8a651b;font-size:20px;font-weight:900;letter-spacing:5px;box-shadow:0 7px 0 #d2af58,0 12px 18px rgba(155,114,26,.15)}.annual-theme-art .title{max-width:900px;margin:18px auto 0;font-family:Georgia,'Times New Roman',serif;font-size:48px;line-height:1.08;text-shadow:0 3px 0 #fff,0 7px 14px rgba(7,31,25,.12)}.annual-theme-art .tamil{margin:12px 0 0;color:#087f5b;font-size:25px;font-weight:700}.annual-theme-art .divider{display:flex;align-items:center;gap:14px;margin:24px 0 15px;color:#b88722}.annual-theme-art .divider:before,.annual-theme-art .divider:after{content:'';width:90px;height:1px;background:linear-gradient(90deg,transparent,#c89b38)}.annual-theme-art .divider:after{background:linear-gradient(90deg,#c89b38,transparent)}.annual-theme-art .verse{max-width:800px;margin:0;color:#324c42;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-style:italic;line-height:1.5}.annual-theme-art .message{max-width:790px;margin:14px 0 0;color:#657a72;font-size:15px;line-height:1.5}@media print{html,body{width:297mm;height:210mm;margin:0}.annual-theme-sheet{width:297mm;height:210mm;padding:10mm}.annual-theme-art{height:190mm}}
`

function themeMarkup(year: string, englishTheme: string, tamilTheme: string, verse: string, message: string) {
  return `<article class="annual-theme-art"><div class="ribbon ribbon-one"></div><div class="ribbon ribbon-two"></div><div class="orb orb-one"></div><div class="orb orb-two"></div><div class="content"><div class="logo-shell"><img src="${escapeHtml(ydmLogo)}" alt="Youth Divine Movement logo"></div><p class="eyebrow">Annual ministry theme</p><p class="church">Jehovah Salvation Church · Youth Divine Movement</p><div class="year">${escapeHtml(year)}</div><h3 class="title">${escapeHtml(englishTheme)}</h3><p class="tamil">${escapeHtml(tamilTheme)}</p><div class="divider" aria-hidden="true">✦</div><blockquote class="verse">“${escapeHtml(verse)}”</blockquote><p class="message">${escapeHtml(message)}</p></div></article>`
}

function themeDocument(year: string, englishTheme: string, tamilTheme: string, verse: string, message: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JSC YDM Annual Theme ${escapeHtml(year)}</title><style>@page{size:A4 landscape;margin:0}${themeCss}</style></head><body><main class="annual-theme-sheet">${themeMarkup(year, englishTheme, tamilTheme, verse, message)}</main></body></html>`
}

async function imageDataUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('YDM logo could not be loaded')
  const blob = await response.blob()
  return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob) })
}

export default function AdminAnnualThemeBuilder() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [englishTheme, setEnglishTheme] = useState('Empowered by the Holy Spirit')
  const [tamilTheme, setTamilTheme] = useState('பரிசுத்த ஆவியினால் வல்லமை பெறுதல்')
  const [verse, setVerse] = useState('But ye shall receive power, after that the Holy Ghost is come upon you. — Acts 1:8')
  const [message, setMessage] = useState('A year of prayer, spiritual growth, faithful fellowship and Spirit-led service.')
  const [status, setStatus] = useState('')

  const createPdf = async () => {
    if (!/^\d{4}$/.test(year) || !englishTheme.trim() || !tamilTheme.trim() || !verse.trim()) { setStatus('Enter a four-digit year, both theme titles, and a Bible verse.'); return }
    setStatus('Creating annual theme PDF…')
    try { await downloadHtmlPdf(themeDocument(year, englishTheme, tamilTheme, verse, message), `jsc-ydm-annual-theme-${year}.pdf`, 'a4-landscape', '.annual-theme-sheet'); setStatus('Annual theme PDF downloaded.') }
    catch { setStatus('The PDF could not be created. Please try again.') }
  }

  const createPowerPoint = async () => {
    if (!/^\d{4}$/.test(year) || !englishTheme.trim() || !tamilTheme.trim() || !verse.trim()) { setStatus('Enter a four-digit year, both theme titles, and a Bible verse.'); return }
    setStatus('Creating one-slide PowerPoint…')
    try {
      const [{ default: PptxGenJS }, logoData] = await Promise.all([import('pptxgenjs'), imageDataUrl(ydmLogo)])
      const pptx = new PptxGenJS()
      pptx.layout = 'LAYOUT_WIDE'; pptx.author = 'JSC Youth Divine Movement'; pptx.subject = `Annual ministry theme ${year}`; pptx.title = englishTheme; pptx.company = 'Jehovah Salvation Church, Kollemcode'; pptx.theme = { headFontFace: 'Georgia', bodyFontFace: 'Aptos' }
      const slide = pptx.addSlide(); slide.background = { color: 'F5F0E4' }
      slide.addShape(pptx.ShapeType.roundRect, { x: .34, y: .3, w: 12.65, h: 6.88, rectRadius: .12, fill: { color: 'FFFEF9' }, line: { color: 'D7C183', width: 1.2 }, shadow: { type: 'outer', color: '173F32', blur: 3, angle: 45, offset: 4, opacity: .18 } })
      slide.addShape(pptx.ShapeType.arc, { x: -1.15, y: -.7, w: 5.5, h: 2.4, rotate: 350, fill: { color: '0A8A65' }, line: { color: '0A8A65', transparency: 100 }, shadow: { type: 'outer', color: '07523D', blur: 2, angle: 90, offset: 5, opacity: .32 } })
      slide.addShape(pptx.ShapeType.arc, { x: 9.75, y: 5.95, w: 5.1, h: 2.35, rotate: 170, fill: { color: '0A8A65' }, line: { color: '0A8A65', transparency: 100 } })
      slide.addShape(pptx.ShapeType.ellipse, { x: 11.73, y: .65, w: .62, h: .62, fill: { color: 'E3BC62' }, line: { color: 'C59022' }, shadow: { type: 'outer', color: '8B6212', blur: 2, angle: 45, offset: 3, opacity: .25 } })
      slide.addShape(pptx.ShapeType.roundRect, { x: 5.82, y: .52, w: 1.7, h: 1.48, rectRadius: .08, fill: { color: 'FFFFFF' }, line: { color: 'E2CB83' }, shadow: { type: 'outer', color: '8A651B', blur: 3, angle: 45, offset: 4, opacity: .22 } })
      slide.addImage({ data: logoData, x: 6.08, y: .64, w: 1.18, h: 1.18 })
      const titleSize = englishTheme.length > 76 ? 18 : englishTheme.length > 46 ? 23 : 29
      const tamilSize = tamilTheme.length > 80 ? 12 : tamilTheme.length > 54 ? 14 : 17
      const verseSize = verse.length > 145 ? 9.5 : verse.length > 95 ? 11 : 12.5
      const messageSize = message.length > 150 ? 8.5 : message.length > 100 ? 9.5 : 10.5
      const textBox = { align: 'center' as const, valign: 'middle' as const, margin: [.02, .06, .02, .06] as [number, number, number, number], fit: 'shrink' as const }
      slide.addText('ANNUAL MINISTRY THEME', { x: 2, y: 2.04, w: 9.33, h: .28, fontFace: 'Aptos', fontSize: 10, bold: true, color: '087F5B', charSpacing: 3.2, ...textBox })
      slide.addText('Jehovah Salvation Church · Youth Divine Movement', { x: 1.5, y: 2.35, w: 10.33, h: .34, fontFace: 'Aptos', fontSize: 11, bold: true, color: '557067', ...textBox })
      slide.addShape(pptx.ShapeType.roundRect, { x: 5.55, y: 2.76, w: 2.23, h: .53, rectRadius: .08, fill: { color: 'F4E6BC' }, line: { color: 'E3BC62' }, shadow: { type: 'outer', color: 'B98D2E', blur: 1.5, angle: 90, offset: 3, opacity: .25 } })
      slide.addText(year, { x: 5.55, y: 2.86, w: 2.23, h: .3, fontFace: 'Aptos', fontSize: 16, bold: true, color: '8A651B', charSpacing: 3, ...textBox })
      slide.addText(englishTheme, { x: 1.05, y: 3.42, w: 11.23, h: .9, fontFace: 'Georgia', fontSize: titleSize, bold: true, color: '071F19', ...textBox })
      slide.addText(tamilTheme, { x: 1.2, y: 4.32, w: 10.93, h: .62, fontFace: 'Nirmala UI', fontSize: tamilSize, bold: true, color: '087F5B', ...textBox })
      slide.addText('✦', { x: 5.9, y: 4.98, w: 1.53, h: .28, fontFace: 'Georgia', fontSize: 16, color: 'B88722', ...textBox })
      slide.addText(`“${verse}”`, { x: 1.5, y: 5.33, w: 10.33, h: .72, fontFace: 'Georgia', fontSize: verseSize, italic: true, color: '324C42', ...textBox })
      slide.addText(message, { x: 1.72, y: 6.15, w: 9.9, h: .62, fontFace: 'Aptos', fontSize: messageSize, color: '657A72', ...textBox })
      await pptx.writeFile({ fileName: `jsc-ydm-annual-theme-${year}.pptx` })
      setStatus('One-slide PowerPoint downloaded.')
    } catch { setStatus('The PowerPoint could not be created. Please try again.') }
  }

  return <section className="soft-card mb-6 overflow-hidden border border-emerald-100">
    <div className="mb-6 flex items-center gap-3"><span className="icon-box"><Palette size={20} /></span><div><p className="eyebrow">Annual year</p><h2 className="text-xl font-black">Theme builder</h2><p className="text-sm text-slate-500">Edit the ministry theme and create a bright, dimensional annual PDF.</p></div></div>
    <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
      <div className="grid content-start gap-4"><label className="field-label">Annual year<input className="field" inputMode="numeric" maxLength={4} value={year} onChange={event => setYear(event.target.value.replace(/\D/g, ''))} /></label><label className="field-label">English theme<input className="field" value={englishTheme} onChange={event => setEnglishTheme(event.target.value)} /></label><label className="field-label">Tamil theme<input className="field" value={tamilTheme} onChange={event => setTamilTheme(event.target.value)} /></label><label className="field-label">Bible verse<textarea className="field min-h-24 resize-none" value={verse} onChange={event => setVerse(event.target.value)} /></label><label className="field-label">Annual message<textarea className="field min-h-24 resize-none" value={message} onChange={event => setMessage(event.target.value)} /></label><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1"><button type="button" className="primary-btn justify-center" onClick={() => void createPdf()}><Download size={17} /> Download one-page PDF</button><button type="button" className="secondary-dark-btn justify-center" onClick={() => void createPowerPoint()}><FileText size={17} /> Download one-slide PPT</button></div>{status && <p role="status" className="text-sm font-semibold text-emerald-800">{status}</p>}</div>
      <div className="min-w-0 overflow-x-auto rounded-[28px] border border-[#e3bc62]/60 bg-[#f5f0e4] p-3 shadow-inner" tabIndex={0} aria-label="Annual theme preview. Scroll horizontally on a small screen to view the full design."><style>{themeCss}</style><div className="mx-auto h-[545px] w-[770px] max-w-none"><div className="theme-preview-scale" dangerouslySetInnerHTML={{ __html: themeMarkup(year || 'Year', englishTheme || 'English theme', tamilTheme || 'Tamil theme', verse || 'Bible verse', message) }} /></div></div>
    </div>
  </section>
}
