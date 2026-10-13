import { useState, useEffect } from 'react'
import { Minus, Square, X, Pin, PinOff, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

declare global {
  interface Window {
    api: import('../../types/api').API
  }
}

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [time, setTime] = useState(new Date())
  const [updateBanner, setUpdateBanner] = useState<{ type: 'available' | 'downloaded'; version: string } | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // 업데이트 IPC 이벤트 수신
  useEffect(() => {
    if (!(window.api as any).updater) return

    ;(window.api as any).updater.onUpdateAvailable((info: any) => {
      setUpdateBanner({ type: 'available', version: info.version || '' })
    })
    ;(window.api as any).updater.onUpdateDownloaded((info: any) => {
      setUpdateBanner({ type: 'downloaded', version: info.version || '' })
    })
  }, [])

  const toggleAlwaysOnTop = () => {
    const next = !isAlwaysOnTop
    setIsAlwaysOnTop(next)
    window.api.window.setAlwaysOnTop(next)
  }

  const fmt = (d: Date) =>
    d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <>
      <div
        className="drag flex items-center justify-between px-4 h-10 flex-shrink-0"
        style={{ background: 'var(--bg-titlebar, var(--bg-secondary))', borderBottom: '1px solid var(--border)' }}
      >
        {/* 앱 정보 */}
        <div className="flex items-center gap-2 no-drag" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #14b8a6)' }}>
            A
          </div>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            교행 보드
          </span>
        </div>

        {/* 시간 */}
        <div className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
          {fmt(time)}
        </div>

        {/* 윈도우 컨트롤 */}
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={toggleAlwaysOnTop}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-white/10"
            title={isAlwaysOnTop ? '항상 위 해제' : '항상 위에 표시'}
            style={{ color: isAlwaysOnTop ? 'var(--accent-blue)' : 'var(--text-muted)' }}
          >
            {isAlwaysOnTop ? <Pin size={12} /> : <PinOff size={12} />}
          </button>
          <button
            onClick={() => window.api.window.minimize()}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <Minus size={12} />
          </button>
          <button
            onClick={() => {
              window.api.window.maximize()
              setIsMaximized(m => !m)
            }}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
          >
            <Square size={11} />
          </button>
          <button
            onClick={() => window.api.window.close()}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:bg-red-500/80"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* 업데이트 배너 */}
      {updateBanner && (
        <div
          className="flex items-center justify-between px-4 py-1.5 text-xs no-drag"
          style={{
            background: updateBanner.type === 'downloaded'
              ? 'linear-gradient(90deg, rgba(34,197,94,0.15), rgba(59,130,246,0.15))'
              : 'linear-gradient(90deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span className="flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-primary)' }}>
            <Download size={11} className={updateBanner.type === 'downloaded' ? 'text-green-400' : 'text-blue-400'} />
            {updateBanner.type === 'available'
              ? `🔔 새 버전(v${updateBanner.version})을 다운로드 중입니다...`
              : `✅ v${updateBanner.version} 다운로드 완료 — 프로그램 종료 시 자동 설치됩니다.`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/settings?tab=version')}
              className="px-2 py-0.5 rounded text-[10px] font-medium transition-colors"
              style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}
            >
              업데이트 내용
            </button>
            {updateBanner.type === 'downloaded' && (
              <button
                onClick={() => navigate('/settings?tab=version')}
                className="px-2 py-0.5 rounded text-[10px] font-semibold transition-colors"
                style={{ background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.3)' }}
              >
                지금 설치
              </button>
            )}
            <button
              onClick={() => setUpdateBanner(null)}
              className="text-gray-400 hover:text-gray-200 transition-colors"
              title="닫기"
            >
              <X size={11} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
