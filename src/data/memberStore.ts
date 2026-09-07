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
  photoName?: string
}

export type AttendanceRecord = {
  id: string
  memberId: string
  name: string
  date: string
  present: boolean
  note: string
}

export type ProgramPoint = { id: string; memberId: string; name: string; program: string; seniority: 'Junior' | 'Senior' | ''; date: string; questionsAnswered: number }

export type GalleryPhoto = {
  id: string
  photo: string
  date: string
  description: string
}

export type WeeklyProgram = { id: string; date: string; serialNo: number; programName: string; memberId: string; memberName: string }
