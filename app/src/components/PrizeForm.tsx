import { useState } from 'react'
import { useRaffle } from '../lib/store'

export default function PrizeForm() {
  const { prizes, addPrize, removePrize } = useRaffle()
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)

  return (
    <div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          placeholder="奖品名称"
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--color-border)', background: '#0e0e0e', color: 'var(--color-text)' }}
        />
        <input
          type="number"
          min={1}
          placeholder="数量"
          value={qty}
          onChange={e => setQty(Number(e.target.value))}
          style={{ width: 100, padding: 10, borderRadius: 8, border: '1px solid var(--color-border)', background: '#0e0e0e', color: 'var(--color-text)' }}
        />
        <button className="accent" onClick={() => {
          if (!name.trim() || qty < 1) return
          addPrize(name.trim(), qty)
          setName('')
          setQty(1)
        }}>添加奖品</button>
      </div>

      <ul className="narrow" style={{ listStyle: 'none', padding: 0, marginTop: 6 }}>
        {prizes.map(p => (
          <li key={p.id} className="section compact" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>{p.name}</strong>
              <span style={{ color: 'var(--color-muted)', marginLeft: 8 }}>数量 {p.quantity}</span>
            </div>
            <button className="btn-delete" onClick={() => removePrize(p.id)}>删除</button>
          </li>
        ))}
      </ul>
    </div>
  )
}