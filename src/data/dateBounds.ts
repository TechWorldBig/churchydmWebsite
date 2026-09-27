const indiaDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export const todayDate = () => indiaDate()

export const currentYearDateBounds = () => {
  const year = indiaDate().slice(0, 4)
  return { min: `${year}-01-01`, max: `${year}-12-31` }
}

export const isCurrentYearDate = (value: string) => {
  const { min, max } = currentYearDateBounds()
  return value >= min && value <= max
}
