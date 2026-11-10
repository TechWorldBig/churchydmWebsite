const normalizeRole = (role: string) => role.trim().toLocaleLowerCase('en-US').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ')

export const isCurrentYdmPresident = (role: string) => {
  const normalized = normalizeRole(role)
  return normalized === 'president' || normalized === 'ydm president'
}
