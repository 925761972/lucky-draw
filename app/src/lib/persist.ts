import type { StoreSnapshot } from './types'

const KEY = 'raffle-store'

export function loadStore(): StoreSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { prizes: [], participants: [], records: [] }
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

export function saveStore(snapshot: StoreSnapshot) {
  const payload = JSON.stringify(snapshot)
  localStorage.setItem(KEY, payload)
}
