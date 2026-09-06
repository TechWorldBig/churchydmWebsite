export const panoramaFrames = [
  '/screenshots/church-01.png',
  '/screenshots/church-02.png',
  '/screenshots/church-03.png',
  '/screenshots/church-04.png',
  '/screenshots/church-05.png',
]

export type MinistryProgram = {
  id: number
  title: string
  schedule: string
  description: string
  icon: string
}

export const programs: MinistryProgram[] = [
  { id: 1, title: 'Bible Reference', schedule: '1st & 3rd Week of Every Month', description: 'Open the Word together, discover its truth and grow as faithful disciples of Jesus.', icon: '01' },
  { id: 2, title: 'Missionary Story', schedule: '1st & 3rd Week of Every Month', description: 'Hear inspiring stories of gospel mission and learn what it means to serve with courage.', icon: '02' },
  { id: 3, title: 'Song Survey', schedule: '1st & 3rd Week of Every Month', description: 'Explore the meaning behind worship songs and lift our hearts in praise to God.', icon: '03' },
  { id: 4, title: 'Bible Quiz', schedule: '1st & 3rd Week of Every Month', description: 'Test your knowledge of Scripture, sharpen your understanding and enjoy learning together.', icon: '04' },
  { id: 5, title: 'Message', schedule: '1st & 3rd Week of Every Month', description: 'Receive a Christ-centered message to encourage your faith and guide your daily walk.', icon: '05' },
]
