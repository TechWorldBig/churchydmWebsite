import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { panoramaFrames } from '../data/siteData'

export default function PanoramaExperience() {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => setIndex(current => (current + 1) % panoramaFrames.length), 4500)
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  return <div id="panorama-stage" className="group relative h-[72vh] min-h-[560px] overflow-hidden bg-black"><AnimatePresence initial={false}><motion.img loading="lazy" decoding="async" key={panoramaFrames[index]} src={panoramaFrames[index]} alt={`JSC campus view ${index + 1}`} initial={reduceMotion ? false : { opacity: 0, scale: 1.06 }} animate={{ opacity: 1, scale: 1.01 }} exit={{ opacity: 0, scale: 1.03 }} transition={{ duration: .9, ease: [0.22, 1, 0.36, 1] }} className="panorama-image absolute inset-0 h-full w-full object-cover" draggable={false} /></AnimatePresence></div>
}
