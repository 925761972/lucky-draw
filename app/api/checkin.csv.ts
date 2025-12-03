export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const session = url.searchParams.get('s') || ''
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: cors })
  const SUPABASE_URL = process.env.VITE_SUPABASE_URL!
  const KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  const q = new URL(`${SUPABASE_URL}/rest/v1/checkins`)
  q.searchParams.set('select', 'name,phone,device,timestamp')
  q.searchParams.set('session', `eq.${session}`)
  q.searchParams.set('order', 'timestamp.asc')
  const res = await fetch(q, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
  const rows = res.ok ? await res.json() : []
  const header = 'name,phone,device,timestamp\n'
  const body = rows.map((r: any) => `${String(r.name ?? '').replaceAll('"','""')},${String(r.phone ?? '').replaceAll('"','""')},${String(r.device ?? '').replaceAll('"','""')},${new Date(r.timestamp ?? Date.now()).toISOString()}`).join('\n')
  return new Response(header + body, { headers: { 'content-type': 'text/csv;charset=utf-8', ...cors } })
}
