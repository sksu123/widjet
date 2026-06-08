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
        if (!res.success) return { success: false, detail: res.error || '백업 실패' }
        
        // 경로에서 폴더 부분 추출 (마지막 슬래시 이전)
        const pathStr = res.path as string || ''
        const folderPath = pathStr.substring(0, pathStr.lastIndexOf('\\')) || pathStr.substring(0, pathStr.lastIndexOf('/')) || pathStr
        
        return { 
          success: true, 
          detail: `저장된 파일: ${pathStr}\n\n[ 백업 폴더 위치 ]\n${folderPath}\n\n백업 내용: 사용자 설정, 일정, 공문, 시스템 데이터 전체 백업 완료` 
        }
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
        for (let i = 0; i < 12; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length))
        }
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
          // 주민번호 
          text = text.replace(/(\d{6})[- ]?(\d{7})/g, (match, p1, p2) => { count++; return `${p1}-*******` })
          // 폰번호
          text = text.replace(/(01[016789])[- ]?(\d{3,4})[- ]?(\d{4})/g, (match, p1, p2, p3) => { count++; return `${p1}-****-${p3}` })
          
          await navigator.clipboard.writeText(text)
          return { success: true, detail: `${count}건의 개인정보가 마스킹 되었습니다.\n클립보드에 다시 복사되었습니다.` }
        } catch (e) {
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
          ? (res.results ? `${res.results.length}개 파일 처리\n${res.results.slice(0, 5).join('\n')}` : res.error || '완료')
          : (res.error || '오류 발생')
      })
    } catch (e: unknown) {
      setResult({ label: task.label, success: false, detail: String(e) })
    } finally {
      setRunning(null)
    }
  }


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
