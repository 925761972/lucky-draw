import { useMemo, useEffect, useRef } from 'react'
import { useRaffle } from '../lib/store'

export default function ResultsPanel() {
  const { records, participants, prizes } = useRaffle()
  const latestRoundId = records.length ? records[records.length - 1].roundId : undefined
  const latestTimestamp = records.length ? Math.max(...records.map(r => r.timestamp)) : 0
  const inRound = useMemo(() => records.filter(r => r.roundId === latestRoundId).sort((a, b) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0)), [records, latestRoundId])
  const others = useMemo(() => records.filter(r => r.roundId !== latestRoundId).sort((a, b) => b.timestamp - a.timestamp), [records, latestRoundId])
  const ordered = [...inRound, ...others]

  const listRef = useRef<HTMLUListElement | null>(null)
  const prevRoundRef = useRef<string | undefined>(undefined)
  const prevCountRef = useRef<number>(0)
  useEffect(() => {
    const changedRound = prevRoundRef.current !== latestRoundId
    const changedCount = prevCountRef.current !== records.length
    if (changedRound || changedCount) {
      prevRoundRef.current = latestRoundId
      prevCountRef.current = records.length
      if (listRef.current) listRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [latestRoundId, records.length])

  function nameOfParticipant(id: string) {
    return participants.find(p => p.id === id)?.name ?? '未知'
  }
  function nameOfPrize(id: string, prizeName?: string) {
    return prizeName ?? (prizes.find(p => p.id === id)?.name ?? '未选奖品')
  }

  return (
    <div>
      <ul ref={listRef} style={{ listStyle: 'none', padding: 0, maxHeight: 520, overflowY: 'auto' }}>
        {ordered.map(r => {
          const isLatest = latestRoundId
            ? (r.roundId ? r.roundId === latestRoundId : r.timestamp === latestTimestamp)
            : (r.timestamp === latestTimestamp)
          return (
          <li key={r.id} className={`section ${isLatest ? 'win' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{nameOfParticipant(r.participantId)}</strong>
              <span style={{ color: 'var(--color-muted)', marginLeft: 8 }}>→ {nameOfPrize(r.prizeId, (r as any).prizeName)}</span>
            </div>
            <span style={{ color: 'var(--color-muted)' }}>{new Date(r.timestamp).toLocaleString()}</span>
          </li>
          )
        })}
      </ul>
    </div>
  )
}