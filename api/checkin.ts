export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const session = url.searchParams.get('s') || ''
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors })
  if (req.method !== 'POST') return new Response(JSON.stringify({ ok: false, message: 'method' }), { status: 405 })
  try {
    const body = await req.json()
    const name = String(body.name || '').trim()
    const phone = String(body.phone || '').trim()
    const device = body.device ? String(body.device).trim() : ''
    if (!name || !phone) return new Response(JSON.stringify({ ok: false, message: 'bad' }), { status: 400 })
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
    const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
    // check duplicate within session
    const q = new URL(`${SUPABASE_URL}/rest/v1/checkins`)
    q.searchParams.set('select', 'id')
    q.searchParams.set('session', `eq.${session}`)
    q.searchParams.set('phone', `eq.${phone}`)
    q.searchParams.set('limit', '1')
    const head = await fetch(q, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
    if (!head.ok) return new Response(JSON.stringify({ ok: false, message: 'fetch' }), { status: 502, headers: cors })
    const exist = await head.json()
    if (Array.isArray(exist) && exist.length > 0) return new Response(JSON.stringify({ ok: false, message: 'dup' }), { status: 200 })
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/checkins`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'content-type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ name, phone, device, session, timestamp: new Date().toISOString() })
    })
    if (!ins.ok) return new Response(JSON.stringify({ ok: false, message: 'insert' }), { status: 502, headers: cors })
    return new Response(JSON.stringify({ ok: true }), { headers: cors })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, message: 'error' }), { status: 500, headers: cors })
  }
}
