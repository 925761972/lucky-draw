export type CheckinRow = { name: string, phone: string, device?: string, session?: string, timestamp?: string | number }

function apiBase() {
  const base = (import.meta as any)?.env?.VITE_API_BASE_URL as string | undefined
  if (!base) return ''
  return base.endsWith('/') ? base.slice(0, -1) : base
}

async function fetchWithFallback(path: string, init?: RequestInit) {
  const base = apiBase()
  const url1 = base ? `${base}${path}` : path
  try {
    return await fetch(url1, init)
  } catch {
    const url2 = path
    if (url2 === url1) throw new Error('network')
    return await fetch(url2, init)
  }
}

export async function createCheckin(name: string, phone: string, device?: string, session?: string): Promise<{ ok: boolean; message?: string }> {
  const r = await fetchWithFallback(`/api/checkin?s=${encodeURIComponent(session ?? '')}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, phone, device }) })
  if (!r.ok) return { ok: false, message: '提交失败' }
  return { ok: true }
}

export async function loadCheckins(session?: string): Promise<CheckinRow[]> {
  const r = await fetchWithFallback(`/api/checkin.json?s=${encodeURIComponent(session ?? '')}`, { cache: 'no-store' })
  const data = await r.json()
  return Array.isArray(data) ? data as { name: string, phone: string, device?: string, timestamp: number }[] : []
}

export async function getCheckinCount(session?: string): Promise<number> {
  const list = await loadCheckins(session)
  return list.length
}

export async function resetCheckins(session?: string): Promise<boolean> {
  const r = await fetchWithFallback(`/api/checkin.reset?s=${encodeURIComponent(session ?? '')}`, { method: 'POST' })
  return r.ok
}
