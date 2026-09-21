export default function handler(req: any, res: any) {
  res.setHeader?.('Cache-Control', 'no-store, no-cache, must-revalidate')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const version = process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_URL || 'development'
  return res.status(200).json({ version })
}
