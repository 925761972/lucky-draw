import type { Participant } from './types'

export function randomInt(maxExclusive: number) {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return Number(array[0] % maxExclusive)
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}

export function drawSingle(participants: Participant[]): Participant | null {
  if (participants.length === 0) return null
  const idx = randomInt(participants.length)
  return participants[idx]
}

export function drawBatch(participants: Participant[], count: number): Participant[] {
  if (count <= 0 || participants.length === 0) return []
  const a = shuffle(participants)
  return a.slice(0, Math.min(count, participants.length))
}