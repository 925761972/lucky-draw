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
  const del = await fetch(`${SUPABASE_URL}/rest/v1/checkins?session=eq.${session}`, {
    method: 'DELETE',
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  })
  return new Response(JSON.stringify({ ok: del.ok }), { headers: { 'content-type': 'application/json', ...cors } })
}
