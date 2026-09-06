import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { MoveHorizontal, Pause, Play } from 'lucide-react'
import { panoramaFrames } from '../data/siteData'

export default function PanoramaExperience() {
  const reduceMotion = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (paused || reduceMotion) return
    const timer = window.setInterval(() => setIndex(current => (current + 1) % panoramaFrames.length), 4500)
    return () => window.clearInterval(timer)
  }, [paused, reduceMotion])

  return <div id="panorama-stage" className="group relative h-[72vh] min-h-[560px] overflow-hidden bg-black"><AnimatePresence initial={false}><motion.img loading="lazy" decoding="async" key={panoramaFrames[index]} src={panoramaFrames[index]} alt={`JSC campus view ${index + 1}`} initial={reduceMotion ? false : { opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1.01 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: .9, ease: [0.22, 1, 0.36, 1] }} className="panorama-image absolute inset-0 h-full w-full object-cover" draggable={false} /></AnimatePresence><div className="absolute inset-0 bg-gradient-to-b from-[#031611]/15 via-transparent to-[#031611]/90" /><div className="panorama-controls absolute inset-x-0 bottom-0 mx-auto max-w-7xl px-5 pb-9 lg:px-8"><div className="flex justify-between"><button type="button" aria-label={reduceMotion ? "Slideshow paused for reduced motion" : paused ? "Play slideshow" : "Pause slideshow"} disabled={Boolean(reduceMotion)} onClick={() => setPaused(value => !value)} className="panorama-button">{paused || reduceMotion ? <Play size={18} /> : <Pause size={18} />}</button><div className="glass-dark flex items-center gap-2 rounded-full px-4 py-3 text-xs font-semibold text-white/70"><MoveHorizontal size={15} /> {index + 1} / {panoramaFrames.length}</div></div><div className="mt-5 flex justify-end gap-2">{panoramaFrames.map((_, itemIndex) => <span key={itemIndex} className={`h-1.5 rounded-full transition-all duration-500 ${itemIndex === index ? 'w-12 bg-[#e3bc62]' : 'w-5 bg-white/35'}`} aria-hidden="true" />)}</div></div></div>
}
