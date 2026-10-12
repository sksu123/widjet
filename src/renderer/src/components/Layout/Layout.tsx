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
        {!sidebarHidden && <Sidebar />}

        {/* 메뉴 숨기기/보이기 토글 */}
        <button
          onClick={toggleSidebar}
          title={sidebarHidden ? '메뉴 보이기' : '메뉴 숨기기'}
          className="flex-shrink-0 w-4 flex items-center justify-center transition-colors"
          style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          {sidebarHidden ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
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
