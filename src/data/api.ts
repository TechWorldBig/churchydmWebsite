import { AttendanceRecord, GalleryPhoto, Member, ProgramPoint, WeeklyProgram } from './memberStore'

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

export const getMembers = () => request<Member[]>('/api/members')
export const getAttendance = () => request<AttendanceRecord[]>('/api/attendance')
export const getProgramPoints = (filters?: { name?: string; program?: string; from?: string; to?: string }) => { const params = new URLSearchParams(); Object.entries(filters || {}).forEach(([key, value]) => { const normalized = value?.trim(); if (normalized) params.set(key, normalized) }); return request<ProgramPoint[]>(`/api/program-points${params.toString() ? `?${params}` : ''}`) }
export const saveProgramPoint = (point: ProgramPoint) => request<{ ok: boolean; id?: string }>('/api/program-points', { method: 'POST', body: JSON.stringify(point) })
export const getLastUpdated = () => request<{ value: string | null }>('/api/updated')
export const createMember = (member: Member) => request<{ ok: boolean }>('/api/members', { method: 'POST', body: JSON.stringify(member) })
export const updateMember = (member: Member) => request<{ ok: boolean }>('/api/members', { method: 'PUT', body: JSON.stringify(member) })
export const deleteMember = (id: string) => request<{ ok: boolean }>('/api/members', { method: 'DELETE', body: JSON.stringify({ id }) })
export const createAttendance = (record: AttendanceRecord) => request<{ ok: boolean }>('/api/attendance', { method: 'POST', body: JSON.stringify(record) })
export const updateAttendance = (record: AttendanceRecord) => request<{ ok: boolean }>('/api/attendance', { method: 'PUT', body: JSON.stringify(record) })
export const deleteAttendance = (id: string) => request<{ ok: boolean }>('/api/attendance', { method: 'DELETE', body: JSON.stringify({ id }) })
export const getGallery = () => request<GalleryPhoto[]>('/api/gallery')
export const createGalleryPhoto = (photo: GalleryPhoto) => request<{ ok: boolean }>('/api/gallery', { method: 'POST', body: JSON.stringify(photo) })
export const updateGalleryPhoto = (photo: GalleryPhoto) => request<{ ok: boolean }>('/api/gallery', { method: 'PUT', body: JSON.stringify(photo) })
export const deleteGalleryPhoto = (id: string) => request<{ ok: boolean }>('/api/gallery', { method: 'DELETE', body: JSON.stringify({ id }) })
export const getWeeklyPrograms = (includeArchived = false) => request<WeeklyProgram[]>(`/api/weekly-programs${includeArchived ? '?includeArchived=1' : ''}`)
export const createWeeklyProgram = (item: WeeklyProgram) => request<{ ok: boolean; id?: string }>('/api/weekly-programs', { method: 'POST', body: JSON.stringify(item) })
export const deleteWeeklyProgram = (id: string) => request<{ ok: boolean }>('/api/weekly-programs', { method: 'DELETE', body: JSON.stringify({ id }) })
export const askChurchAssistant = (question: string, name: string, language: 'en' | 'ta' | 'ml', history: AssistantTurn[]) => request<{ answer: string }>('/api/assistant', {
  method: 'POST',
  body: JSON.stringify({ question, name, language, history }),
})
