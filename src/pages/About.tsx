import { useEffect, useRef } from 'react'
import { Church } from 'lucide-react'
import PageHero from '../components/PageHero'
import missionGif from '../assets/mission.gif'
import foundationGif from '../assets/foundation-3d.gif'
import communityGif from '../assets/community-3d.gif'

function TransparentGif({ src, alt }: { src: string; alt: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return
    const image = new Image()
    let timer = 0
    const render = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const frame = context.getImageData(0, 0, canvas.width, canvas.height)
      for (let index = 0; index < frame.data.length; index += 4) {
        if (frame.data[index] < 12 && frame.data[index + 1] < 12 && frame.data[index + 2] < 12) frame.data[index + 3] = 0
      }
      context.putImageData(frame, 0, 0)
    }
    image.onload = () => { render(); timer = window.setInterval(render, 80) }
    image.src = src
    return () => { window.clearInterval(timer); image.onload = null }
  }, [src])

  return <canvas ref={canvasRef} width="96" height="96" role="img" aria-label={alt} className="block h-16 w-16" />
}

export default function About() {
  return <><PageHero eyebrow="Who we are" title="About JSC YDM Kollemcode" description="JSC Youth Divine Movement Kollemcode is a Christ-centered community helping young people know Jesus, grow in character, discover their calling and serve with confidence." icon={<Church size={15}/>}/><section className="py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid gap-12 lg:grid-cols-2 lg:items-center"><div><p className="eyebrow">Our story</p><h2 className="section-title">Young faith.<br/>Strong foundation.</h2><p className="mt-6 text-base leading-8 text-slate-600">JSC Youth Divine Movement Kollemcode brings young people together for spiritual growth, worship, fellowship, skill development and meaningful service. The ministry exists to build disciples who are rooted in Scripture and ready to make a positive difference.</p></div><img src="/screenshots/church-01.png" alt="JSC Kollemcode church sign and campus" className="h-[420px] w-full rounded-[2rem] object-cover shadow-2xl shadow-slate-900/10"/></div><div className="mt-16 grid gap-5 md:grid-cols-3"><article className="soft-card"><img src={missionGif} alt="Mission" className="h-14 w-14 object-contain"/><h3 className="mt-5 text-xl font-black">Mission</h3><p className="mt-3 text-sm leading-7 text-slate-600">Equip youth to grow spiritually, lead responsibly and serve faithfully.</p></article><article className="soft-card"><TransparentGif src={foundationGif} alt="Foundation"/><h3 className="mt-5 text-xl font-black">Foundation</h3><p className="mt-3 text-sm leading-7 text-slate-600">Christ-centered teaching, prayer, worship and practical discipleship.</p></article><article className="soft-card"><TransparentGif src={communityGif} alt="Community"/><h3 className="mt-5 text-xl font-black">Community</h3><p className="mt-3 text-sm leading-7 text-slate-600">A welcoming fellowship where every young person can belong and contribute.</p></article></div></div></section></>
}
