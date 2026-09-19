import { useEffect, useMemo, useState } from 'react'
import { Users } from 'lucide-react'
import PageHero from '../components/PageHero'
import { Member } from '../data/memberStore'
import { getMembers } from '../data/api'

const isYdmPresident = (role: string) => {
  const normalized = role.trim().toLowerCase().replace(/\s+/g, ' ')
  return /\bpresident\b/u.test(normalized) && !/\bvice\s+president\b/u.test(normalized)
}

export default function Members() {
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    const load = () => { void getMembers().then(setMembers).catch(() => undefined) }
    load()
    const timer = window.setInterval(load, 15_000)
    return () => window.clearInterval(timer)
  }, [])

  const orderedMembers = useMemo(() => members
    .map((member, index) => ({ member, index }))
    .sort((a, b) => Number(isYdmPresident(b.member.role)) - Number(isYdmPresident(a.member.role)) || a.index - b.index)
    .map(({ member }) => member), [members])

  return <><PageHero eyebrow="Our people" title="YDM Members" description="Meet the young people serving together with different gifts and one purpose — to glorify Christ and strengthen the youth community." icon={<Users size={15} />} /><section className="py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8">
    {members.length === 0 ? <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">Member profiles added by the administrator will appear here.</div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{orderedMembers.map((member) => <article key={member.id} className="soft-card overflow-hidden p-0"><div className="h-52 bg-[#071f19]">{member.photo ? <img src={member.photo} alt={member.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-5xl font-black text-[#e3bc62]">{member.name.slice(0, 2).toUpperCase()}</div>}</div><div className="p-6"><p className="text-xs font-bold uppercase tracking-[.16em] text-emerald-700">{member.role}</p><h2 className="mt-2 text-2xl font-black">{member.name}</h2></div></article>)}</div>}
    <div className="mt-10 rounded-3xl bg-[#071f19] p-7 text-center text-white"><p className="eyebrow text-[#e3bc62]">Join the community</p><p className="mt-2 text-lg font-bold">There is a place for your gifts, your questions and your story.</p></div>
  </div></section></>
}
