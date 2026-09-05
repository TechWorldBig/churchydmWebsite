import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

type PageHeroProps = {
  eyebrow: string
  title: string
  description: string
  icon?: ReactNode
  compact?: boolean
}

export default function PageHero({ eyebrow, title, description, icon, compact = false }: PageHeroProps) {
  const titleId = `page-title-${eyebrow.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <section className={`page-hero relative overflow-hidden bg-[#071f19] text-white ${compact ? 'pb-7 pt-24 sm:pb-10 sm:pt-24' : 'pb-14 pt-28 sm:pb-20 sm:pt-36'}`}>
      <div className="absolute -right-24 top-16 h-80 w-80 rounded-full bg-[#e3bc62]/10 blur-3xl" />
      <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#e3bc62]/60 to-transparent" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative mx-auto w-full max-w-7xl px-5 lg:px-8" aria-labelledby={titleId}>
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#e3bc62]">{icon}{eyebrow}</div>
        <h1 id={titleId} className="max-w-4xl text-4xl font-black leading-[1.05] tracking-[-0.03em] sm:text-6xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:mt-5 sm:text-lg sm:leading-8">{description}</p>
      </motion.div>
    </section>
  )
}
