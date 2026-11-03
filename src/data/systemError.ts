export type SystemErrorStatus = 500 | 503

export const systemErrorCopy = {
  500: {
    eyebrow: 'Error 500',
    title: 'Something went wrong',
    description: 'The website could not finish loading this page. Refresh to try again, or return home and continue from there.',
  },
  503: {
    eyebrow: 'Service unavailable · 503',
    title: 'This service is taking a break',
    description: 'The website is temporarily unable to complete this request. Wait a moment, then try again. Your saved ministry records are not affected.',
  },
} as const

export const systemErrorStatus = (error: unknown): SystemErrorStatus => {
  if (error && typeof error === 'object' && 'status' in error && Number(error.status) === 503) return 503
  return 500
}
