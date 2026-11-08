import { useEffect } from 'react'

/** Refreshes server-backed views when a visitor returns, without constant polling. */
export const useRefreshOnFocus = (load: () => void, dependencies: readonly unknown[] = []) => {
  useEffect(() => {
    let active = true
    const refresh = () => { if (active && document.visibilityState === 'visible') load() }
    load()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
    // The caller supplies primitive dependencies that define the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)
}
