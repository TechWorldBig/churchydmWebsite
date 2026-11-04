import { expect, test } from '@playwright/test'
import { renameArchivePayload } from '../api/members'
import { attendanceReport } from '../src/components/AdminReports'

test('member rename repairs every archived name copy including legacy mismatched ids', () => {
  const original = {
    members: [{ id: 'member-1', name: 'Jegashan', seniority: 'Junior' }, { id: 'member-2', name: 'Someone Else', seniority: 'Senior' }],
    attendance: [{ id: 'attendance-1', memberId: 'legacy-id', name: 'Jegashan' }],
    points: [{ id: 'point-1', memberId: 'legacy-id', name: 'Jegashan', seniority: 'Junior' }],
    weekly: [{ id: 'weekly-1', memberId: 'legacy-id', memberName: 'Jegashan' }],
  }

  const renamed = renameArchivePayload(original, 'member-1', 'jegashan', 'Jekashon', 'Senior')

  expect(renamed.changed).toBe(true)
  expect(renamed.payload.members[0]).toMatchObject({ name: 'Jekashon', seniority: 'Senior' })
  expect(renamed.payload.attendance[0].name).toBe('Jekashon')
  expect(renamed.payload.points[0]).toMatchObject({ name: 'Jekashon', seniority: 'Senior' })
  expect(renamed.payload.weekly[0].memberName).toBe('Jekashon')
  expect(renamed.payload.members[1]).toEqual(original.members[1])
})

test('attendance PDF always resolves a renamed member through the member id', () => {
  const html = attendanceReport(
    [{ id: 'member-1', name: 'Jekashon', role: 'YDM Member', email: '', phone: '', address: '', gender: 'Male', seniority: 'Senior', dateOfBirth: '', focus: '', photo: '' }],
    [{ id: 'attendance-1', memberId: 'member-1', name: 'Jegashan', date: '2026-01-04', present: true, note: '' }],
  )

  expect(html).toContain('Jekashon')
  expect(html).not.toContain('Jegashan')
})
