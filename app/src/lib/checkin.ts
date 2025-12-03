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
    // 增加超时控制，避免请求挂起太久
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)
    const res = await fetch(url1, { ...init, signal: controller.signal })
    clearTimeout(timeoutId)
    return res
  } catch (e) {
    const url2 = path
    if (url2 === url1) throw new Error('network')
    // 重试一次
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      const res = await fetch(url2, { ...init, signal: controller.signal })
      clearTimeout(timeoutId)
      return res
    } catch {
      throw new Error('network_retry_failed')
    }
  }
}

export async function createCheckin(name: string, phone: string, device?: string, session?: string): Promise<{ ok: boolean; message?: string }> {
  // 1. 优先尝试通过 Vercel API 转发 (解决 CORS 和被墙问题)
  try {
    const r = await fetchWithFallback(`/api/checkin?s=${encodeURIComponent(session ?? '')}`, { 
      method: 'POST', 
      headers: { 'content-type': 'application/json' }, 
      body: JSON.stringify({ name, phone, device }) 
    })
    if (r.ok) {
      const json = await r.json()
      if (json.ok) return { ok: true }
      // 如果 API 返回业务错误（如重复签到），直接返回错误
      if (json.message) return { ok: false, message: json.message }
    }
  } catch (e) {
    console.warn('API checkin failed, trying direct supabase...', e)
  }

  // 2. 备选方案：前端直连 Supabase (防止 Vercel API 挂了或超时)
  try {
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    
    if (!SUPABASE_URL || !KEY) {
      throw new Error('Missing Supabase env vars for fallback')
    }
    
    // 先查重
    const q = new URL(`${SUPABASE_URL}/rest/v1/checkins`)
    q.searchParams.set('select', 'id')
    q.searchParams.set('session', `eq.${session}`)
    q.searchParams.set('phone', `eq.${phone}`)
    q.searchParams.set('limit', '1')
    
    const head = await fetch(q, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
    if (head.ok) {
      const exist = await head.json()
      if (Array.isArray(exist) && exist.length > 0) return { ok: false, message: '该手机号已签到' }
    }

    // 写入
    const ins = await fetch(`${SUPABASE_URL}/rest/v1/checkins`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'content-type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ name, phone, device, session, timestamp: new Date().toISOString() })
    })
    
    if (ins.ok) return { ok: true }
    const text = await ins.text()
    return { ok: false, message: `直连提交失败: ${ins.status} ${text.slice(0, 50)}` }
  } catch (e: any) {
    return { ok: false, message: `所有通道均失败: ${e.message}` }
  }
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
