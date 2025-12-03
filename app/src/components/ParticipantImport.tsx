import { useState, useRef, useEffect } from 'react'
import { useRaffle } from '../lib/store'

function parseCSV(text: string): string[] {
  return text
    .split(/\r?\n|,/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

function parseCSVFile(content: string): string[] {
  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0)
  if (lines.length === 0) return []
  
  // 定义需要过滤掉的关键词（说明文字、提示等）
  const filterKeywords = [
    '请创建新文档', '复制该文档', '请勿直接修改', '短信内容', 
    '邀请名单', '第一批', '第二批', '第三批', '名单',
    'document', 'content', 'message', 'list', 'batch'
  ]
  
  // 过滤掉包含说明文字的整行
  const validLines = lines.filter(line => {
    const trimmedLine = line.trim()
    // 跳过太长的行（可能是说明文字）
    if (trimmedLine.length > 50) return false
    // 跳过包含过滤关键词的行
    if (filterKeywords.some(keyword => trimmedLine.includes(keyword))) return false
    // 跳过包含特殊字符的行（如冒号、括号等）
    if (/[:：【】（）()<>《》]/.test(trimmedLine)) return false
    return true
  })
  
  if (validLines.length === 0) return []
  
  // 检查是否是标题行（包含非中文字符的列名）
  const header = validLines[0].split(',').map(col => col.trim())
  const hasHeader = header.some(col => /[a-zA-Z]/.test(col))
  
  // 找到最可能是名字的列（优先选择第一个包含中文的列，否则选择第一个列）
  let nameColumnIndex = 0
  if (hasHeader) {
    // 查找包含"名"或"姓名"的列
    const nameColumn = header.findIndex(col => 
      col.includes('姓名') || col.includes('名字') || col.includes('name') || col.includes('Name')
    )
    if (nameColumn !== -1) {
      nameColumnIndex = nameColumn
    }
  }
  
  // 提取名字数据（跳过标题行如果有的话）
  const startRow = hasHeader ? 1 : 0
  const names: string[] = []
  
  for (let i = startRow; i < validLines.length; i++) {
    const columns = validLines[i].split(',').map(col => col.trim())
    if (columns[nameColumnIndex] && columns[nameColumnIndex].length > 0) {
      const name = columns[nameColumnIndex]
      // 进一步过滤：确保是真实姓名
      if (isValidName(name)) {
        names.push(name)
      }
    }
  }
  
  return names
}

function isValidName(name: string): boolean {
  // 姓名长度检查（2-20个字符，支持英文名可能更长）
  if (name.length < 2 || name.length > 20) return false
  
  // 支持中文、英文、中英文混合
  const hasValidChars = /^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(name)
  if (!hasValidChars) return false
  
  // 必须包含至少一个字母或汉字（不能全是空格）
  if (!/[\u4e00-\u9fa5a-zA-Z]/.test(name)) return false
  
  // 过滤掉包含数字和特殊符号的（除了空格）
  if (/[0-9@#$%^&*()_+=\[\]{}|;:'",.<>?/\\]/.test(name)) return false
  
  // 过滤掉常见的说明文字和太通用的词
  const invalidNames = ['姓名', '名字', '名称', 'name', 'Name', '测试', 'test', 'abc', 'xyz']
  if (invalidNames.includes(name.toLowerCase())) return false
  
  // 过滤掉太短的纯英文（可能是缩写）
  if (/^[a-zA-Z]+$/.test(name) && name.length < 3) return false
  
  return true
}

export default function ParticipantImport() {
  const { participants, addParticipants, removeParticipant, updateParticipant, clearParticipants, resetSeq, normalizeParticipants } = useRaffle()
  const [raw, setRaw] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 监听重置事件，清空textarea
  useEffect(() => {
    setRaw('')
  }, [resetSeq])

  useEffect(() => {
    normalizeParticipants()
  }, [participants])

  const preview = parseCSV(raw).slice(0, 10)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      if (content) {
        const names = parseCSVFile(content)
        if (names.length > 0) {
          setRaw(names.join('\n'))
        }
      }
    }
    reader.readAsText(file)
    
    // 清空文件输入，允许重复选择同一个文件
    event.target.value = ''
  }

  const handleImportFile = () => {
    fileInputRef.current?.click()
  }

  return (
    <div>
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      <textarea
        placeholder="粘贴 CSV 或按行输入姓名"
        value={raw}
        onChange={e => setRaw(e.target.value)}
        rows={6}
        style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--color-border)', background: '#0e0e0e', color: 'var(--color-text)', fontSize: 18 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: 'var(--color-muted)' }}>预览：{preview.join(', ')}</div>
          <button className="btn-nofocus" onClick={(e) => {
            if (confirm('确认清空所有参与者？')) clearParticipants()
            ;(e.currentTarget as HTMLButtonElement).blur()
          }}>清空参与者</button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-mini" onClick={(e) => {
            handleImportFile()
            ;(e.currentTarget as HTMLButtonElement).blur()
          }}>选择CSV文件</button>
          <button className="accent" onClick={(e) => {
            const names = parseCSV(raw)
            if (names.length === 0) return
            addParticipants(names)
            setRaw('')
            ;(e.currentTarget as HTMLButtonElement).blur()
          }}>导入参与者</button>
        </div>
      </div>

      <div className="section compact" style={{ marginTop: 8, maxHeight: 160, overflow: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
          {participants.map(p => (
            <div key={p.id} className="section compact" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <input
                value={p.name}
                onChange={e => updateParticipant(p.id, e.target.value)}
                style={{ flex: 1, padding: 6, borderRadius: 4, border: '1px solid var(--color-border)', background: '#0e0e0e', color: 'var(--color-text)', fontSize: 18 }}
              />
              <button className="btn-delete" onClick={() => removeParticipant(p.id)}>删除</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
