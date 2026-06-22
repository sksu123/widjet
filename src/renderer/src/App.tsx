import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import AIAssistant from './pages/AIAssistant/AIAssistant'
import Edufine from './pages/Edufine/Edufine'
import Calculator from './pages/Calculator/Calculator'
import CalendarPage from './pages/Calendar/CalendarPage'
import Documents from './pages/Documents/Documents'
import CorporateCard from './pages/CorporateCard/CorporateCard'
import Contacts from './pages/Contacts/Contacts'

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
        const theme = s.theme || 'theme-light'
        const font = s.font || 'noto'
        const layout = s.layout || 'standard'
        const fontSize = s.font_size || '3'
        
        document.documentElement.className = `${theme} font-${font} layout-${layout} text-size-${fontSize}`
      }
    })
  }, [])

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="ai" element={<AIAssistant />} />
          <Route path="edufine" element={<Edufine />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="documents" element={<Documents />} />
          <Route path="card" element={<CorporateCard />} />
          <Route path="contacts" element={<Contacts />} />

          <Route path="automation" element={<Automation />} />
          <Route path="favorites" element={<Favorites />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
