import { ProgramPoint } from './memberStore'

export type ProgramPointsSummary = {
  program: string
  rows: ProgramPoint[]
  totalPoints: number
  maximumPoints: number
  overallPercentage: number
}

export function summarizeProgramPoints(points: ProgramPoint[]): ProgramPointsSummary[] {
  const grouped = new Map<string, ProgramPoint[]>()
  for (const point of points) {
    const rows = grouped.get(point.program) || []
    rows.push(point)
    grouped.set(point.program, rows)
  }

  return [...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([program, rows]) => {
      const orderedRows = [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      const totalPoints = orderedRows.reduce((total, row) => total + row.questionsAnswered, 0)
      const maximumPoints = orderedRows.length * 5
      return {
        program,
        rows: orderedRows,
        totalPoints,
        maximumPoints,
        overallPercentage: maximumPoints ? (totalPoints / maximumPoints) * 100 : 0,
      }
    })
}

export const formatPercentage = (value: number) => `${Number.isInteger(value) ? value : value.toFixed(1)}%`
export const formatMeetingDate = (value: string) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00`))
