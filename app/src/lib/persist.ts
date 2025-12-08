import type { StoreSnapshot } from './types'

const KEY = 'raffle-store'

export function loadStore(sessionId: string): StoreSnapshot {
  try {
    const raw = localStorage.getItem(`${KEY}-${sessionId}`)
    if (!raw) {
      // 尝试读取旧版本数据（兼容性）
      const old = localStorage.getItem(KEY)
      if (old) return JSON.parse(old)
      return { prizes: [], participants: [], records: [] }
    }
    const parsed = JSON.parse(raw)
    return {
      prizes: parsed.prizes ?? [],
      participants: parsed.participants ?? [],
      records: parsed.records ?? [],
      deletedPrizes: parsed.deletedPrizes ?? {},
    }
  } catch {
    return { prizes: [], participants: [], records: [], deletedPrizes: {} }
  }
}

export function saveStore(snapshot: StoreSnapshot, sessionId: string) {
  const payload = JSON.stringify(snapshot)
  localStorage.setItem(`${KEY}-${sessionId}`, payload)
}
