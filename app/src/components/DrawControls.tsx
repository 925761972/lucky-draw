import { useEffect, useRef, useState } from 'react'
import { useRaffle } from '../lib/store'
import { drawSingle, drawBatch } from '../lib/random'
import type { DrawMode, DrawRecord } from '../lib/types'
import { uid } from '../lib/id'
import { playLevelUp, sprayConfetti, startAmbience } from '../lib/effects'

export default function DrawControls() {
  const { participants, prizes, records, writeSnapshot, resetSeq } = useRaffle()
  const [mode, setMode] = useState<DrawMode>('single')
  const [batch, setBatch] = useState(3)
  const [current, setCurrent] = useState<string[]>([])
  const [prizeId, setPrizeId] = useState(prizes[0]?.id ?? '')
  const [isRolling, setRolling] = useState(false)
  // const [display, setDisplay] = useState('')
  const [displayGrid, setDisplayGrid] = useState<string[]>(Array(6).fill(''))
  const [showOverlay, setShowOverlay] = useState(false)
  const [overlayCount, setOverlayCount] = useState(0)
  const overlayTimer = useRef<number | null>(null)
  const rollTimer = useRef<number | null>(null)
  const ambienceStop = useRef<(() => void) | null>(null)

  useEffect(() => () => { if (rollTimer.current) clearInterval(rollTimer.current) }, [])

  useEffect(() => {
    if (rollTimer.current) { clearInterval(rollTimer.current); rollTimer.current = null }
    if (ambienceStop.current) { ambienceStop.current(); ambienceStop.current = null }
    setRolling(false)
    // setDisplay('')
    setDisplayGrid(Array(6).fill(''))
    setCurrent([])
    setShowOverlay(false)
    setOverlayCount(0)
    if (overlayTimer.current) { clearInterval(overlayTimer.current); overlayTimer.current = null }
  }, [resetSeq])

  function run() {
    if (!prizeId) return
    // 排除已中奖用户
    const winners = new Set(records.map(r => r.participantId))
    const candidates = participants.filter(p => !winners.has(p.id))

    if (candidates.length === 0) {
      alert('所有参与者都已中奖！')
      return
    }

    setRolling(true)
    setShowOverlay(true)
    setOverlayCount(5)
    ambienceStop.current = startAmbience('magic', 0.9)
    overlayTimer.current = window.setInterval(() => {
      setOverlayCount(c => {
        const next = c - 1
        return next >= 0 ? next : 0
      })
    }, 1000)
    setCurrent([])
    // 快速滚动显示随机姓名
    rollTimer.current = window.setInterval(() => {
      const grid = Array.from({ length: 6 }, () => drawSingle(candidates)?.name ?? '')
      setDisplayGrid(grid)
    }, 60)

    // stop ambience 1s before overlay ends
    window.setTimeout(() => { if (ambienceStop.current) { ambienceStop.current(); ambienceStop.current = null } }, 4000)

    // 5 秒后关闭提示叠层
    window.setTimeout(() => { setShowOverlay(false); if (overlayTimer.current) { clearInterval(overlayTimer.current); overlayTimer.current = null } }, 5000)

    // 5 秒后停止滚动并给出最终结果
    window.setTimeout(() => {
      if (rollTimer.current) { clearInterval(rollTimer.current); rollTimer.current = null }
      let winnersNames: string[] = []
      let newRecords: DrawRecord[] = []
      const now = Date.now()
      const roundId = uid('round')
      if (mode === 'single') {
        const p = drawSingle(candidates)
        if (!p) { setRolling(false); return }
        winnersNames = [p.name]
        const prizeName = prizes.find(x => x.id === prizeId)?.name
        newRecords = [{ id: uid('r'), prizeId, prizeName, participantId: p.id, timestamp: now, mode, roundId, roundIndex: 0 }]
      } else {
        const picked = drawBatch(candidates, batch)
        winnersNames = picked.map(p => p.name)
        const prizeName = prizes.find(x => x.id === prizeId)?.name
        newRecords = picked.map((p, idx) => ({ id: uid('r'), prizeId, prizeName, participantId: p.id, timestamp: now, mode, roundId, roundIndex: idx }))
      }
      setCurrent(winnersNames)
      writeSnapshot({ prizes, participants, records: [...records, ...newRecords] })
      setRolling(false)
      if (ambienceStop.current) { ambienceStop.current(); ambienceStop.current = null }
      playLevelUp()
      sprayConfetti()
    }, 5000)
  }

  return (
    <div>
      {showOverlay && (
        <div className="overlay overlay-3d">
          <div className="overlay-card">
            <div className="overlay-title">好运降临</div>
            <div className="overlay-sub">抽奖中…</div>
            <div className="overlay-count">{overlayCount}</div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center' }}>
        <select value={prizeId} onChange={e => setPrizeId(e.target.value)} style={{ padding: 10, borderRadius: 8, background: '#0e0e0e', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontSize: 23 }}>
         <option value="">选择奖品</option>
         {prizes.map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
         ))}
        </select>

        <select value={mode} onChange={e => setMode(e.target.value as DrawMode)} style={{ padding: 10, borderRadius: 8, background: '#0e0e0e', color: 'var(--color-text)', border: '1px solid var(--color-border)', fontSize: 23 }}>
         <option value="single">单次抽奖</option>
         <option value="batch">批量抽奖</option>
        </select>

        {mode === 'batch' && (
          <input type="number" min={1} value={batch} onChange={e => setBatch(Number(e.target.value))} style={{ width: 100, padding: 10, borderRadius: 8, background: '#0e0e0e', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} />
        )}

        <button className="btn-mini" data-tip="全屏" onClick={(e) => {
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            document.documentElement.requestFullscreen()
          }
          ;(e.currentTarget as HTMLButtonElement).blur()
        }} title="全屏抽奖">⛶</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <button className="accent big" onClick={run} disabled={isRolling}>
          {isRolling ? '抽奖中…' : '开始抽奖'}
        </button>
      </div>

      <div className="section" style={{ marginTop: 12, textAlign: 'center' }}>
        {isRolling ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {displayGrid.map((name, i) => (
              <div key={i} className="section" style={{ fontSize: 48, fontWeight: 700, minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{name}</div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 63, fontWeight: 700, minHeight: 84, whiteSpace: 'pre-wrap' }}>
            {current.length ? current.join('   ') : '等待开始'}
          </div>
        )}
      </div>

      <div style={{ color: 'var(--color-muted)', textAlign: 'center', marginTop: 6, whiteSpace: 'pre-wrap' }}>中奖名单：{isRolling ? '***' : current.join('   ')}</div>
    </div>
  )
}