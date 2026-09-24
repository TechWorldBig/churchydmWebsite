import type { AttendanceRecord, Member, ProgramPoint } from './memberStore'

export type CertificateAward = {
  id: string
  member: Member
  kind: 'attendance' | 'program' | 'appreciation'
  title: string
  reason: string
  detail: string
  year: string
}

const programs = ['Bible Quiz', 'Bible Reference', 'Song Survey'] as const
const levels = ['Kutties', 'Junior', 'Senior'] as const

export function getCertificateAwards(members: Member[], records: AttendanceRecord[], points: ProgramPoint[], year: string): CertificateAward[] {
  const yearRecords = records.filter(record => record.date.startsWith(`${year}-`))
  const meetingDates = [...new Set(yearRecords.map(record => record.date))]
  const attendance = meetingDates.length === 0 ? [] : members.flatMap(member => {
    const byDate = new Map<string, boolean>()
    yearRecords.filter(record => record.memberId === member.id).forEach(record => byDate.set(record.date, record.present))
    if (!meetingDates.every(date => byDate.get(date) === true)) return []
    return [{
      id: `attendance-${year}-${member.id}`, member, kind: 'attendance' as const,
      title: 'Perfect attendance', year,
      reason: `In recognition of 100% attendance at every recorded YDM meeting in ${year}.`,
      detail: `${meetingDates.length} of ${meetingDates.length} meeting${meetingDates.length === 1 ? '' : 's'} attended`,
    }]
  })

  const memberById = new Map(members.map(member => [member.id, member]))
  const uniquePoints = new Map<string, ProgramPoint>()
  points.filter(point => point.date.startsWith(`${year}-`)).forEach(point => {
    uniquePoints.set(`${point.memberId}-${point.program}-${point.date}`, point)
  })
  const programAwards: CertificateAward[] = []
  for (const program of programs) for (const level of levels) {
    const totals = new Map<string, number>()
    for (const point of uniquePoints.values()) {
      const member = memberById.get(point.memberId)
      if (!member || member.seniority !== level || point.program !== program) continue
      totals.set(member.id, (totals.get(member.id) || 0) + point.questionsAnswered)
    }
    const ranked = [...totals.entries()]
      .filter(([, score]) => score > 0)
      .sort(([idA, scoreA], [idB, scoreB]) => scoreB - scoreA || memberById.get(idA)!.name.localeCompare(memberById.get(idB)!.name) || idA.localeCompare(idB))
    const distinctScores = [...new Set(ranked.map(([, score]) => score))].slice(0, 2)
    for (const [memberId, score] of ranked) {
      const rank = distinctScores.indexOf(score) + 1
      if (rank === 0) continue
      const member = memberById.get(memberId)!
      const place = rank === 1 ? 'First place' : 'Second place'
      programAwards.push({
        id: `program-${year}-${program}-${level}-${memberId}`, member, kind: 'program',
        title: `${place} · ${program}`, year,
        reason: `In recognition of ${place.toLowerCase()} in ${program} (${level}) for ${year}.`,
        detail: `${score} point${score === 1 ? '' : 's'} · ${level}`,
      })
    }
  }
  const appreciationAwards: CertificateAward[] = members.flatMap(member => {
    const normalizedRole = member.role.trim().toLowerCase().replace(/^ydm\s+/u, '')
    if (!normalizedRole || normalizedRole === 'member' || normalizedRole === 'children' || normalizedRole.includes('children')) return []
    return [{
      id: `appreciation-${year}-${member.id}`, member, kind: 'appreciation' as const,
      title: `Leadership & service appreciation · ${member.role}`, year,
      reason: `In appreciation of your faithful leadership and service in making ${year} wonderful for JSC YDM.`,
      detail: `Recognized role · ${member.role}`,
    }]
  }).sort((a, b) => a.member.name.localeCompare(b.member.name))
  return [...attendance.sort((a, b) => a.member.name.localeCompare(b.member.name)), ...programAwards, ...appreciationAwards]
}
