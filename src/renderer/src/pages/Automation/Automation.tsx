import { useState } from 'react'
import { Zap, Check, AlertCircle, Copy } from 'lucide-react'

interface Task {
  label: string; desc: string; icon: string
  action: () => Promise<{ success: boolean; error?: string; results?: string[] }>
}

export default function Automation() {
  const [running, setRunning] = useState<string | null>(null)
  const [result, setResult] = useState<{ label: string; success: boolean; detail: string } | null>(null)

  // 파일 이름변경 옵션
  const [renamePrefix, setRenamePrefix] = useState('파일_')
  const [renameStart, setRenameStart] = useState('1')

  // 한글 금액 변환
  const [amountInput, setAmountInput] = useState('')
  const [amountResult, setAmountResult] = useState('')

  // 날짜·기간 계산
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [dateResult, setDateResult] = useState('')

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

  function convertAmount() {
    const raw = amountInput.replace(/[,원\s]/g, '')
    const n = parseInt(raw)
    if (isNaN(n) || n < 0) { setAmountResult('올바른 숫자를 입력해주세요.'); return }
    const korean = toKoreanAmount(n)
    const formatted = `금 ${korean}원정 (₩${n.toLocaleString()})`
    setAmountResult(formatted)
  }

  // ===== 날짜·기간 계산 함수 =====
  function calcDateRange() {
    if (!dateStart || !dateEnd) { setDateResult('시작일과 종료일을 모두 입력해주세요.'); return }
    const s = new Date(dateStart)
    const e = new Date(dateEnd)
    if (isNaN(s.getTime()) || isNaN(e.getTime())) { setDateResult('올바른 날짜를 입력해주세요.'); return }
    if (s > e) { setDateResult('종료일이 시작일보다 빠릅니다.'); return }

    const diff = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
    const totalDays = diff + 1 // 양 끝 포함

    const fmt = (d: Date) => `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`
    const fmtDot = (d: Date) => `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}.`

    setDateResult(
      `【공문서 기간 표기】\n${fmt(s)} ~ ${fmt(e)} (${totalDays}일간)\n\n` +
      `【점 표기】\n${fmtDot(s)} ~ ${fmtDot(e)}\n\n` +
      `【기간 요약】\n- 총 ${totalDays}일 (${diff}박)\n- 주말 포함 전체 일수 기준`
    )
  }

  const TASKS: Task[] = [
    {
      label: '파일 일괄 이름변경',
      desc: '폴더 내 파일을 번호 순으로 이름 변경',
      icon: '📁',
      action: async () => {
        const folder = await window.api.file.openDialog({ properties: ['openDirectory'] })
        if (!folder.success || !folder.paths?.[0]) return { success: false, error: '폴더를 선택하지 않았습니다' }
        const res = await window.api.file.batchRename(folder.paths[0], renamePrefix, parseInt(renameStart) || 1)
        return res
      }
    },
    {
      label: '텍스트 파일 저장',
      desc: '현재 클립보드 내용을 파일로 저장',
      icon: '📄',
      action: async () => {
        const text = await navigator.clipboard.readText()
        const res = await window.api.file.saveText(text, '문서_' + new Date().toLocaleDateString('ko-KR').replace(/\./g, '') + '.txt')
        return { success: res.success, detail: res.success ? '저장 완료' : res.error || '' }
      }
    },
    {
      label: '비밀번호 생성기',
      desc: '안전한 임의 비밀번호 12자리 생성 및 복사',
      icon: '🔐',
      action: async () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
        let password = ''
        for (let i = 0; i < 12; i++) password += chars.charAt(Math.floor(Math.random() * chars.length))
        await navigator.clipboard.writeText(password)
        return { success: true, detail: `생성된 비밀번호: ${password}\n클립보드에 복사되었습니다.` }
      }
    },
    {
      label: '개인정보 텍스트 마스킹',
      desc: '클립보드 내 주민/전화번호 마스킹 후 복사',
      icon: '🛡️',
      action: async () => {
        try {
          let text = await navigator.clipboard.readText()
          if (!text) return { success: false, detail: '클립보드에 텍스트가 없습니다.' }
          let count = 0
          text = text.replace(/(\d{6})[- ]?(\d{7})/g, (_, p1) => { count++; return `${p1}-*******` })
          text = text.replace(/(01[016789])[- ]?(\d{3,4})[- ]?(\d{4})/g, (_, p1, _p2, p3) => { count++; return `${p1}-****-${p3}` })
          await navigator.clipboard.writeText(text)
          return { success: true, detail: `${count}건의 개인정보가 마스킹 되었습니다.\n클립보드에 다시 복사되었습니다.` }
        } catch {
          return { success: false, detail: '텍스트 읽기/쓰기 오류' }
        }
      }
    }
  ]

  const run = async (task: Task) => {
    setRunning(task.label)
    setResult(null)
    try {
      const res = await task.action()
      setResult({
        label: task.label,
        success: res.success,
        detail: res.success
          ? (res.results ? `${res.results.length}개 파일 처리\n${res.results.slice(0, 5).join('\n')}` : (res as { detail?: string }).detail || '완료')
          : (res.error || '오류 발생')
      })
    } catch (e: unknown) {
      setResult({ label: task.label, success: false, detail: String(e) })
    } finally {
      setRunning(null)
    }
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

      {/* ===== 한글 금액 변환기 ===== */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔢</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>공문서 한글 금액 변환기</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>숫자를 공문서용 한글 금액으로 자동 변환 (예: 1500000 → 금 일백오십만원정)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input className="input flex-1" type="text" placeholder="예: 1500000 또는 1,500,000"
            value={amountInput} onChange={e => setAmountInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && convertAmount()} />
          <button onClick={convertAmount}
            className="px-4 py-2 rounded-lg text-xs font-medium text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
            변환
          </button>
        </div>
        {amountResult && (
          <div className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{amountResult}</span>
            <button onClick={() => navigator.clipboard.writeText(amountResult)}
              className="ml-3 p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
              title="복사">
              <Copy size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        )}
      </div>

      {/* ===== 공문서 날짜·기간 계산기 ===== */}
      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📅</span>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>공문서 날짜·기간 계산기</p>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>시작일~종료일을 입력하면 공문서 표준 기간 표기와 일수를 자동 계산</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="label">시작일</label>
            <input className="input" type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} />
          </div>
          <div>
            <label className="label">종료일</label>
            <input className="input" type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} />
          </div>
        </div>
        <button onClick={calcDateRange}
          className="w-full py-2 rounded-lg text-xs font-medium text-white transition-all"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
          기간 계산
        </button>
        {dateResult && (
          <div className="relative rounded-lg px-3 py-2.5"
            style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)' }}>
            <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{dateResult}</pre>
            <button onClick={() => navigator.clipboard.writeText(dateResult)}
              className="absolute top-2 right-2 p-1.5 rounded hover:bg-white/10 transition-colors"
              title="복사">
              <Copy size={13} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        )}
      </div>

      {/* 파일 이름변경 옵션 */}
      <div className="card">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>파일 이름변경 설정</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label">접두사</label>
            <input className="input" value={renamePrefix} onChange={e => setRenamePrefix(e.target.value)} placeholder="파일_" />
          </div>
          <div className="w-24">
            <label className="label">시작 번호</label>
            <input className="input" type="number" value={renameStart} onChange={e => setRenameStart(e.target.value)} min="1" />
          </div>
        </div>
      </div>

      {/* 실행 가능한 도구 */}
      <div>
        <p className="section-title">기타 도구</p>
        <div className="grid grid-cols-2 gap-3">
          {TASKS.map(task => (
            <button key={task.label} onClick={() => run(task)}
              disabled={running === task.label}
              className="card text-left hover:border-cyan-500/30 transition-all group">
              <div className="text-2xl mb-2">{task.icon}</div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{task.label}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{task.desc}</p>
              {running === task.label && (
                <div className="mt-2 flex items-center gap-1.5 text-xs" style={{ color: '#06b6d4' }}>
                  <span className="spinner" /> 처리 중...
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 */}
      {result && (
        <div className="card" style={{ borderColor: result.success ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
          <div className="flex items-start gap-2">
            {result.success
              ? <Check size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
              : <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            }
            <div>
              <p className="text-xs font-medium" style={{ color: result.success ? '#10b981' : '#ef4444' }}>
                {result.label} - {result.success ? '완료' : '오류'}
              </p>
              <pre className="text-xs mt-1 whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {result.detail}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
