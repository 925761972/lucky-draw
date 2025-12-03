export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const session = url.searchParams.get('s') || ''
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors })
  if (req.method !== 'GET') return new Response('method', { status: 405, headers: cors })
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
  const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  const q = new URL(`${SUPABASE_URL}/rest/v1/checkins`)
  q.searchParams.set('select', 'name,phone,device,timestamp')
  q.searchParams.set('session', `eq.${session}`)
  q.searchParams.set('order', 'timestamp.asc')
  const res = await fetch(q, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  if (!res.ok) return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type': 'application/json', ...cors } })
  const data = await res.json()
  return new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json', ...cors } })
}
