import { useState, useEffect } from 'react'
import { Minus, Square, X, Pin, PinOff } from 'lucide-react'

declare global {
  interface Window {
    api: import('../../types/api').API
  }
}

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const toggleAlwaysOnTop = () => {
    const next = !isAlwaysOnTop
    setIsAlwaysOnTop(next)
    window.api.window.setAlwaysOnTop(next)
  }

  const fmt = (d: Date) =>
    d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div
      className="drag flex items-center justify-between px-4 h-10 flex-shrink-0"
      style={{ background: 'rgba(15,23,42,0.95)', borderBottom: '1px solid var(--border)' }}
    >
      {/* 앱 정보 */}
      <div className="flex items-center gap-2 no-drag" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #14b8a6)' }}>
          A
        </div>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          학교행정 AI 위젯
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
  )
}
