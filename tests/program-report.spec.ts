import { expect, test } from '@playwright/test'
import { programReport } from '../src/components/AdminReports'
import type { ProgramPoint } from '../src/data/memberStore'

const point = (id: string, memberId: string, name: string, seniority: string, program: string, questionsAnswered: number): ProgramPoint => ({
  id,
  memberId,
  name,
  seniority,
  program,
  date: '2026-11-23',
  questionsAnswered,
})

test('program report includes every member tied within the top two ranks', () => {
  const html = programReport([
    point('1', 'a', 'Shermila Jebalin', 'Senior', 'Bible Quiz', 31),
    point('2', 'b', 'Anshla', 'Senior', 'Bible Quiz', 4),
    point('3', 'c', 'Beena', 'senior', 'Bible Quiz', 4),
    point('4', 'd', 'Excluded third place', 'Senior', 'Bible Quiz', 3),
  ])

  expect(html).toContain('<td>1</td><td>Shermila Jebalin</td>')
  expect(html).toContain('<td>2</td><td>Anshla</td>')
  expect(html).toContain('<td>2</td><td>Beena</td>')
  expect(html).not.toContain('Excluded third place')
})

test('program report keeps tied legacy members without IDs separate', () => {
  const html = programReport([
    point('1', '', 'Nobin', 'Junior', 'Bible Reference', 5),
    point('2', '', 'Nobin', 'Junior', 'Bible Reference', 4),
    point('3', '', 'Jaffita', 'Junior', 'Bible Reference', 9),
    point('4', '', 'Mary', 'Junior', 'Bible Reference', 9),
  ])

  expect(html).toContain('<td>1</td><td>Jaffita</td>')
  expect(html).toContain('<td>1</td><td>Mary</td>')
  expect(html).toContain('<td>1</td><td>Nobin</td>')
  expect(html).toContain('<td>9</td>')
})
