import { ArrowLeft, Home, MapPinned } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <section className="relative isolate grid min-h-[72svh] place-items-center overflow-hidden bg-stone-50 px-5 pb-20 pt-36 sm:pt-44">
      <div className="pointer-events-none absolute left-1/2 top-28 -z-10 -translate-x-1/2 select-none text-[12rem] font-black leading-none tracking-[-.1em] text-emerald-950/[.045] sm:text-[20rem]" aria-hidden="true">404</div>
      <div className="w-full max-w-2xl text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#071f19] text-[#e3bc62] shadow-xl shadow-emerald-950/15"><MapPinned size={30} aria-hidden="true" /></span>
        <p className="mt-7 text-xs font-black uppercase tracking-[.22em] text-emerald-700">Error 404</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-[#071f19] sm:text-6xl">This page isn’t here</h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-slate-600 sm:text-base">The link may be outdated, or the page may have moved. Return home or go back to the page you were viewing.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/" className="primary-btn justify-center"><Home size={17} aria-hidden="true" /> Go to home</Link>
          <button type="button" onClick={() => navigate(-1)} className="secondary-dark-btn justify-center"><ArrowLeft size={17} aria-hidden="true" /> Go back</button>
        </div>
      </div>
    </section>
  )
}
