import { ArrowRight, HandHeart, MapPin, Sparkles, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import PanoramaExperience from '../components/PanoramaExperience'
import { programs } from '../data/siteData'
import holyBibleGif from '../assets/holy-bible.gif'
import missionaryStoryWebp from '../assets/missionary-story.webp'
import musicGif from '../assets/music.gif'

const pillars = [
  { icon: null, image: holyBibleGif, title: 'Grow in the Word', text: 'Build a strong Biblical foundation through learning, discussion and discipleship.' },
  { icon: UsersRound, image: null, title: 'Belong Together', text: 'Create meaningful friendships and a youth community where everyone can participate.' },
  { icon: HandHeart, image: null, title: 'Serve with Purpose', text: 'Use our gifts in church and community through compassion, outreach and leadership.' },
]

export default function Home() {
  return (
    <>
      <section className="relative flex min-h-[min(760px,100svh)] items-center overflow-hidden bg-[#071f19] pt-[4.5rem] text-white sm:min-h-screen sm:pt-20">
        <img src="/screenshots/church-04.png" alt="JSC Kollemcode church campus" className="absolute inset-0 z-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#041511]/80 via-[#041511]/45 to-transparent" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#041511]/80 via-transparent to-[#041511]/20" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 lg:px-8">
          <div className="home-hero-content max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e3bc62]/30 bg-[#e3bc62]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#f0d28d]"><Sparkles size={14}/> Faith • Fellowship • Service</div>
            <h1 className="text-[clamp(2.8rem,12vw,5rem)] font-black leading-[.98] tracking-[-.04em] sm:text-7xl lg:text-8xl">A generation<br/><span className="text-[#e3bc62]">growing in church.</span></h1>
            <p className="mt-6 max-w-2xl text-sm leading-7 text-white/65 sm:mt-7 sm:text-lg sm:leading-8">JSC Youth Development Ministry is a place for young people to worship, learn, serve, lead and build friendships that strengthen faith for life.</p>
            <div className="mt-8 flex max-w-sm flex-col gap-3 sm:mt-9 sm:max-w-none sm:flex-row sm:flex-wrap"><Link to="/about" className="primary-btn">Discover our ministry <ArrowRight size={18}/></Link><Link to="/members" className="secondary-btn">Meet YDM</Link></div>
          </div>
        </div>
        <div className="absolute bottom-7 right-6 hidden items-center gap-3 text-xs uppercase tracking-[0.18em] text-white/45 md:flex"><span className="h-px w-12 bg-white/30"/> Scroll to explore</div>
      </section>

      <section className="home-purpose bg-stone-50 py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="eyebrow">Our purpose</p><h2 className="section-title">Rooted in faith.<br/>Ready to serve.</h2></div><p className="max-w-2xl text-lg leading-8 text-slate-600">We want every young person to know Christ personally, discover their gifts, grow in character and become a positive influence in church, family and community.</p></div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">{pillars.map((p) => <article key={p.title} className="soft-card"><span className="icon-box">{p.image ? <img src={p.image} alt="Bible Reference" className="h-11 w-11 object-contain" /> : p.icon ? <p.icon size={23}/> : null}</span><h3 className="mt-6 text-xl font-black">{p.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{p.text}</p></article>)}</div>
        </div>
      </section>

      <section className="bg-[#071f19] pt-20 text-white sm:pt-24"><div className="mx-auto max-w-7xl px-5 pb-8 lg:px-8"><p className="eyebrow text-[#e3bc62]">Explore our place</p><h2 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Experience the JSC campus through a 360°-inspired journey.</h2></div><PanoramaExperience /></section>

      <section className="bg-white py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Ways to grow</p><h2 className="section-title">Programs for every<br/>step of the journey.</h2></div><Link to="/programs" className="secondary-dark-btn">View all programs <ArrowRight size={17}/></Link></div><div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{programs.slice(0, 3).map(program => <article key={program.id} className="program-card soft-card"><span className="home-program-symbol"><img src={program.id === 1 ? holyBibleGif : program.id === 2 ? missionaryStoryWebp : musicGif} alt={`${program.title} symbol`} /></span><p className="mt-7 text-xs font-bold uppercase tracking-[.16em] text-emerald-700">{program.schedule}</p><h3 className="mt-3 text-xl font-black">{program.title}</h3><p className="mt-3 text-sm leading-7 text-slate-600">{program.description}</p></article>)}</div></div></section>

      <section className="home-cta bg-[#e3bc62] py-10 sm:py-14"><div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-2 lg:items-stretch lg:px-8"><div className="min-h-[300px] overflow-hidden rounded-3xl border border-[#071f19]/15 bg-[#071f19]/10 shadow-[0_14px_32px_rgba(4,21,17,.14)]"><iframe title="Jehovah Salvation Church, Kollamcode location" src="https://www.google.com/maps?q=8.2953514,77.1204252&z=17&output=embed" className="h-full min-h-[300px] w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div><div className="flex flex-col justify-center py-2 text-[#071f19]"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#071f19]/85">Visit our church</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Jehovah Salvation Church</h2><div className="mt-5 flex items-start gap-3 text-sm leading-7 text-[#071f19]/80"><span className="location-pin-3d" aria-hidden="true"><MapPin size={24}/></span><p>Kollemcode, Tamil Nadu<br/>Come worship, grow in the Word and connect with our youth community.</p></div><div className="mt-5 rounded-2xl border border-[#071f19]/15 bg-[#071f19]/8 px-4 py-3 text-sm font-semibold leading-6"><span className="block text-xs font-bold uppercase tracking-[.14em] text-[#071f19]/65">Service time</span>12:45 PM–1:30 PM · 1st &amp; 3rd week of every month</div><p className="mt-4 text-sm font-semibold">YDM Presidents: Jayan &amp; Kabin Juliet</p><a href="https://www.google.com/maps/dir/?api=1&destination=8.2953514%2C77.1204252" target="_blank" rel="noreferrer" className="dark-btn mt-7 w-fit">Get directions <ArrowRight size={18}/></a></div></div></section>
    </>
  )
}
