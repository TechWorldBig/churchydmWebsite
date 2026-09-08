type AdminSession = { authenticated: boolean; expiresAt: number | null }

async function sessionRequest(method: string, body?: unknown): Promise<AdminSession> {
  const response = await fetch(method === 'POST' ? '/api/auth/login' : '/api/auth', {
    method, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Sign-in is temporarily unavailable.')
  return result
}

export const getAdminSession = () => sessionRequest('GET')
export const startAdminSession = (username: string, password: string) => sessionRequest('POST', { username, password })
export const clearAdminSession = () => sessionRequest('DELETE')
