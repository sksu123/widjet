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
import { useState, useEffect } from 'react'
import Settings from './pages/Settings/Settings'
import { UpdateModal } from './components/UpdateModal/UpdateModal'

export default function App() {
  const [updateModalOpen, setUpdateModalOpen] = useState(false)
  const [currentVersion, setCurrentVersion] = useState('2.0.59')
  const [newVersion, setNewVersion] = useState('')
  const [releaseNotes, setReleaseNotes] = useState('')

  useEffect(() => {
    // 현재 앱 버전 로드
    if ((window.api as any)?.updater?.getVersion) {
      ;(window.api as any).updater.getVersion().then((v: string) => {
        if (v) setCurrentVersion(v)
      }).catch(() => {})
    }

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

    // 업데이트 다운로드 완료 리스너 -> 모달 팝업 오픈
    if (window.api.updater) {
      window.api.updater.onUpdateDownloaded(async (info: any) => {
        const targetVer = info?.version || ''
        setNewVersion(targetVer)
        
        // 릴리스 노트 로드
        try {
          const res = await (window.api as any).updater.getReleaseNotes()
          if (res && res.success && res.data && res.data.length > 0) {
            // 새 버전에 해당하는 릴리스 노트가 있으면 사용, 없으면 가장 최신 릴리스 노트
            const found = res.data.find((r: any) => r.tagName?.includes(targetVer)) || res.data[0]
            if (found && found.body) {
              setReleaseNotes(found.body)
            }
          }
        } catch (e) {
          console.error('릴리스 노트 조회 실패:', e)
        }

        setUpdateModalOpen(true)
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
      <UpdateModal
        isOpen={updateModalOpen}
        currentVersion={currentVersion}
        newVersion={newVersion}
        releaseNotes={releaseNotes}
        onConfirm={() => {
          setUpdateModalOpen(false)
          if (window.api.updater?.quitAndInstall) {
            window.api.updater.quitAndInstall()
          }
        }}
        onClose={() => setUpdateModalOpen(false)}
      />
    </HashRouter>
  )
}
