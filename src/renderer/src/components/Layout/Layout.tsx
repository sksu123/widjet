import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Sidebar from '../Sidebar/Sidebar'
import TitleBar from '../TitleBar/TitleBar'
import DailyRoutinePopup from '../DailyRoutinePopup/DailyRoutinePopup'

export default function Layout() {
  // 왼쪽 메뉴 숨김 상태 (재실행 후에도 유지)
  const [sidebarHidden, setSidebarHidden] = useState(() => localStorage.getItem('sidebarHidden') === '1')

  const toggleSidebar = () => {
    setSidebarHidden(prev => {
      const next = !prev
      localStorage.setItem('sidebarHidden', next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="flex flex-col h-screen gradient-bg overflow-hidden">
      {/* 커스텀 타이틀바 */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        {!sidebarHidden && <Sidebar onToggle={toggleSidebar} />}

        {/* 메뉴 숨기기/보이기 토글 버튼 (가독성 & 접근성 대폭 강화) */}
        <button
          onClick={toggleSidebar}
          title={sidebarHidden ? '왼쪽 메뉴 보이기 (클릭)' : '왼쪽 메뉴 숨기기 (클릭)'}
          className={`flex-shrink-0 flex items-center justify-center transition-all cursor-pointer select-none z-20 ${
            sidebarHidden
              ? 'w-7 hover:w-8 bg-blue-600/15 hover:bg-blue-600/25 border-r border-blue-500/40 shadow-sm'
              : 'w-4 hover:w-5 group border-r'
          }`}
          style={{
            background: sidebarHidden ? undefined : 'var(--bg-secondary)',
            borderColor: sidebarHidden ? undefined : 'var(--border)'
          }}
        >
          {sidebarHidden ? (
            <div className="flex flex-col items-center gap-2 py-4 px-1 rounded-r-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition-all">
              <ChevronRight size={16} className="animate-pulse" />
              <span
                className="text-[11px] font-bold tracking-widest"
                style={{ writingMode: 'vertical-rl' }}
              >
                메뉴 열기
              </span>
            </div>
          ) : (
            <div
              className="py-3 px-0.5 rounded-r-md transition-all shadow-sm flex items-center justify-center bg-slate-400/40 hover:bg-blue-600 text-slate-700 dark:text-slate-200 hover:text-white"
              title="메뉴 숨기기"
            >
              <ChevronLeft size={13} />
            </div>
          )}
        </button>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 lg:p-4 xl:p-5">
          {/* 메뉴를 숨기면 오른쪽 내용을 확대하여 표시 */}
          <div className="page-enter" style={sidebarHidden ? { zoom: 1.15 } : undefined}>
            <Outlet />
          </div>
        </main>
      </div>

      <DailyRoutinePopup />
    </div>
  )
}
