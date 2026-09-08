export const todayDate = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const currentYearDateBounds = () => {
  const year = new Date().getFullYear()
  return { min: `${year}-01-01`, max: `${year}-12-31` }
}

export const isCurrentYearDate = (value: string) => {
  const { min, max } = currentYearDateBounds()
  return value >= min && value <= max
}
