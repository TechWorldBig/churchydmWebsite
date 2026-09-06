export type Member = {
  id: string
  name: string
  role: string
  email: string
  phone: string
  address: string
  gender: string
  seniority: 'Junior' | 'Senior' | ''
  dateOfBirth: string
  focus: string
  photo: string
}

export type AttendanceRecord = {
  id: string
  memberId: string
  name: string
  date: string
  present: boolean
  note: string
}

export type ProgramPoint = { id: string; memberId: string; name: string; program: string; date: string; score: number }

export type GalleryPhoto = {
  id: string
  photo: string
  date: string
  description: string
}
