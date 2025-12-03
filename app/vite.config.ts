import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    {
      name: 'checkin-api',
      configureServer(server) {
        const dataDir = path.join(process.cwd(), 'data')
        const jsonFile = path.join(dataDir, 'checkins.json')
        const csvFile = path.join(dataDir, 'checkins.csv')
        function ensure() {
          if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
          if (!fs.existsSync(jsonFile)) fs.writeFileSync(jsonFile, '[]')
          if (!fs.existsSync(csvFile)) fs.writeFileSync(csvFile, 'name,phone,device,timestamp\n')
        }
        server.middlewares.use((req, res, next) => {
          ensure()
          const url = new URL(req.url!, 'http://x')
          const session = url.searchParams.get('s') || ''
          const cors = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
          if (req.method === 'OPTIONS') {
            Object.entries(cors).forEach(([k,v]) => res.setHeader(k, v))
            res.statusCode = 204
            res.end('')
            return
          }
          if (req.method === 'POST' && url.pathname === '/api/checkin') {
            const chunks: Buffer[] = []
            req.on('data', c => chunks.push(Buffer.from(c)))
            req.on('end', () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
                const name = String(body.name || '').trim()
                const phone = String(body.phone || '').trim()
                const device = body.device ? String(body.device).trim() : ''
                if (!name || !phone) { res.statusCode = 400; res.end(JSON.stringify({ ok: false })) ; return }
                const now = Date.now()
                const list = JSON.parse(fs.readFileSync(jsonFile, 'utf-8')) as any[]
                if (list.some((x: any) => (String(x.session || '') === session) && (String(x.phone) === phone || (device && String(x.device || '') === device)))) {
                  res.setHeader('content-type', 'application/json')
                  res.end(JSON.stringify({ ok: false, message: '该手机号已签到' }))
                  return
                }
                list.push({ name, phone, device, session, timestamp: now })
                fs.writeFileSync(jsonFile, JSON.stringify(list))
                fs.appendFileSync(csvFile, `${name.replaceAll('"','""')},${phone.replaceAll('"','""')},${(device || '').replaceAll('"','""')},${new Date(now).toISOString()}\n`)
                Object.entries(cors).forEach(([k,v]) => res.setHeader(k, v))
                res.setHeader('content-type', 'application/json')
                res.end(JSON.stringify({ ok: true }))
              } catch {
                res.statusCode = 500
                Object.entries(cors).forEach(([k,v]) => res.setHeader(k, v))
                res.end(JSON.stringify({ ok: false }))
              }
            })
            return
          }
          if (req.method === 'GET' && url.pathname === '/api/checkin.json') {
            Object.entries(cors).forEach(([k,v]) => res.setHeader(k, v))
            res.setHeader('content-type', 'application/json')
            const list = JSON.parse(fs.readFileSync(jsonFile, 'utf-8')) as any[]
            res.end(JSON.stringify(list.filter(x => String(x.session || '') === session)))
            return
          }
          if (req.method === 'GET' && url.pathname === '/api/checkin.csv') {
            Object.entries(cors).forEach(([k,v]) => res.setHeader(k, v))
            res.setHeader('content-type', 'text/csv;charset=utf-8')
            const head = 'name,phone,device,timestamp\n'
            const raw = fs.readFileSync(jsonFile, 'utf-8')
            const list = JSON.parse(raw) as any[]
            const filtered = list.filter(x => String(x.session || '') === session)
            const body = head + filtered.map(x => `${String(x.name ?? '').replaceAll('"','""')},${String(x.phone ?? '').replaceAll('"','""')},${String(x.device ?? '').replaceAll('"','""')},${new Date(x.timestamp ?? Date.now()).toISOString()}`).join('\n')
            const hasHead = body.startsWith('name,')
            res.end(hasHead ? body : head + body)
            return
          }
          if (req.method === 'POST' && url.pathname === '/api/checkin.reset') {
            const list = JSON.parse(fs.readFileSync(jsonFile, 'utf-8')) as any[]
            const kept = list.filter(x => String(x.session || '') !== session)
            fs.writeFileSync(jsonFile, JSON.stringify(kept))
            Object.entries(cors).forEach(([k,v]) => res.setHeader(k, v))
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
            return
          }
          next()
        })
      }
    }
  ],
})
