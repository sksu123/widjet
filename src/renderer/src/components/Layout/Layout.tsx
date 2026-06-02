import { Outlet } from 'react-router-dom'
import Sidebar from '../Sidebar/Sidebar'
import TitleBar from '../TitleBar/TitleBar'

export default function Layout() {
  return (
    <div className="flex flex-col h-screen gradient-bg overflow-hidden">
      {/* 커스텀 타이틀바 */}
      <TitleBar />

      <div className="flex flex-1 overflow-hidden">
        {/* 사이드바 */}
        <Sidebar />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-5">
          <div className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
