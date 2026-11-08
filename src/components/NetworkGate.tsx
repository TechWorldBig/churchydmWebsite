import { type ReactNode, useEffect, useState } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'
import ydmLogo from '../assets/jsc-ydm-logo-web.png'

export default function NetworkGate({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(() => !navigator.onLine)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    const handleOffline = () => {
      setChecking(false)
      setOffline(true)
    }
    const handleOnline = () => {
      setChecking(true)
      window.location.reload()
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  const tryAgain = () => {
    if (!navigator.onLine) {
      setOffline(true)
      return
    }
    setChecking(true)
    window.location.reload()
  }

  if (!offline) return children

  return (
    <main className="grid min-h-dvh place-items-center overflow-hidden bg-[#071f19] px-5 py-10 text-white">
      <section className="relative w-full max-w-xl text-center" aria-labelledby="offline-title" aria-live="polite">
        <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-full border border-white/10 bg-white/5 shadow-2xl shadow-black/25">
          <img src={ydmLogo} width="320" height="320" alt="" aria-hidden="true" className="h-16 w-16 object-contain" />
          <span className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-full bg-[#e3bc62] text-[#071f19] shadow-lg"><WifiOff size={20} aria-hidden="true" /></span>
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-[.24em] text-[#e3bc62]">Connection paused</p>
        <h1 id="offline-title" className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">You’re offline</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/65 sm:text-base">Check your Wi-Fi or mobile data. This page will refresh automatically as soon as your internet connection returns.</p>
        <button type="button" onClick={tryAgain} disabled={checking} className="primary-btn mx-auto mt-8 min-w-40 justify-center disabled:cursor-wait disabled:opacity-70">
          <RefreshCw size={17} className={checking ? 'animate-spin' : ''} aria-hidden="true" />
          {checking ? 'Reconnecting…' : 'Try again'}
        </button>
      </section>
    </main>
  )
}
