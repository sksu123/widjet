import { useState, useEffect } from 'react'
import { Zap, Copy, ClipboardList, Trash2 } from 'lucide-react'

export default function Automation() {
  // 클립보드 스니펫 (label + text 구조)
  const [snippets, setSnippets] = useState<{ label: string; text: string }[]>(
    Array(9).fill(null).map(() => ({ label: '', text: '' }))
  )

  // 한글 금액 변환
  const [amountInput, setAmountInput] = useState('')
  const [amountResult, setAmountResult] = useState('')

  // 멀티 클립보드 히스토리
  const [clipboardHistory, setClipboardHistory] = useState<{ id: string; text: string; time: number }[]>([])
  
  const loadClipboardHistory = async () => {
    try {
      const res = await (window as any).api.system.getClipboardHistory()
      if (res && res.success) {
        setClipboardHistory(res.data || [])
      }
    } catch(e) {}
  }
  
  useEffect(() => {
    loadClipboardHistory()
    const interval = setInterval(loadClipboardHistory, 1500)
    return () => clearInterval(interval)
  }, [])
  
  const clearHistory = async () => {
    if(confirm('클립보드 히스토리를 모두 지우시겠습니까?')) {
      await (window as any).api.system.clearClipboardHistory()
      loadClipboardHistory()
    }
  }
  
  const copyHistoryItem = async (text: string) => {
    await (window as any).api.system.writeClipboard(text)
    new Notification('클립보드에 복사됨', { body: text.slice(0, 50) })
  }

  // 저장된 스니펫 불러오기
  useEffect(() => {
    window.api.db.getSettings().then(res => {
      if (res.success && res.data.clipboard_snippets) {
        try {
          const arr = JSON.parse(res.data.clipboard_snippets)
          const newSnippets = Array(9).fill(null).map(() => ({ label: '', text: '' }))
          for (let i = 0; i < Math.min(arr.length, 9); i++) {
            if (typeof arr[i] === 'string') {
              newSnippets[i] = { label: '', text: arr[i] }
            } else if (arr[i] && typeof arr[i] === 'object') {
              const lbl = arr[i].label === '[object Object]' ? '' : (arr[i].label || '')
              const txt = String(arr[i].text) === '[object Object]' ? '' : (arr[i].text || '')
              newSnippets[i] = { label: lbl, text: txt }
            }
          }
          setSnippets(newSnippets)
        } catch (e) {}
      }
    })
  }, [])

  const updateSnippet = async (index: number, field: 'label' | 'text', val: string) => {
    const newArr = snippets.map((s, i) => (i === index ? { ...s, [field]: val } : s))
    setSnippets(newArr)
    await window.api.db.updateSetting('clipboard_snippets', JSON.stringify(newArr))
    await (window.api as any).system.registerSnippets(newArr)
  }

  // ===== 한글 금액 변환 함수 =====
  function toKoreanAmount(num: number): string {
    if (num === 0) return '영원'
    const units = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
    const tens = ['', '십', '백', '천']
    const bigs = ['', '만', '억', '조']
    let result = ''
    let bigIdx = 0
    while (num > 0) {
      const chunk = num % 10000
      if (chunk > 0) {
        let chunkStr = ''
        let n = chunk
        for (let i = 0; i < 4 && n > 0; i++) {
          const d = n % 10
          if (d > 0) chunkStr = units[d] + tens[i] + chunkStr
          n = Math.floor(n / 10)
        }
        result = chunkStr + bigs[bigIdx] + result
      }
      bigIdx++
      num = Math.floor(num / 10000)
    }
    return result
  }

    return (
    <div className="fade-in space-y-4 pb-8">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <h1 className="page-title">업무 자동화 센터</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>반복 업무를 자동화하여 효율을 높이세요</p>
        </div>
      </div>

      {/* ===== 클립보드 스니펫 & 단축키 허브 ===== */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📋</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>클립보드 스니펫 & 단축키 허브</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              자주 쓰는 문구를 단축키(Alt+1~9)나 클릭으로 나이스/에듀파인에 바로 붙여넣기
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {snippets.map((snip, i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 rounded-xl border p-3"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}
            >
              {/* 헤더: 단축키 배지 + 복사 버튼 */}
              <div className="flex items-center justify-between">
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(6,182,212,0.15)', color: 'var(--accent-blue)' }}
                >
                  Alt + {i + 1}
                </span>
                <button
                  onClick={() => {
                    if (!snip.text) return
                    navigator.clipboard.writeText(snip.text)
                    new Notification('클립보드에 복사됨', { body: snip.label ? snip.label : snip.text.slice(0, 50) })
                  }}
                  className="text-[10px] px-2.5 py-1 rounded-lg border font-medium transition-all"
                  style={{
                    color: snip.text ? '#06b6d4' : 'var(--text-muted)',
                    borderColor: snip.text ? 'rgba(6,182,212,0.4)' : 'var(--border)',
                    background: snip.text ? 'rgba(6,182,212,0.08)' : 'transparent'
                  }}
                >
                  복사
                </button>
              </div>

              {/* 설명(label) 입력 */}
              <input
                className="input text-xs py-1.5 px-2"
                style={{ background: 'var(--bg-background)' }}
                value={snip.label}
                onChange={e => updateSnippet(i, 'label', e.target.value)}
                placeholder="설명 입력"
              />

              {/* 내용(text) 입력 */}
              <input
                className="input text-xs py-1.5 px-2 font-mono"
                style={{ background: 'var(--bg-card)' }}
                value={snip.text}
                onChange={e => updateSnippet(i, 'text', e.target.value)}
                placeholder="복사할 텍스트 입력"
              />
            </div>
          ))}
        </div>

        <p className="text-[10px] px-1" style={{ color: 'var(--text-muted)' }}>
          ※ 입력한 내용은 자동 저장됩니다. Alt+숫자 단축키는 앱 실행 중 전역으로 동작합니다.
        </p>
      </div>

      {/* ===== 멀티 클립보드 히스토리 & 스택 ===== */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg" style={{ background: 'rgba(6,182,212,0.15)' }}>
              <ClipboardList size={18} style={{ color: '#06b6d4' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>최근 복사 기록 (클립보드)</p>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>최근 복사한 항목 20개를 순서대로 보관하여 빠르게 붙여넣으세요.</p>
            </div>
          </div>
          <button onClick={clearHistory} className="text-[10px] flex items-center gap-1 text-red-500 px-2 py-1 rounded transition-colors" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <Trash2 size={12} /> 비우기
          </button>
        </div>
        
        <div className="border rounded-xl overflow-hidden shadow-sm flex flex-col" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', minHeight: '400px', flex: 1 }}>
          {clipboardHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center opacity-50 flex-1">
              <ClipboardList size={32} className="mb-2" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>클립보드 기록이 없습니다.</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>Ctrl+C 로 텍스트를 복사하면 여기에 누적됩니다.</p>
            </div>
          ) : (
            <div className="divide-y overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
              {clipboardHistory.map((item, idx) => (
                <div key={item.id} className="p-3 transition-colors flex items-start justify-between gap-3 group relative cursor-pointer" 
                  style={{ background: 'var(--bg-card)' }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-tertiary, rgba(0,0,0,0.02))'}
                  onMouseOut={e => e.currentTarget.style.background = 'var(--bg-card)'}
                  onClick={() => copyHistoryItem(item.text)}>
                  <div className="flex items-center gap-2 mt-0.5 opacity-60 font-mono text-[10px]">
                    <span className="w-4 h-4 flex items-center justify-center rounded-full" style={{ background: 'var(--border)', color: 'var(--text-secondary)' }}>{idx + 1}</span>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm whitespace-pre-wrap break-all line-clamp-4" style={{ color: 'var(--text-primary)' }}>{item.text}</p>
                    <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>{new Date(item.time).toLocaleTimeString()}</p>
                  </div>
                  <button className="p-1.5 rounded flex-shrink-0" title="복사"
                    style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>
                    <Copy size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
