import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Prize, Participant, DrawRecord, StoreSnapshot } from './types'
import { loadStore, saveStore } from './persist'
import { uid } from './id'

type RaffleStore = {
  prizes: Prize[]
  participants: Participant[]
  records: DrawRecord[]
  addPrize: (name: string, quantity: number, weight?: number) => void
  removePrize: (id: string) => void
  addParticipants: (names: string[]) => void
  addParticipantsWithMeta: (items: { name: string, meta?: Record<string,string> }[]) => void
  normalizeParticipants: () => void
  removeParticipant: (id: string) => void
  updateParticipant: (id: string, name: string) => void
  clearRecords: () => void
  clearParticipants: () => void
  resetAll: () => void
  writeSnapshot: (s: StoreSnapshot) => void
  resetSeq: number
  sessionId: string
}

const Ctx = createContext<RaffleStore | null>(null)

export function RaffleProvider({ children }: { children: React.ReactNode }) {
  const [sessionId] = useState(() => {
    // 优先使用 URL 参数（如果有），否则使用 localStorage，最后生成新的
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const s = params.get('s')
      if (s) return s
      return localStorage.getItem('raffle_session') || uid('sess')
    }
    return uid('sess')
  })

  useEffect(() => {
    if (sessionId) localStorage.setItem('raffle_session', sessionId)
  }, [sessionId])

  const [snapshot, setSnapshot] = useState<StoreSnapshot>(() => loadStore(sessionId))
  const [resetSeq, setResetSeq] = useState(0)

  useEffect(() => {
    saveStore(snapshot, sessionId)
  }, [snapshot, sessionId])

  const api = useMemo<RaffleStore>(() => ({
    prizes: snapshot.prizes,
    participants: snapshot.participants,
    records: snapshot.records,
    resetSeq,
    sessionId,
    addPrize: (name, quantity, weight) => {
      setSnapshot(s => ({
        ...s,
        prizes: [...s.prizes, { id: uid('p'), name, quantity, weight, createdAt: Date.now() }],
      }))
    },
    removePrize: id => {
      setSnapshot(s => ({ ...s, prizes: s.prizes.filter(p => p.id !== id) }))
    },
    addParticipants: names => {
      const cleaned = names
        .map(n => n.trim())
        .filter(n => n.length > 0)
      const existing = new Set(snapshot.participants.map(p => p.name))
      const unique = cleaned.filter(n => !existing.has(n))
      const items = unique.map(n => ({ id: uid('u'), name: n }))
      setSnapshot(s => ({ ...s, participants: [...s.participants, ...items] }))
    },
    addParticipantsWithMeta: items => {
      const cleaned = items
        .map(x => ({ name: x.name.trim(), meta: x.meta }))
        .filter(x => x.name.length > 0)

      const existingPhonesByName = new Map<string, Set<string>>()
      const existingDevicesByName = new Map<string, Set<string>>()
      snapshot.participants.forEach(p => {
        const bn = p.name.replace(/\d{4}$/, '')
        const ph = (p.meta?.phone ?? '').trim()
        const dv = (p.meta?.device ?? '').trim()
        if (ph) {
          const set = existingPhonesByName.get(bn) ?? new Set<string>()
          set.add(ph)
          existingPhonesByName.set(bn, set)
        }
        if (dv) {
          const set = existingDevicesByName.get(bn) ?? new Set<string>()
          set.add(dv)
          existingDevicesByName.set(bn, set)
        }
      })

      const batchPhonesByName = new Map<string, Set<string>>()
      const batchDevicesByName = new Map<string, Set<string>>()
      cleaned.forEach(x => {
        const bn = x.name
        const ph = (x.meta?.phone ?? '').trim()
        const dv = (x.meta?.device ?? '').trim()
        if (ph) {
          const set = batchPhonesByName.get(bn) ?? new Set<string>()
          set.add(ph)
          batchPhonesByName.set(bn, set)
        }
        if (dv) {
          const set = batchDevicesByName.get(bn) ?? new Set<string>()
          set.add(dv)
          batchDevicesByName.set(bn, set)
        }
      })

      const seenPhones = new Set(snapshot.participants.map(p => (p.meta?.phone ?? '').trim()).filter(Boolean))
      const seenDevices = new Set(snapshot.participants.map(p => (p.meta?.device ?? '').trim()).filter(Boolean))
      const seenNames = new Set(snapshot.participants.map(p => p.name))

      const next: Participant[] = []
      for (const x of cleaned) {
        const baseName = x.name
        const phone = (x.meta?.phone ?? '').trim()
        const device = (x.meta?.device ?? '').trim()
        if (phone && seenPhones.has(phone)) continue
        if (device && seenDevices.has(device)) continue
        if (!phone && !device && seenNames.has(baseName)) continue

        const existingPhSet = existingPhonesByName.get(baseName) ?? new Set<string>()
        const existingDvSet = existingDevicesByName.get(baseName) ?? new Set<string>()
        const batchPhSet = batchPhonesByName.get(baseName) ?? new Set<string>()
        const batchDvSet = batchDevicesByName.get(baseName) ?? new Set<string>()
        const phDistinct = new Set<string>([...existingPhSet, ...batchPhSet].filter(Boolean))
        const dvDistinct = new Set<string>([...existingDvSet, ...batchDvSet].filter(Boolean))
        const hasConflict = (phDistinct.size > 1) || (dvDistinct.size > 1)

        const last4 = phone ? phone.slice(-4) : (device ? device.slice(-4) : '')
        const displayName = hasConflict && last4 ? `${baseName}${last4}` : baseName

        next.push({ id: uid('u'), name: displayName, meta: x.meta })
        if (phone) seenPhones.add(phone)
        if (device) seenDevices.add(device)
        if (!phone && !device) seenNames.add(baseName)
        if (phone) {
          const set = existingPhonesByName.get(baseName) ?? new Set<string>()
          set.add(phone)
          existingPhonesByName.set(baseName, set)
        }
        if (device) {
          const set = existingDevicesByName.get(baseName) ?? new Set<string>()
          set.add(device)
          existingDevicesByName.set(baseName, set)
        }
      }

      setSnapshot(s => ({ ...s, participants: [...s.participants, ...next] }))
    },
    normalizeParticipants: () => {
      const seen = new Set<string>()
      const keptIdx: number[] = []
      snapshot.participants.forEach((p, idx) => {
        const phone = (p.meta?.phone ?? '').trim()
        const device = (p.meta?.device ?? '').trim()
        const key = phone ? `p:${phone}` : (device ? `d:${device}` : `n:${p.name}`)
        if (!seen.has(key)) { seen.add(key); keptIdx.push(idx) }
      })
      const basePhones = new Map<string, Set<string>>()
      const baseDevices = new Map<string, Set<string>>()
      keptIdx.forEach(idx => {
        const p = snapshot.participants[idx]
        const base = p.name.replace(/\d{4}$/, '')
        const ph = (p.meta?.phone ?? '').trim()
        const dv = (p.meta?.device ?? '').trim()
        if (ph) { const s = basePhones.get(base) ?? new Set<string>(); s.add(ph); basePhones.set(base, s) }
        if (dv) { const s = baseDevices.get(base) ?? new Set<string>(); s.add(dv); baseDevices.set(base, s) }
      })
      const next = keptIdx.map(idx => {
        const p = snapshot.participants[idx]
        const base = p.name.replace(/\d{4}$/, '')
        const ph = (p.meta?.phone ?? '').trim()
        const dv = (p.meta?.device ?? '').trim()
        const conflict = (basePhones.get(base)?.size ?? 0) > 1 || (baseDevices.get(base)?.size ?? 0) > 1
        const suffix = conflict ? (ph ? ph.slice(-4) : (dv ? dv.slice(-4) : '')) : ''
        const name = suffix ? `${base}${suffix}` : base
        return { ...p, name }
      })
      const changed = next.length !== snapshot.participants.length || next.some((p, i) => p.id !== snapshot.participants[i]?.id || p.name !== snapshot.participants[i]?.name)
      if (changed) setSnapshot(s => ({ ...s, participants: next }))
    },
    removeParticipant: id => {
      setSnapshot(s => ({ ...s, participants: s.participants.filter(p => p.id !== id) }))
    },
    updateParticipant: (id, name) => {
      setSnapshot(s => ({
        ...s,
        participants: s.participants.map(p => (p.id === id ? { ...p, name } : p)),
      }))
    },
    clearRecords: () => {
      setSnapshot(s => ({ ...s, records: [] }))
    },
    clearParticipants: () => {
      setSnapshot(s => ({ ...s, participants: [] }))
    },
    resetAll: () => {
      setSnapshot({ prizes: [], participants: [], records: [] })
      setResetSeq(x => x + 1)
    },
    writeSnapshot: s => setSnapshot(s),
  }), [snapshot, resetSeq])

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>
}

export function useRaffle() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('Raffle context missing')
  return ctx
}
