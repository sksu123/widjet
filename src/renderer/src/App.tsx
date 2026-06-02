import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import AIAssistant from './pages/AIAssistant/AIAssistant'
import Edufine from './pages/Edufine/Edufine'
import Calculator from './pages/Calculator/Calculator'
import CalendarPage from './pages/Calendar/CalendarPage'
import Documents from './pages/Documents/Documents'
import CorporateCard from './pages/CorporateCard/CorporateCard'
import LostItems from './pages/LostItems/LostItems'
import Automation from './pages/Automation/Automation'
import VoiceAssistant from './pages/VoiceAssistant/VoiceAssistant'
import Settings from './pages/Settings/Settings'

export default function App() {
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
          <Route path="lost" element={<LostItems />} />
          <Route path="automation" element={<Automation />} />
          <Route path="voice" element={<VoiceAssistant />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
