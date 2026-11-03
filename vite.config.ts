import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

import assistantHandler from './api/assistant'
const databaseApiPaths = new Set(['/api/members', '/api/attendance', '/api/gallery', '/api/updated', '/api/auth', '/api/year-archive'])

function blockLocalDatabaseApi(): Plugin {
  return {
    name: 'block-local-database-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split('?')[0] || ''
        if (!databaseApiPaths.has(path)) return next()

        response.statusCode = 503
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
        response.setHeader('Cache-Control', 'no-store')
        response.end(JSON.stringify({ error: 'Database data is available only in the deployed Vercel application.' }))
      })
    },
  }
}

function localAssistantApi(): Plugin {
  return {
    name: 'local-assistant-api',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== '/api/assistant') return next()
        const res = {
          setHeader(name: string, value: string) { response.setHeader(name, value) },
          status(code: number) { response.statusCode = code; return this },
          json(payload: unknown) {
            response.setHeader('Content-Type', 'application/json; charset=utf-8')
            response.setHeader('Cache-Control', 'no-store')
            response.end(JSON.stringify(payload))
          },
        }
        try {
          let body = ''
          for await (const chunk of request) {
            body += chunk.toString()
            if (body.length > 32_000) { res.status(413).json({ error: 'Request too large.' }); return }
          }
          await assistantHandler({ method: request.method, headers: request.headers, socket: request.socket, body }, res)
        } catch {
          res.status(500).json({ error: 'The church assistant could not answer right now.' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'GEMINI_')
  for (const key of ['GEMINI_API_KEY', 'GEMINI_MODEL']) {
    if (!process.env[key] && env[key]) process.env[key] = env[key]
  }
  return {
    plugins: [blockLocalDatabaseApi(), localAssistantApi(), react(), tailwindcss()],
    server: { port: 5173, host: true },
  }
})
