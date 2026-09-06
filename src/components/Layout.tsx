import { type ReactNode, useEffect, useState } from 'react'
import { Menu, X, Cross, Instagram, Youtube } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import ChurchAssistant from './ChurchAssistant'

const links = [
  ['Home', '/'],
  ['YDM Members', '/members'],
  ['Gallery', '/gallery'],
  ['Programs', '/programs'],
  ['Attendance', '/attendance'],
  ['Offering', '/offering'],
  ['About', '/about'],
  ['Admin', '/admin'],
] as const

export default function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }) }, [pathname])
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); document.querySelector<HTMLButtonElement>('.menu-toggle')?.focus() } }
    if (open) window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [open])

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071f19]/88 text-white backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:h-14 sm:px-5 lg:px-8">
          <Link to="/" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e3bc62] text-[#071f19] shadow-lg shadow-black/15 transition group-hover:rotate-3 sm:h-10 sm:w-10 sm:rounded-2xl">
              <Cross size={20} strokeWidth={2.4} />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black tracking-[0.08em] sm:text-base">JSC YDM</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55 sm:block">Youth Development Ministry</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
            {links.map(([label, to]) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `rounded-full px-3 py-1.5 text-xs font-semibold transition ${isActive ? 'bg-white text-[#071f19]' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <button className="menu-toggle rounded-xl p-2 lg:hidden" aria-expanded={open} aria-label={open ? 'Close navigation' : 'Open navigation'} onClick={() => setOpen((v) => !v)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>
        <div className="verse-ticker" role="marquee" aria-label="வாலவயதின் குமாரர் பலவான் கையிலுள்ள அம்புகளுக்கு ஒப்பாயிருக்கிறார்கள். சங்கீதம் 127:5">
          <div className="verse-ticker-track" aria-hidden="true">
            <span>வாலவயதின் குமாரர் பலவான் கையிலுள்ள அம்புகளுக்கு ஒப்பாயிருக்கிறார்கள். <b>சங்கீதம் 127:5</b></span>
          </div>
        </div>
        <div className="verse-ticker verse-ticker-updated" role="marquee" aria-label="Psalm 127:5 in English, Tamil, and Malayalam">
          <div className="verse-ticker-track" aria-hidden="true">
            <span>Happy is the man that hath his quiver full of them: they shall not be ashamed, but they shall speak with the enemies in the gate. <b>Psalm 127:5</b> &nbsp;|&nbsp; ஆதவயதின் குமாரர் பலவான் கையிலுள்ள அம்புகளுக்கு ஒப்பாயிருக்கிறார்கள். <b>சங்கீதம் 127:5</b> &nbsp;|&nbsp; ആവനാഴി നിറഞ്ഞിരിക്കുന്ന മനുഷ്യൻ ഭാഗ്യവാൻ. പടിവാതിൽക്കൽവെച്ചു ശത്രുക്കളോടു തർക്കിക്കുമ്പോൾ അവർ ലജ്ജിച്ചുപോകയില്ല. <b>സങ്കീർത്തനങ്ങൾ 127:5</b></span>
            <span aria-hidden="true">Happy is the man that hath his quiver full of them: they shall not be ashamed, but they shall speak with the enemies in the gate. <b>Psalm 127:5</b> &nbsp;|&nbsp; ஆதவயதின் குமாரர் பலவான் கையிலுள்ள அம்புகளுக்கு ஒப்பாயிருக்கிறார்கள். <b>சங்கீதம் 127:5</b> &nbsp;|&nbsp; ആവനാഴി നിറഞ്ഞിരിക്കുന്ന മനുഷ്യൻ ഭാഗ്യവാൻ. പടിവാതിൽക്കൽവെച്ചു ശത്രുക്കളോടു തർക്കിക്കുമ്പോൾ അവർ ലജ്ജിച്ചുപോകയില്ല. <b>സങ്കീർത്തനങ്ങൾ 127:5</b></span>
          </div>
        </div>
        <AnimatePresence>
          {open && (
            <motion.nav aria-label="Mobile navigation" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mobile-nav overflow-hidden border-t border-white/10 bg-[#071f19] px-4 shadow-2xl lg:hidden">
              <div className="grid gap-1 py-4">
                {links.map(([label, to]) => (
                  <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `rounded-xl px-4 py-3 font-semibold ${isActive ? 'bg-white text-[#071f19]' : 'text-white/70'}`}>
                    {label}
                  </NavLink>
                ))}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main id="main-content" tabIndex={-1}>{children}</main>

      <footer className="site-footer bg-[#041511] text-white">
        <div className="footer-content mx-auto grid max-w-7xl gap-5 px-5 py-3 lg:px-8">
          <div className="footer-brand">
            <div className="mb-3 flex items-center gap-3 text-sm font-black sm:text-base"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e3bc62] text-[#071f19]"><Cross size={19} /></span><span>JSC Youth Development Ministry</span></div>
            <p className="max-w-md text-sm leading-7 text-white/55">A Christ-centered youth community growing together through worship, Scripture, fellowship, service and leadership.</p>
          </div>
          <div className="footer-explore">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#e3bc62]">Explore</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-white/60"><div className="grid gap-1"><Link className="footer-link" to="/members">YDM Members</Link><Link className="footer-link" to="/gallery">Gallery</Link><Link className="footer-link" to="/programs">Programs</Link></div><div className="grid gap-1"><Link className="footer-link" to="/attendance">Attendance</Link><Link className="footer-link" to="/about">About</Link></div></div>
          </div>
          <div className="footer-connect">
            <h3 className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#e3bc62]">Connect</h3>
            <div className="flex gap-3" role="group" aria-label="Social media"><span className="social-icon"><Instagram size={18} /></span><span className="social-icon"><Youtube size={18} /></span></div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-2 text-center text-xs text-white/65">© {new Date().getFullYear()} JSC Youth Development Ministry. Faith • Fellowship • Service.</div>
      </footer>
      <ChurchAssistant />
    </div>
  )
}
