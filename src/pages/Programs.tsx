import { ArrowRight, BookOpen, CalendarDays, HeartHandshake, Music2, Sparkles, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHero from '../components/PageHero'
import { programs } from '../data/siteData'
import holyBibleGif from '../assets/holy-bible.gif'
import missionaryStoryWebp from '../assets/missionary-story.webp'
import musicGif from '../assets/music.gif'
import bibleMessageGif from '../assets/bible-message.gif'
import bibleQuizPng from '../assets/bible-quiz.png'

const icons = [BookOpen, UsersRound, Music2, HeartHandshake, Sparkles, CalendarDays]

export default function Programs() {
  return <>
    <PageHero eyebrow="The Word. The worship. The walk." title="Programs rooted in Scripture" description="Meet with us during the 1st and 3rd weeks of every month to study the Bible, celebrate the gospel, learn from faithful servants and grow closer to Christ." icon={<Sparkles size={15} />} />
    <section className="py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{programs.map((program, index) => { const Icon = icons[index]; return <article key={program.id} className="soft-card group relative overflow-hidden"><span className="absolute right-6 top-5 text-5xl font-black text-emerald-700 transition group-hover:text-emerald-800">{program.icon}</span>{program.id === 1 ? <span className="program-bible-icon relative"><img src={holyBibleGif} alt="Holy Bible" /></span> : program.id === 2 ? <span className="program-bible-icon relative"><img src={missionaryStoryWebp} alt="Missionary story" /></span> : program.id === 3 ? <span className="program-bible-icon relative"><img src={musicGif} alt="Music note" /></span> : program.id === 4 ? <span className="program-bible-icon relative"><img src={bibleQuizPng} alt="Bible Quiz" /></span> : program.id === 5 ? <span className="program-bible-icon relative"><img src={bibleMessageGif} alt="Bible message" /></span> : <span className="icon-box relative"><Icon size={22} /></span>}<p className="mt-7 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">{program.schedule}</p><h2 className="mt-2 text-2xl font-black">{program.title}</h2><p className="mt-3 text-sm leading-7 text-slate-600">{program.description}</p></article> })}</div>
      <div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-3xl bg-[#071f19] p-8 text-white md:flex-row md:items-center"><div><p className="eyebrow text-[#e3bc62]">Find your place</p><h2 className="mt-2 text-3xl font-black">Grow with us.</h2><p className="mt-3 max-w-xl text-sm leading-7 text-white/60">Join a gathering, meet the team and discover how you can take part in the life of JSC YDM.</p></div><Link to="/about" className="primary-btn shrink-0">Learn about us <ArrowRight size={17} /></Link></div>
    </div></section>
  </>
}
