import { useRaffle } from '../lib/store'

export default function HistoryPanel() {
  const { records, participants, prizes } = useRaffle()

  function toCSV() {
    const header = ['id', 'prize', 'participant', 'mode', 'timestamp']
    const rows = records.map(r => [
      r.id,
      r.prizeName ?? (prizes.find(p => p.id === r.prizeId)?.name ?? ''),
      participants.find(p => p.id === r.participantId)?.name ?? '',
      r.mode,
      new Date(r.timestamp).toISOString(),
    ])
    const csv = [header, ...rows].map(cols => cols.map(s => String(s).replaceAll('"', '""')).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'raffle-history.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ color: 'var(--color-muted)' }}>共 {records.length} 条记录</div>
        <button className="accent" onClick={toCSV}>导出 CSV</button>
      </div>
      <div className="section" style={{ maxHeight: 280, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '28%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: 8, verticalAlign: 'top' }}>时间</th>
              <th style={{ textAlign: 'left', padding: 8, verticalAlign: 'top' }}>奖品</th>
              <th style={{ textAlign: 'left', padding: 8, verticalAlign: 'top' }}>参与者</th>
              <th style={{ textAlign: 'left', padding: 8, verticalAlign: 'top' }}>抽奖编码</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td style={{ padding: 8, textAlign: 'left', verticalAlign: 'top' }}>{new Date(r.timestamp).toLocaleString()}</td>
                <td style={{ padding: 8, textAlign: 'left', verticalAlign: 'top' }}>{r.prizeName ?? (prizes.find(p => p.id === r.prizeId)?.name ?? '未选奖品')}</td>
                <td style={{ padding: 8, textAlign: 'left', verticalAlign: 'top' }}>{participants.find(p => p.id === r.participantId)?.name ?? ''}</td>
                <td style={{ padding: 8, textAlign: 'left', verticalAlign: 'top' }}>{shortCode(r.roundId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function shortCode(id?: string) {
  if (!id) return '-'
  const hex = id.split('_')[1] ?? id
  return hex.slice(0, 8)
}