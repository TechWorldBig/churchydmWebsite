import { Home, RefreshCw, ServerCrash } from 'lucide-react'
import ydmLogo from '../assets/jsc-ydm-logo.png'
import { systemErrorCopy, type SystemErrorStatus } from '../data/systemError'

export default function SystemErrorPage({ status = 500 }: { status?: SystemErrorStatus }) {
  const content = systemErrorCopy[status]

  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden bg-[#071f19] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden="true">
        <div className="absolute left-[-9rem] top-[-7rem] h-80 w-80 rounded-full border border-[#e3bc62]/15" />
        <div className="absolute bottom-[-10rem] right-[-8rem] h-96 w-96 rounded-full border border-white/10" />
        <div className="absolute left-1/2 top-1/2 h-px w-[42rem] max-w-[120vw] -translate-x-1/2 -rotate-6 bg-gradient-to-r from-transparent via-[#e3bc62]/40 to-transparent" />
      </div>

      <section className="w-full max-w-2xl text-center" aria-labelledby="system-error-title" role="alert">
        <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-[28px] border border-white/10 bg-white/[.06] shadow-2xl shadow-black/25">
          <img src={ydmLogo} alt="" aria-hidden="true" className="h-16 w-16 object-contain opacity-90" />
          <span className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full bg-[#e3bc62] text-[#071f19] shadow-lg"><ServerCrash size={20} aria-hidden="true" /></span>
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-[.24em] text-[#e3bc62]">{content.eyebrow}</p>
        <h1 id="system-error-title" className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{content.title}</h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-white/70 sm:text-base">{content.description}</p>
        <div className="mx-auto mt-8 flex max-w-md flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => window.location.reload()} className="primary-btn justify-center"><RefreshCw size={17} aria-hidden="true" /> Try again</button>
          <a href="/" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/[.06] px-5 py-3.5 text-sm font-bold text-white transition hover:border-[#e3bc62]/60 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e3bc62]"><Home size={17} aria-hidden="true" /> Go to home</a>
        </div>
      </section>
    </main>
  )
}
