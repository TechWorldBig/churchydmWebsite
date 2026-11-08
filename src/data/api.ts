import { AttendanceRecord, GalleryPhoto, Member, ProgramPoint, WeeklyProgram } from './memberStore'

export type AuditLog = {
  id: string
  actor: string
  action: string
  entity: string
  entityId: string
  summary: string
  createdAt: string
}

export type VisitorLocation = {
  country: string
  region: string
  city: string
  latitude: string
  longitude: string
  timezone: string
  device: string
  lastSeenAt: string
}

export type AssistantTurn = {
  role: 'user' | 'assistant'
  content: string
}

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, { cache: 'no-store', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...options })
  if (response.status === 401) window.dispatchEvent(new Event('ydm-session-expired'))
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json()
}

export const getMembers = (filters?: { archiveYear?: string; allYears?: boolean }) => { const params = new URLSearchParams(); if (filters?.archiveYear) params.set('archiveYear', filters.archiveYear); if (filters?.allYears) params.set('allYears', '1'); return request<Member[]>(`/api/members${params.toString() ? `?${params}` : ''}`) }
export const getAttendance = (filters?: { year?: string; allYears?: boolean }) => { const params = new URLSearchParams(); if (filters?.year) params.set('year', filters.year); if (filters?.allYears) params.set('allYears', '1'); return request<AttendanceRecord[]>(`/api/attendance${params.toString() ? `?${params}` : ''}`) }
export const getProgramPoints = (filters?: { name?: string; program?: string; from?: string; to?: string; year?: string; allYears?: boolean }) => { const params = new URLSearchParams(); Object.entries(filters || {}).forEach(([key, value]) => { if (value === true) params.set(key, '1'); else if (typeof value === 'string') { const normalized = value.trim(); if (normalized) params.set(key, normalized) } }); return request<ProgramPoint[]>(`/api/program-points${params.toString() ? `?${params}` : ''}`) }
export const saveProgramPoint = (point: ProgramPoint) => request<{ ok: boolean; id?: string; created?: boolean }>('/api/program-points', { method: 'POST', body: JSON.stringify(point) })
export const updateProgramPoint = (point: ProgramPoint) => request<{ ok: boolean; id?: string; created?: boolean }>('/api/program-points', { method: 'PUT', body: JSON.stringify(point) })
export const deleteProgramPoint = (id: string) => request<{ ok: boolean }>('/api/program-points', { method: 'DELETE', body: JSON.stringify({ id }) })
export const getLastUpdated = () => request<{ value: string | null; version: string }>('/api/updated')
export const getVisitorTotal = () => request<{ total: number }>('/api/visitors')
const VISITOR_ID_KEY = 'ydm-anonymous-visitor-id-v1'

const anonymousVisitorId = () => {
  let visitorId: string = crypto.randomUUID()
  try {
    const stored = window.localStorage.getItem(VISITOR_ID_KEY)
    if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(stored)) visitorId = stored
    else window.localStorage.setItem(VISITOR_ID_KEY, visitorId)
  } catch {
    // Storage can be unavailable in hardened/private browser contexts. The
    // in-memory ID still lets the request complete without fingerprinting.
  }
  return visitorId
}

export const recordVisitor = () => request<{ ok: boolean }>('/api/visitors', { method: 'POST', body: JSON.stringify({ visitorId: anonymousVisitorId() }) })
export const getVisitorStats = (date?: string) => request<{ date: string; hours: Array<{ hour: number; count: number; devices: Record<string, number> }>; devices: Array<{ device: string; count: number }>; locations: VisitorLocation[]; dailyNew: number; dailyReturning: number; dailyTraffic: number; total: number }>(`/api/visitors${date ? `?date=${encodeURIComponent(date)}` : ''}`)
export const getAuditLogs = () => request<AuditLog[]>('/api/audit-logs')
export const createMember = (member: Member) => request<{ ok: boolean }>('/api/members', { method: 'POST', body: JSON.stringify(member) })
export const updateMember = (member: Member) => request<{ ok: boolean }>('/api/members', { method: 'PUT', body: JSON.stringify(member) })
export const deleteMember = (id: string) => request<{ ok: boolean }>('/api/members', { method: 'DELETE', body: JSON.stringify({ id }) })
export const createAttendance = (record: AttendanceRecord) => request<{ ok: boolean }>('/api/attendance', { method: 'POST', body: JSON.stringify(record) })
export const updateAttendance = (record: AttendanceRecord) => request<{ ok: boolean }>('/api/attendance', { method: 'PUT', body: JSON.stringify(record) })
export const deleteAttendance = (id: string) => request<{ ok: boolean }>('/api/attendance', { method: 'DELETE', body: JSON.stringify({ id }) })
export const getGallery = () => request<GalleryPhoto[]>('/api/gallery', { cache: 'default' })
export const createGalleryPhoto = (photo: GalleryPhoto) => request<{ ok: boolean }>('/api/gallery', { method: 'POST', body: JSON.stringify(photo) })
export const updateGalleryPhoto = (photo: GalleryPhoto) => request<{ ok: boolean }>('/api/gallery', { method: 'PUT', body: JSON.stringify(photo) })
export const deleteGalleryPhoto = (id: string) => request<{ ok: boolean }>('/api/gallery', { method: 'DELETE', body: JSON.stringify({ id }) })
export const getWeeklyPrograms = (includeArchived = false) => request<WeeklyProgram[]>(`/api/weekly-programs${includeArchived ? '?includeArchived=1' : ''}`)
export const getYearArchives = () => request<Array<{ year: string; payload: { members: Member[]; attendance: AttendanceRecord[]; points: ProgramPoint[]; weekly: WeeklyProgram[] } }>>('/api/year-archive')
export const createWeeklyProgram = (item: WeeklyProgram) => request<{ ok: boolean; id?: string }>('/api/weekly-programs', { method: 'POST', body: JSON.stringify(item) })
export const deleteWeeklyProgram = (id: string) => request<{ ok: boolean }>('/api/weekly-programs', { method: 'DELETE', body: JSON.stringify({ id }) })
export const askChurchAssistant = (question: string, name: string, language: 'en' | 'ta' | 'ml', history: AssistantTurn[]) => request<{ answer: string }>('/api/assistant', {
  method: 'POST',
  body: JSON.stringify({ question, name, language, history }),
})
export const generateAiAnnualDocument = (type: 'yearly' | 'welcome' | 'thanks', year: string, language: 'en' | 'ta') => request<{ answer: string }>('/api/assistant', { method: 'POST', body: JSON.stringify({ adminReport: true, type, year, language }) })
