import { expect, test } from '@playwright/test'
import { attendanceReport } from '../src/components/AdminReports'
import type { AttendanceRecord, Member } from '../src/data/memberStore'

test('attendance PDF includes Senior 2 days absent under Senior members · 2 days absent', () => {
  const members: Member[] = [
    { id: 'senior-1', name: 'Jayan', role: 'President', email: '', phone: '', address: '', gender: 'Male', seniority: 'Senior', dateOfBirth: '', focus: '', photo: '' },
    { id: 'senior-2', name: 'Kabin', role: 'Member', email: '', phone: '', address: '', gender: 'Female', seniority: 'senior', dateOfBirth: '', focus: '', photo: '' },
    { id: 'junior-1', name: 'Mary', role: 'Member', email: '', phone: '', address: '', gender: 'Female', seniority: 'Junior', dateOfBirth: '', focus: '', photo: '' },
  ]

  const records: AttendanceRecord[] = [
    // Senior 1 (Jayan): 0 days absent (present all 3 dates)
    { id: 'a1', memberId: 'senior-1', name: 'Jayan', date: '2026-01-04', present: true, note: '' },
    { id: 'a2', memberId: 'senior-1', name: 'Jayan', date: '2026-01-11', present: true, note: '' },
    { id: 'a3', memberId: 'senior-1', name: 'Jayan', date: '2026-01-18', present: true, note: '' },

    // Senior 2 (Kabin): 2 days absent (present on 1 date, absent on 2 dates)
    { id: 'a4', memberId: 'senior-2', name: 'Kabin', date: '2026-01-04', present: true, note: '' },
    { id: 'a5', memberId: 'senior-2', name: 'Kabin', date: '2026-01-11', present: false, note: 'Sick' },
    { id: 'a6', memberId: 'senior-2', name: 'Kabin', date: '2026-01-18', present: false, note: 'Out of station' },

    // Junior 1 (Mary): 1 day absent
    { id: 'a7', memberId: 'junior-1', name: 'Mary', date: '2026-01-04', present: true, note: '' },
    { id: 'a8', memberId: 'junior-1', name: 'Mary', date: '2026-01-11', present: false, note: '' },
    { id: 'a9', memberId: 'junior-1', name: 'Mary', date: '2026-01-25', present: true, note: '' },
  ]

  const html = attendanceReport(members, records)

  // Senior sections
  expect(html).toContain('Senior members · Present every day')
  expect(html).toContain('Jayan')

  expect(html).toContain('Senior members · 2 days absent')
  expect(html).toContain('Kabin')

  // Junior sections
  expect(html).toContain('Junior members · Present every day')
  expect(html).toContain('Junior members · 1 day absent')
  expect(html).toContain('Mary')
  expect(html).toContain('Junior members · 2 days absent')
  expect(html).toContain('No qualifying members')
})

test('attendance PDF always includes all award tiers even when a tier has no qualifying members', () => {
  const members: Member[] = [
    { id: 'senior-1', name: 'Abhishek M A', role: 'Leader', email: '', phone: '', address: '', gender: 'Male', seniority: 'Senior', dateOfBirth: '', focus: '', photo: '' },
    { id: 'senior-2', name: 'Jeba Kiruba', role: 'Member', email: '', phone: '', address: '', gender: 'Female', seniority: 'Senior', dateOfBirth: '', focus: '', photo: '' },
  ]

  const records: AttendanceRecord[] = [
    { id: 'a1', memberId: 'senior-1', name: 'Abhishek M A', date: '2026-01-04', present: true, note: '' },
    { id: 'a2', memberId: 'senior-1', name: 'Abhishek M A', date: '2026-01-11', present: true, note: '' },
    { id: 'a3', memberId: 'senior-2', name: 'Jeba Kiruba', date: '2026-01-04', present: true, note: '' },
    { id: 'a4', memberId: 'senior-2', name: 'Jeba Kiruba', date: '2026-01-11', present: false, note: '' },
  ]

  const html = attendanceReport(members, records)

  // Every tier must always be present in the report
  expect(html).toContain('Senior members · Present every day')
  expect(html).toContain('Abhishek M A')

  expect(html).toContain('Senior members · 1 day absent')
  expect(html).toContain('Jeba Kiruba')

  // Crucial check: 2 days absent header must ALWAYS show, never omitted!
  expect(html).toContain('Senior members · 2 days absent')
  expect(html).toContain('No qualifying members')
})

