import './App.css'
import PrizeForm from './components/PrizeForm'
import ParticipantImport from './components/ParticipantImport'
import DrawControls from './components/DrawControls'
import ResultsPanel from './components/ResultsPanel'
import HistoryPanel from './components/HistoryPanel'
import CheckinPage from './components/CheckinPage'
import { useRaffle } from './lib/store'
import { useEffect, useState } from 'react'
import { loadCheckins, getCheckinCount, resetCheckins } from './lib/checkin.ts'
import { uid } from './lib/id'
import { useRef } from 'react'

function App() {
  const { resetAll, addParticipantsWithMeta, sessionId: session } = useRaffle()
  // 强制使用 location.origin 作为 base，确保生成的二维码带域名
  const [url, setUrl] = useState(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      const base = window.location.origin
      const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
      return `${cleanBase}/checkin`
    }
    return ''
  })
  
  useEffect(() => {
    if (!url && typeof window !== 'undefined' && window.location?.origin) {
      const base = location.origin
      // 移除末尾的斜杠
      const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base
      setUrl(`${cleanBase}/checkin`)
    }
  }, [url])

  const [checkinCount, setCheckinCount] = useState(0)
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!url) return
    const target = `${url}?s=${session}`
    Promise.resolve().then(async () => {
      try {
        const QR = await import('qrcode')
        if (qrCanvasRef.current) {
          QR.toCanvas(qrCanvasRef.current, target, { width: 320, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
        }
      } catch {}
    })
  }, [url, session])
  useEffect(() => {
    let stop = false
    async function tick() {
      try {
        const rows = await loadCheckins(session)
        const items = (rows as { name: string, phone: string, device?: string }[]).map(r => ({ name: r.name, meta: { phone: r.phone, device: r.device ?? '' } }))
        ;(addParticipantsWithMeta as (items: { name: string, meta?: Record<string,string> }[]) => void)(items)
        const c = await getCheckinCount(session)
        setCheckinCount(c)
      } catch {}
      if (!stop) setTimeout(tick, 2000)
    }
    tick()
    return () => { stop = true }
  }, [session])
  if (window.location.pathname === '/checkin') return <CheckinPage />
  return (
    <div className="container">
      <header className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title gradient">TRAE Friends 抽奖助手</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="https://www.trae.ai/" target="_blank" rel="noreferrer">
            了解 TRAE
          </a>
          <button className="btn-nofocus" onClick={async (e) => { 
            if (!confirm('确定要重置当前场次的所有签到记录吗？此操作不可恢复。')) return
            const btn = e.currentTarget as HTMLButtonElement
            const originText = btn.textContent
            btn.disabled = true
            btn.textContent = '...'
            try {
              const ok = await resetCheckins(session)
              if (ok) {
                resetAll()
                setCheckinCount(0)
              } else {
                alert('重置失败：数据库权限不足。请在 Supabase 执行 SQL: create policy "Enable delete for anon" on checkins for delete using (true);')
              }
            } finally {
              btn.disabled = false
              btn.textContent = originText
              btn.blur()
            }
          }} style={{ padding: '6px 10px' }}>重置</button>
        </div>
      </header>

      <main>
        <section className="section">
          <div className="stats-grid">
            <div className="stats-title"><h2 className="title gradient">扫码签到</h2></div>
            <div className="stats-label">已签到人数</div>
            <div style={{ gridRow: '2 / 4' }}>
               <canvas ref={qrCanvasRef} width={320} height={320} style={{ border: '1px solid var(--color-border)' }} />
               <div style={{ fontSize: 12, color: 'var(--color-muted)', maxWidth: 320, wordBreak: 'break-all', textAlign: 'center', marginTop: 4 }}>{url}</div>
            </div>
            <div className="stats-number" style={{ gridColumn: 2, gridRow: '2 / 4', alignSelf: 'center' }}>{checkinCount}</div>
            <button className="btn-mini" style={{ position: 'absolute', bottom: 8, right: 16 }} onClick={() => {
              Promise.resolve().then(async () => {
                const rows = await loadCheckins(session)
                const header = 'name,phone,timestamp\n'
                const body = rows.map(r => `${String(r.name ?? '').replaceAll('"','""')},${String(r.phone ?? '').replaceAll('"','""')},${typeof r.timestamp === 'string' ? r.timestamp : new Date(r.timestamp ?? Date.now()).toISOString()}`).join('\n')
                const csv = header + body
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'checkins.csv'
                document.body.appendChild(a)
                a.click()
                a.remove()
                URL.revokeObjectURL(url)
              })
            }}>下载签到 CSV</button>
          </div>
        </section>
        <section className="section">
          <div className="section">
            <h3 className="title">奖品设置</h3>
            <PrizeForm />
          </div>
          <div className="section">
            <DrawControls />
          </div>
        </section>

        <section className="section">
          <h2 className="title">🏆中奖名单</h2>
          <ResultsPanel />
        </section>

        <section className="section">
          <h2 className="title">历史记录区</h2>
          <HistoryPanel />
        </section>

        <section className="section">
          <h2 className="title">参与者导入</h2>
          <ParticipantImport />
        </section>
      </main>
    </div>
  )
}

export default App
