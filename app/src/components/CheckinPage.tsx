import { useEffect, useState } from 'react'
import { createCheckin, getCheckinCount, loadCheckins } from '../lib/checkin.ts'
import { uid } from '../lib/id'

export default function CheckinPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)
  const [error, setError] = useState('')
  const [device, setDevice] = useState('')
  const [session, setSession] = useState('')
  const [rank, setRank] = useState(0)
  useEffect(() => {
    let stop = false
    async function tick() {
      const c = await getCheckinCount(session)
      setCount(c)
      if (!stop) setTimeout(tick, 2000)
    }
    tick()
    return () => { stop = true }
  }, [])
  useEffect(() => {
    const ph = localStorage.getItem('checkin_phone')
    if (ph) setDone(true)
    let did = localStorage.getItem('checkin_device')
    if (!did) { did = uid('dev'); localStorage.setItem('checkin_device', did) }
    setDevice(did)
    const url = new URL(window.location.href)
    const s = url.searchParams.get('s') || ''
    setSession(s)
    Promise.resolve().then(async () => {
      const rows = await loadCheckins(s)
      const exists = rows.some(r => r.phone === ph || r.device === did)
      if (!exists) {
        localStorage.removeItem('checkin_phone')
        setDone(false)
      }
    })
  }, [])
  async function submit() {
    setError('')
    const nm = name.trim()
    const ph = phone.trim()
    if (!nm || !ph) { setError('请填写姓名与手机号'); return }
    if (!/^1\d{10}$/.test(ph)) { setError('请输入有效的11位手机号'); return }
    setLoading(true)
    try {
      const r = await createCheckin(nm, ph, device, session)
      if (r.ok) { 
        setDone(true)
        localStorage.setItem('checkin_phone', ph) 
        if (r.rank) setRank(r.rank)
      }
      else { 
        // 显示详细错误信息
        const msg = r.message || '提交失败'
        // 如果是网络相关错误，提示更友好
        if (msg.includes('fetch') || msg.includes('network')) {
          setError(`网络请求失败，请重试 (${msg})`)
        } else if (msg === 'env_missing') {
          setError('服务器配置错误：环境变量缺失')
        } else {
          setError(msg)
        }
      }
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="container">
      <div className="section" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h2 className="title">活动签到</h2>
        <div style={{ color: 'var(--color-muted)', marginBottom: 10 }}>已签到人数：{count}</div>
        {!done ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="姓名" value={name} onChange={e => setName(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: '#0e0e0e', color: 'var(--color-text)', fontSize: 18 }} />
            <input placeholder="手机号" value={phone} onChange={e => setPhone(e.target.value)} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: '#0e0e0e', color: 'var(--color-text)', fontSize: 18 }} />
            <button className="accent" onClick={submit} disabled={loading}>{loading ? '提交中…' : '确认签到'}</button>
            <div style={{ color: 'var(--color-muted)', fontSize: 13 }}>信息仅用于活动中奖验证，不会泄露或用于其他用途</div>
            {error && <div style={{ color: '#f66', marginTop: 6 }}>{error}</div>}
          </div>
        ) : (
          <div className="section" style={{ textAlign: 'center' }}>
            <div className="title">签到成功</div>
            {rank > 0 && <div className="gradient" style={{ fontSize: 24, margin: '12px 0', fontWeight: 'bold' }}>您是第 {rank} 位签到者</div>}
            <div style={{ color: 'var(--color-muted)', marginTop: 8 }}>请返回主持人页面等待抽奖</div>
          </div>
        )}
      </div>
    </div>
  )
}
