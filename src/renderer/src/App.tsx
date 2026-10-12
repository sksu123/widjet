import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import AIAssistant from './pages/AIAssistant/AIAssistant'
import AiProofread from './pages/AiProofread/AiProofread'
import RuleAi from './pages/RuleAi/RuleAi'
import Edufine from './pages/Edufine/Edufine'
import Calculator from './pages/Calculator/Calculator'
import CalendarPage from './pages/Calendar/CalendarPage'
import CorporateCard from './pages/CorporateCard/CorporateCard'
import Contacts from './pages/Contacts/Contacts'
import PdfWorkshop from './pages/PdfWorkshop/PdfWorkshop'

import Automation from './pages/Automation/Automation'
import Favorites from './pages/Favorites/Favorites'
import { useEffect } from 'react'
import Settings from './pages/Settings/Settings'

export default function App() {
  useEffect(() => {
    // 초기 설정 로드 및 적용
    window.api.db.getSettings().then((res) => {
      if (res.success) {
        const s = res.data as Record<string, string>
        const theme = s.theme || 'theme-glass'
        const font = s.font || 'noto'
        const layout = s.layout || 'standard'
        const fontSize = s.font_size || '3'
        
        const isDark = ['theme-dark', 'theme-ocean', 'theme-forest', 'theme-monochrome', 'theme-neon', 'theme-navy', 'theme-grape', 'theme-cyber', 'theme-oled', 'theme-linear'].includes(theme);
        document.documentElement.className = `${theme} ${isDark ? 'dark' : ''} layout-${layout} text-size-${fontSize}`
        
        // 스니펫 단축키 글로벌 등록
        if (s.clipboard_snippets && (window.api as any).system?.registerSnippets) {
          try {
            const arr = JSON.parse(s.clipboard_snippets);
            (window.api as any).system.registerSnippets(arr);
          } catch(e) {}
        }
      }
    })

    // IPC Notification Listener (native notification 사용으로 렌더러 측 처리 불필요)
    if (window.api.updater) {
      window.api.updater.onUpdateDownloaded((info) => {
        if (confirm(`교행 보드 새로운 버전(v${info.version})이 다운로드되었습니다.\n확인을 클릭하면 프로그램을 자동으로 완전 종료시키고 업데이트된 프로그램을 다시 설치합니다.`)) {
          window.api.updater.quitAndInstall()
        }
      })
    }
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="aiproofread" element={<AiProofread />} />
          <Route path="rule-ai" element={<RuleAi />} />
          <Route path="edufine" element={<Edufine />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="calendar" element={<CalendarPage />} />
                    <Route path="card" element={<CorporateCard />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="pdf-workshop" element={<PdfWorkshop />} />

          <Route path="automation" element={<Automation />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
