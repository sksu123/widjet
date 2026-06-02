import { useState } from 'react'
import { Zap, FolderOpen, RefreshCw, FileText, Check, AlertCircle } from 'lucide-react'

interface Task {
  label: string; desc: string; icon: string
  action: () => Promise<{ success: boolean; error?: string; results?: string[] }>
}

export default function Automation() {
  const [running, setRunning] = useState<string | null>(null)
  const [result, setResult] = useState<{ label: string; success: boolean; detail: string } | null>(null)

  const [renamePrefix, setRenamePrefix] = useState('파일_')
  const [renameStart, setRenameStart] = useState('1')

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
      label: '데이터베이스 백업',
      desc: '앱 데이터를 안전하게 백업',
      icon: '💾',
      action: async () => {
        const res = await window.api.file.backupDb()
        return { success: res.success, detail: res.success ? `백업 완료: ${res.path}` : res.error || '' }
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
          ? (res.results ? `${res.results.length}개 파일 처리\n${res.results.slice(0, 5).join('\n')}` : res.error || '완료')
          : (res.error || '오류 발생')
      })
    } catch (e: unknown) {
      setResult({ label: task.label, success: false, detail: String(e) })
    } finally {
      setRunning(null)
    }
  }

  const COMING_SOON = [
    { label: 'PDF 병합', icon: '📑', desc: '여러 PDF를 하나로 합치기' },
    { label: 'PDF 분할', icon: '✂️', desc: 'PDF를 페이지별로 분할' },
    { label: '한글→PDF 변환', icon: '🔄', desc: 'HWP 파일을 PDF로 변환' },
    { label: '엑셀 집계', icon: '📊', desc: '엑셀 데이터 자동 집계' },
    { label: '이미지 압축', icon: '🖼️', desc: '이미지 파일 용량 최적화' },
  ]

  return (
    <div className="fade-in space-y-4">
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

      {/* 이름 변경 옵션 */}
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
        <p className="section-title">사용 가능한 도구</p>
        <div className="grid grid-cols-3 gap-3">
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

      {/* 개발 예정 */}
      <div>
        <p className="section-title">개발 예정 도구</p>
        <div className="grid grid-cols-5 gap-2">
          {COMING_SOON.map(tool => (
            <div key={tool.label} className="card text-center opacity-50 cursor-not-allowed">
              <div className="text-xl mb-1">{tool.icon}</div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{tool.label}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>준비 중</p>
            </div>
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
