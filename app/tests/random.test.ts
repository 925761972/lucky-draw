import { describe, it, expect } from 'vitest'
import { drawSingle } from '../src/lib/random'

function mkParticipants(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `u_${i}`, name: `P${i}` }))
}

describe('随机性近似均匀', () => {
  it('单次抽取在大样本下分布均衡', () => {
    const N = 10
    const trials = 100000
    const participants = mkParticipants(N)
    const freq = new Array(N).fill(0)
    for (let t = 0; t < trials; t++) {
      const p = drawSingle(participants)
      if (!p) continue
      const idx = Number(p.id.split('_')[1])
      freq[idx]++
    }
    const avg = trials / N
    const maxDev = Math.max(...freq.map(f => Math.abs(f - avg))) / avg
    expect(maxDev).toBeLessThan(0.03)
  })
})