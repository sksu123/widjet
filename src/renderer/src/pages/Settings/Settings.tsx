import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Settings as SettingsIcon, Save, User, Database, RefreshCw, Search, Building2, Check, X, Cloud, MapPin, Edit2, Download, Smartphone, Copy, Wifi, ShieldCheck, ExternalLink, QrCode, Globe, Bell, CheckCircle2, FileText, Sparkles, ExternalLink as ExtLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ReleaseNoteItem } from '../../types/api'
import { RegionSelector } from '../../components/RegionSelector'

export default function Settings() {
  const [searchParams] = useSearchParams()
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [user, setUser] = useState({ name: '', school_name: '', department: '', email: '', avatar_color: '#3b82f6' })
  const [saved, setSaved] = useState(false)
  const [backupDone, setBackupDone] = useState(false)
  const [restoreMsg, setRestoreMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'general' | 'school' | 'mobile' | 'api' | 'weather' | 'user' | 'data' | 'version'>('general')
  const [autoStart, setAutoStart] = useState(false)
  const [mobileStatus, setMobileStatus] = useState<any>(null)
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [selectedIp, setSelectedIp] = useState('')
  const [cloudStatus, setCloudStatus] = useState<any>(null)
  const [cloudSyncing, setCloudSyncing] = useState(false)
  const [copiedCloudUrl, setCopiedCloudUrl] = useState(false)
  const [copiedCloudKey, setCopiedCloudKey] = useState(false)
  const [editingHosting, setEditingHosting] = useState(false)
  const [hostingUrlInput, setHostingUrlInput] = useState('')
  // 업데이트 상태: 'idle' | 'checking' | 'latest' | 'available' | 'error'
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'available' | 'error' | 'downloaded'>('idle')
  const [updateInfo, setUpdateInfo] = useState<string>('')
  const [appVersion, setAppVersion] = useState('v2.0.58')
  // 릴리스 노트 상태
  const [releases, setReleases] = useState<ReleaseNoteItem[]>([])
  const [selectedReleaseIndex, setSelectedReleaseIndex] = useState(0)
  const [loadingReleases, setLoadingReleases] = useState(false)
  const [showReleaseNotes, setShowReleaseNotes] = useState(false)
  const [copiedReleaseNote, setCopiedReleaseNote] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // 날씨 지역 변경 상태
  const [showRegionSelector, setShowRegionSelector] = useState(false)

    async function loadReleaseNotes() {
    setLoadingReleases(true)
    try {
      if ((window.api as any)?.updater?.getReleaseNotes) {
        const res = await (window.api as any).updater.getReleaseNotes()
        if (res && res.success && res.data && res.data.length > 0) {
          setReleases(res.data)
          setShowReleaseNotes(true)
        }
      }
    } catch (e) {
      console.error('Failed to load release notes:', e)
    } finally {
      setLoadingReleases(false)
    }
  }

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['general', 'school', 'mobile', 'api', 'weather', 'user', 'data', 'version'].includes(tab)) {
      setActiveTab(tab as any)
      if (tab === 'version') {
        loadReleaseNotes()
      }
    }
  }, [searchParams])

  useEffect(() => {
    if (activeTab === 'version' && releases.length === 0) {
      loadReleaseNotes()
    }
  }, [activeTab])

useEffect(() => { 
    loadData()
    loadMobileStatus()
    loadCloudStatus()
    if ((window.api as any).system && (window.api as any).system.getVersion) {
      (window.api as any).system.getVersion().then((res: any) => {
        if(res && res.version) setAppVersion('v' + res.version)
      })
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'mobile') {
      loadMobileStatus()
      loadCloudStatus()
    }
  }, [activeTab])

  
  async function loadCloudStatus() {
    if (window.api && (window.api as any).cloud?.getStatus) {
      const res = await (window.api as any).cloud.getStatus()
      if (res && res.success) {
        setCloudStatus(res.data)
        if (res.data.hostingUrl) setHostingUrlInput(res.data.hostingUrl)
      }
    }
  }

  async function handleEnableCloud() {
    setCloudSyncing(true)
    try {
      if (window.api && (window.api as any).cloud?.enable) {
        const res = await (window.api as any).cloud.enable()
        if (res && res.success) {
          setCloudStatus(res.data)
        }
      }
    } finally {
      setCloudSyncing(false)
    }
  }

  async function handleSyncCloudNow() {
    setCloudSyncing(true)
    try {
      if (window.api && (window.api as any).cloud?.syncNow) {
        const res = await (window.api as any).cloud.syncNow()
        if (res && res.success) {
          setCloudStatus(res.data)
        } else {
          alert('동기화 실패: ' + (res?.error || '알 수 없는 오류'))
        }
      }
    } finally {
      setCloudSyncing(false)
    }
  }

  async function handleDisableCloud() {
    if (!confirm('클라우드 연동을 해제하시겠습니까?\n클라우드에 저장된 모든 데이터가 삭제되며 스마트폰 접속이 차단됩니다.')) return
    if (window.api && (window.api as any).cloud?.disable) {
      const res = await (window.api as any).cloud.disable()
      if (res && res.success) {
        setCloudStatus(res.data)
      }
    }
  }

  async function handleRegenerateCloudKey() {
    if (!confirm('새 클라우드 보안 키를 발급하시겠습니까?\n기존 스마트폰의 연결이 해제되므로 새 QR코드를 다시 스캔해야 합니다.')) return
    setCloudSyncing(true)
    try {
      if (window.api && (window.api as any).cloud?.regenerateKey) {
        const res = await (window.api as any).cloud.regenerateKey()
        if (res && res.success) {
          setCloudStatus(res.data)
          alert('새 보안 키가 발급되었습니다. 스마트폰으로 새 QR 코드를 스캔해주세요.')
        }
      }
    } finally {
      setCloudSyncing(false)
    }
  }

  function handleCopyCloudUrl() {
    if (!cloudStatus?.mobileAccessUrl) return
    const url = cloudStatus.mobileAccessUrl
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
    } else if (window.api?.system?.writeClipboard) {
      window.api.system.writeClipboard(url)
    }
    setCopiedCloudUrl(true)
    setTimeout(() => setCopiedCloudUrl(false), 2000)
  }

  function handleCopyCloudKey() {
    if (!cloudStatus?.key) return
    const key = cloudStatus.key
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(key)
    } else if (window.api?.system?.writeClipboard) {
      window.api.system.writeClipboard(key)
    }
    setCopiedCloudKey(true)
    setTimeout(() => setCopiedCloudKey(false), 2000)
  }

  async function handleSaveHostingUrl() {
    if (!hostingUrlInput.trim()) return
    if (window.api && (window.api as any).cloud?.setHostingUrl) {
      const res = await (window.api as any).cloud.setHostingUrl(hostingUrlInput.trim())
      if (res && res.success) {
        setCloudStatus(res.data)
        setEditingHosting(false)
      }
    }
  }

  async function loadMobileStatus() {
    if (window.api && (window.api as any).mobile?.getStatus) {
      const res = await (window.api as any).mobile.getStatus()
      if (res && res.success) {
        setMobileStatus(res.data)
        if (res.data.ip) {
          setSelectedIp(res.data.ip)
        }
      }
    }
  }

  async function handleRegenerateToken() {
    if (!confirm('새 보안 토큰을 발급하시겠습니까?\n기존에 스마트폰에 등록된 연결은 해제되며 새 QR코드를 다시 스캔해야 합니다.')) return
    if (window.api && (window.api as any).mobile?.regenerateToken) {
      const res = await (window.api as any).mobile.regenerateToken()
      if (res && res.success) {
        setMobileStatus(res.data)
        alert('새 보안 토큰이 발급되었습니다. 스마트폰으로 새 QR 코드를 스캔해주세요.')
      }
    }
  }

  function handleCopyMobileUrl() {
    if (!mobileStatus) return
    const url = getAccessUrl()
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
    } else if (window.api?.system?.writeClipboard) {
      window.api.system.writeClipboard(url)
    }
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  function getAccessUrl() {
    if (!mobileStatus) return ''
    const ip = selectedIp || mobileStatus.ip || '127.0.0.1'
    return `http://${ip}:${mobileStatus.port}/?token=${mobileStatus.token}`
  }

  async function loadData() {
    const [settingsRes, userRes, autoStartRes] = await Promise.all([
      window.api.db.getSettings(),
      window.api.db.getUser(),
      window.api.system?.getLoginItem ? window.api.system.getLoginItem() : Promise.resolve({ success: false, openAtLogin: false })
    ])
    if (settingsRes.success) {
      const s = settingsRes.data as Record<string, string>
      setSettings(s)
    }
    if (userRes.success) {
      const u = userRes.data as typeof user
      setUser({ name: u.name, school_name: u.school_name, department: u.department, email: u.email || '', avatar_color: u.avatar_color || '#3b82f6' })
    }
    if (autoStartRes && autoStartRes.success) {
      setAutoStart(autoStartRes.openAtLogin as boolean)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  async function saveAll() {
    // 설정 저장
    for (const [key, value] of Object.entries(settings)) {
      await window.api.db.updateSetting(key, value)
    }
    
    // 자동 실행 저장
    if (window.api.system?.setLoginItem) {
      await window.api.system.setLoginItem(autoStart)
    }
    
    // 사용자 저장 (avatar_color 포함하여 기존 값 보존)
    await window.api.db.updateUser(user as Record<string, unknown>)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function backup() {
    const res = await window.api.file.backupDb()
    if (res.success) {
      setBackupDone(true)
      setTimeout(() => setBackupDone(false), 3000)
    } else if (res.error !== '취소됨') {
      alert('백업 실패: ' + res.error)
    }
  }

  async function restore() {
    const ok = confirm('⚠️ 데이터 복원 시 현재 데이터가 백업 파일로 교체됩니다.\n계속하시겠습니까?')
    if (!ok) return
    const res = await window.api.file.restoreDb()
    if (res.success) {
      setRestoreMsg('✅ 복원 완료! 앱을 재시작하면 복원된 데이터가 적용됩니다.')
    } else if (res.error !== '취소됨') {
      setRestoreMsg('❌ 복원 실패: ' + (res.error || '알 수 없는 오류'))
    }
  }

  async function handleSearchSchool() {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    setSearchResults([])
    const res = await window.api.calendar.searchSchool(searchQuery)
    if (res.success) setSearchResults(res.data as any[])
    setIsSearching(false)
  }

  async function selectSchool(s: any) {
    updateSetting('neis_atpt_code', s.officeCode)
    updateSetting('neis_schul_code', s.schoolCode)
    updateSetting('neis_school_name', s.schoolName)
    await window.api.db.updateSetting('neis_atpt_code', s.officeCode)
    await window.api.db.updateSetting('neis_schul_code', s.schoolCode)
    await window.api.db.updateSetting('neis_school_name', s.schoolName)
    setSearchResults([])
    setSearchQuery('')
  }

  const selectWeatherRegion = (city: string, zoneCode: string) => {
    updateSetting('weather_city', city)
    updateSetting('weather_zone_code', zoneCode)
    window.api.db.updateSetting('weather_city', city)
    window.api.db.updateSetting('weather_zone_code', zoneCode)
    setShowRegionSelector(false)
  }

  const TABS = [
    { key: 'general', label: '일반', icon: SettingsIcon },
    { key: 'school', label: '학교 설정', icon: Building2 },
    { key: 'mobile', label: '모바일 연동 (PWA)', icon: Smartphone },
    { key: 'api', label: 'API 설정', icon: Cloud },
    { key: 'weather', label: '날씨 설정', icon: Cloud },
    { key: 'user', label: '사용자', icon: User },
    { key: 'data', label: '데이터', icon: Database },
    { key: 'version', label: '버전 업데이트', icon: RefreshCw },
  ] as const

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
            <SettingsIcon size={16} className="text-white" />
          </div>
          <h1 className="page-title">환경설정</h1>
        </div>
        <button onClick={saveAll} className="btn-primary text-xs">
          <Save size={13} /> {saved ? '저장됨 ✓' : '저장'}
        </button>
      </div>

      {/* 탭 */}
      <div className="flex gap-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all`}
            style={activeTab === key
              ? { background: 'rgba(100,116,139,0.2)', color: 'var(--text-primary)', border: '1px solid rgba(100,116,139,0.4)' }
              : { color: 'var(--text-muted)' }
            }>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="card space-y-5">

          {/* ===== 테마 갤러리 ===== */}
          <div>
            <label className="label">테마 디자인</label>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>20가지의 다채로운 테마 중 마음에 드는 디자인을 선택하세요.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'theme-light', label: '클래식 라이트', bg: '#f8fafc', accent: '#2563eb' },
                { value: 'theme-dark', label: '클래식 다크', bg: '#0f172a', accent: '#3b82f6' },
                { value: 'theme-ocean', label: '오션 딥 블루', bg: '#082f49', accent: '#38bdf8' },
                { value: 'theme-forest', label: '포레스트 그린', bg: '#064e3b', accent: '#34d399' },
                { value: 'theme-sunset', label: '선셋 글로우', bg: '#fff7ed', accent: '#ea580c' },
                { value: 'theme-lavender', label: '라벤더 미스트', bg: '#faf5ff', accent: '#9333ea' },
                { value: 'theme-monochrome', label: '모노크롬 시크', bg: '#18181b', accent: '#fafafa' },
                { value: 'theme-retro', label: '레트로 바이브', bg: '#fef3c7', accent: '#b45309' },
                { value: 'theme-neon', label: '네온 시티', bg: '#020617', accent: '#d946ef' },
                { value: 'theme-mint', label: '프레시 민트', bg: '#f0fdfa', accent: '#0d9488' },
                { value: 'theme-rose', label: '로즈 골드', bg: '#fff1f2', accent: '#e11d48' },
                { value: 'theme-sky', label: '스카이 브리즈', bg: '#f0f9ff', accent: '#0284c7' },
                { value: 'theme-peach', label: '피치 코랄', bg: '#fef2f2', accent: '#ef4444' },
                { value: 'theme-slate', label: '슬레이트 그레이', bg: '#f8fafc', accent: '#334155' },
                { value: 'theme-coffee', label: '모닝 커피', bg: '#f5f5f4', accent: '#ea580c' },
                { value: 'theme-cherry', label: '체리 블라썸', bg: '#fdf2f8', accent: '#db2777' },
                { value: 'theme-navy', label: '미드나잇 네이비', bg: '#020617', accent: '#3b82f6' },
                { value: 'theme-sand', label: '샌드 듄', bg: '#fbf8f1', accent: '#b45309' },
                { value: 'theme-grape', label: '와인 베리', bg: '#2e0618', accent: '#e879f9' },
                { value: 'theme-cyber', label: '사이버펑크', bg: '#050505', accent: '#00ff41' },
              ].map(({ value, label, bg, accent }) => (
                <button key={value} onClick={async () => {
                  updateSetting('theme', value)
                  const font = settings.font || 'noto'
                  const layout = settings.layout || 'standard'
                  const fontSize = settings.font_size || '3'
                  document.documentElement.className = `${value} font-${font} layout-${layout} text-size-${fontSize}`
                  await window.api.db.updateSetting('theme', value)
                }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all border-2"
                  style={settings.theme === value || (!settings.theme && value === 'theme-light')
                    ? { background: 'var(--bg-card)', borderColor: accent, boxShadow: `0 0 0 1px ${accent}` }
                    : { background: 'var(--bg-card)', borderColor: 'var(--border)' }
                  }>
                  <div className="w-full h-12 rounded-lg flex shadow-inner overflow-hidden border" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                    <div className="w-1/3 h-full" style={{ background: accent }}></div>
                    <div className="w-2/3 h-full" style={{ background: bg }}></div>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: settings.theme === value || (!settings.theme && value === 'theme-light') ? accent : 'var(--text-secondary)' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== 글자 크기 ===== */}
          <div>
            <label className="label mt-4">글자 크기 조절</label>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>앱 전체의 글자 크기를 1~5단계로 조절합니다. (기본 3단계)</p>
            <div className="flex gap-2">
              {[
                { level: '1', label: '가장 작게' },
                { level: '2', label: '작게' },
                { level: '3', label: '보통' },
                { level: '4', label: '크게' },
                { level: '5', label: '가장 크게' },
              ].map(({ level, label }) => (
                <button key={level} onClick={async () => {
                  updateSetting('font_size', level)
                  const theme = settings.theme || 'theme-light'
                  const font = settings.font || 'noto'
                  const layout = settings.layout || 'standard'
                  document.documentElement.className = `${theme} font-${font} layout-${layout} text-size-${level}`
                  await window.api.db.updateSetting('font_size', level)
                }}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border"
                  style={settings.font_size === level || (!settings.font_size && level === '3')
                    ? { background: 'var(--accent-blue)', color: 'white', borderColor: 'var(--accent-blue)' }
                    : { background: 'var(--bg-card)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
                  }>
                  <span style={{ fontSize: `${10 + parseInt(level)*2}px` }}>A</span><br/>
                  <span className="mt-1 inline-block">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== 레이아웃 ===== */}
          <div>
            <label className="label">화면 레이아웃</label>
            <select className="input" value={settings.layout || 'standard'} onChange={async e => {
              updateSetting('layout', e.target.value)
              document.documentElement.classList.remove('layout-standard', 'layout-compact')
              document.documentElement.classList.add(`layout-${e.target.value}`)
              await window.api.db.updateSetting('layout', e.target.value)
            }}>
              <option value="standard">기본 (넓게 보기)</option>
              <option value="compact">컴팩트 (좁게 많이 보기)</option>
            </select>
          </div>

          <div>
            <label className="label">항상 위에 표시 (기본값)</label>
            <div className="flex items-center gap-2">
              <input type="checkbox"
                checked={settings.always_on_top === 'true'}
                onChange={e => updateSetting('always_on_top', e.target.checked ? 'true' : 'false')}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>앱 실행 시 항상 위에 표시</span>
            </div>
          </div>

          <div>
            <label className="label">시작 프로그램 등록 (PC 전용)</label>
            <div className="flex items-center gap-2">
              <input type="checkbox"
                checked={autoStart}
                onChange={e => setAutoStart(e.target.checked)}
                className="w-4 h-4 accent-blue-500" />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>PC 부팅 시 위젯 자동 실행 (백그라운드)</span>
            </div>
          </div>
          
        </div>
      )}

      {activeTab === 'school' && (
        <div className="card space-y-4">
          <div>
            <h3 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>🏫 학교 설정</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>NEIS API를 통한 급식 및 학사 일정 연동</p>
          </div>

          {settings.neis_schul_code && settings.neis_school_name ? (
            <div className="p-3 rounded-lg flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>현재 연동된 학교</p>
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-mint" />
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{settings.neis_school_name}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  updateSetting('neis_schul_code', '')
                  updateSetting('neis_atpt_code', '')
                  updateSetting('neis_school_name', '')
                }} className="btn-ghost text-xs text-blue-400 hover:text-blue-300" style={{ background: 'rgba(59,130,246,0.1)' }}>
                  <Edit2 size={13} /> 변경
                </button>
                <button onClick={() => {
                  updateSetting('neis_schul_code', '')
                  updateSetting('neis_atpt_code', '')
                  updateSetting('neis_school_name', '')
                }} className="btn-ghost text-xs text-red-400 hover:text-red-300" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <X size={13} /> 해제
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="label">학교 검색</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                  <input
                    className="input pl-8 w-full"
                    placeholder="학교 이름을 입력하세요 (예: 담양남초)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearchSchool()}
                  />
                </div>
                <button onClick={handleSearchSchool} className="btn-mint whitespace-nowrap" disabled={isSearching}>
                  {isSearching ? '검색 중...' : '검색'}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-3 border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border-color)' }}>
                  {searchResults.map((s, i) => (
                    <div key={i}
                      onClick={() => {
                        const sName = s.schoolName || s.SCHUL_NM;
                        const oCode = s.officeCode || s.ATPT_OFCDC_SC_CODE;
                        const sCode = s.schoolCode || s.SD_SCHUL_CODE;
                        selectSchool({ schoolName: sName, officeCode: oCode, schoolCode: sCode })
                      }}
                      className="p-3 border-b last:border-b-0 cursor-pointer transition-colors flex items-center justify-between group"
                      style={{ borderColor: 'var(--border-color)' }}>
                      <div>
                        <div className="font-medium text-sm group-hover:text-mint transition-colors" style={{ color: 'var(--text-primary)' }}>{s.schoolName || s.SCHUL_NM}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.officeName || s.ATPT_OFCDC_SC_NM}</div>
                      </div>
                      <Check size={16} className="text-mint opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

            {activeTab === 'mobile' && (
        <div className="space-y-6">

          {/* ===== 1. [강력 추천] 외부 네트워크 클라우드 연동 (Supabase + PWA) ===== */}
          <div className="card space-y-5 border-2 border-blue-500/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Globe size={18} className="text-blue-400" />
                  외부 네트워크 모바일 연동 (클라우드 + PWA)
                  <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded-full font-bold">
                    LTE / 집 Wi-Fi 어디서나 가능
                  </span>
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  학교 PC와 스마트폰이 다른 네트워크여도 오늘의 일정/할일과 D-DAY를 실시간으로 확인하고 알림을 받습니다.
                </p>
              </div>

              {cloudStatus?.enabled ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    클라우드 연동 중
                  </span>
                  <button
                    onClick={handleSyncCloudNow}
                    disabled={cloudSyncing}
                    className="btn-ghost text-xs px-2.5 py-1 text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 border border-blue-500/20"
                  >
                    <RefreshCw size={12} className={cloudSyncing ? 'animate-spin' : ''} />
                    지금 동기화
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEnableCloud}
                  disabled={cloudSyncing}
                  className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  <Globe size={14} />
                  {cloudSyncing ? '연동 시작 중...' : '클라우드 연동 활성화'}
                </button>
              )}
            </div>

            {cloudStatus?.enabled ? (
              <>
                {/* QR 코드 & 모바일 접속 안내 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-xl border bg-slate-900/40" style={{ borderColor: 'var(--border)' }}>
                  {/* 좌측: QR 코드 */}
                  <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-white/5" style={{ borderColor: 'var(--border)' }}>
                    {cloudStatus?.qrCode ? (
                      <div className="bg-white p-3 rounded-2xl shadow-lg border border-slate-200">
                        <img src={cloudStatus.qrCode} alt="클라우드 접속 QR 코드" className="w-52 h-52 object-contain" />
                      </div>
                    ) : (
                      <div className="w-52 h-52 flex flex-col items-center justify-center text-xs text-muted border border-dashed rounded-xl">
                        <QrCode size={36} className="mb-2 opacity-40" />
                        <span>QR 코드 로딩 중...</span>
                      </div>
                    )}
                    <p className="text-[11px] text-center mt-3 text-slate-300 font-medium">
                      📷 스마트폰 기본 카메라로 비추면 바로 연결됩니다
                    </p>
                  </div>

                  {/* 우측: 링크 복사 & 상태 정보 */}
                  <div className="flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* 접속 URL */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-semibold text-slate-400">모바일 접속 URL</label>
                          <button
                            onClick={() => setEditingHosting(!editingHosting)}
                            className="text-[10px] text-blue-400 hover:text-blue-300"
                          >
                            {editingHosting ? '닫기' : '호스팅 주소 변경'}
                          </button>
                        </div>
                        {editingHosting ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={hostingUrlInput}
                              onChange={e => setHostingUrlInput(e.target.value)}
                              placeholder="https://sksu123.github.io/widjet/"
                              className="input text-xs flex-1 font-mono"
                            />
                            <button onClick={handleSaveHostingUrl} className="btn-primary text-xs px-3">
                              저장
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={cloudStatus.mobileAccessUrl || ''}
                              className="input text-xs font-mono select-all flex-1 text-slate-300"
                            />
                            <button
                              onClick={handleCopyCloudUrl}
                              className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-semibold border border-blue-500/20"
                            >
                              <Copy size={13} />
                              {copiedCloudUrl ? '복사됨 ✓' : '복사'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 동기화 상태 카드 */}
                      <div className="p-3 rounded-lg border text-xs space-y-1.5 bg-slate-950/60" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">마지막 동기화:</span>
                          <span className="font-mono text-slate-200">
                            {cloudStatus.lastSyncTime ? new Date(cloudStatus.lastSyncTime).toLocaleString('ko-KR') : '동기화 이력 없음'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 font-medium">동기화 상태:</span>
                          <span className={cloudStatus.lastSyncStatus === 'success' ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                            {cloudStatus.lastSyncStatus === 'success' ? '정상 최신화됨 ✓' : cloudStatus.lastSyncStatus === 'syncing' ? '전송 중...' : '대기 중'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                          <span className="text-slate-400 font-medium">암호화 보안 키:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{cloudStatus.key}</span>
                            <button
                              onClick={handleCopyCloudKey}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-400 transition-colors border border-slate-700"
                              title="보안 키 복사"
                            >
                              {copiedCloudKey ? '복사됨 ✓' : '키 복사'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* 보안 및 키 재발급 */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        <button
                          onClick={handleRegenerateCloudKey}
                          className="text-amber-400 hover:text-amber-300 font-medium underline underline-offset-2"
                        >
                          새 보안 키 재발급
                        </button>
                        <button
                          onClick={handleDisableCloud}
                          className="text-red-400 hover:text-red-300 font-medium underline underline-offset-2"
                        >
                          클라우드 연동 해제
                        </button>
                      </div>
                    </div>

                    {/* PC 브라우저 미리보기 */}
                    <button
                      onClick={() => {
                        if (cloudStatus?.mobileAccessUrl) window.open(cloudStatus.mobileAccessUrl, '_blank')
                      }}
                      className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all text-slate-300 hover:text-white border bg-white/5"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <ExternalLink size={13} />
                      PC 브라우저에서 모바일 화면 열기
                    </button>
                  </div>
                </div>

                {/* 사용 방법 & 푸시 알림 가이드 */}
                <div className="p-4 rounded-xl text-xs space-y-2.5 leading-relaxed border bg-blue-500/5 border-blue-500/20">
                  <h4 className="font-bold text-sm text-blue-400 flex items-center gap-2">
                    <Bell size={15} /> 모바일 홈 화면 추가 및 알림 활성화 3단계
                  </h4>
                  <div className="space-y-1.5 text-slate-300 text-xs">
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">1</span>
                      <span>스마트폰 카메라로 위 QR 코드를 스캔하여 모바일 페이지로 접속합니다.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">2</span>
                      <span>
                        브라우저 메뉴에서 <strong>[홈 화면에 추가]</strong>(아이폰 사파리: 하단 공유버튼 ➔ 홈 화면에 추가 / 갤럭시 크롬: 우측 상단 더보기 ➔ 앱 설치)를 눌러 앱처럼 설치합니다.
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5 flex-shrink-0">3</span>
                      <span>
                        설치된 앱을 실행한 후 우측 상단의 <strong>🔔 종 아이콘</strong>을 누르면 아침 8시 및 D-DAY 푸시 알림이 활성화됩니다!
                      </span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 rounded-xl border border-dashed text-center space-y-3 bg-slate-900/20" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm font-medium text-slate-300">
                  클라우드 연동을 활성화하면 전용 보안 키와 QR 코드가 생성됩니다.
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  일정/할일과 D-DAY 정보만 암호화 스냅샷으로 안전하게 전송되며, 연락처나 카드 내역 등 민감한 개인정보는 일체 올라가지 않습니다.
                </p>
              </div>
            )}
          </div>

          {/* ===== 2. 동일 Wi-Fi 내부망 직접 연동 (LAN 모드 - 보조 기능) ===== */}
          <div className="card space-y-4 opacity-80 hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-xs flex items-center gap-1.5 text-slate-300">
                  <Wifi size={14} className="text-slate-400" />
                  동일 Wi-Fi 내부망 직접 연동 (PC 내장 서버)
                </h4>
                <p className="text-[11px] text-slate-500">
                  학교 PC와 스마트폰이 같은 Wi-Fi에 연결되어 있을 때 직접 통신하는 기존 방식입니다.
                </p>
              </div>
              {mobileStatus?.running && (
                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                  LAN 서버 가동 중 (포트 {mobileStatus.port})
                </span>
              )}
            </div>

            <div className="p-3 rounded-lg border text-xs space-y-2 bg-slate-900/30" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono text-[11px]">로컬 접속 주소: {getAccessUrl()}</span>
                <button
                  onClick={handleCopyMobileUrl}
                  className="btn-ghost text-xs px-2 py-1 text-slate-300 hover:text-white"
                >
                  <Copy size={12} /> {copiedUrl ? '복사됨 ✓' : '복사'}
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'api' && (
        <div className="card space-y-4">
          <div className="p-4 rounded-xl text-xs leading-relaxed" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#60a5fa' }}>
              <Cloud size={16} /> Gemini API 키 발급 및 설정 가이드
            </h3>
            <div className="space-y-3" style={{ color: 'var(--text-secondary)' }}>
              <p className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                <span>
                  <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-2">Google AI Studio</a>에 접속하여 Google 계정으로 로그인합니다.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                <span>
                  좌측 하단이나 메뉴에서 <strong style={{ color: 'var(--text-primary)' }}>열쇠 모양 아이콘(Get API key)</strong>을 찾아 클릭합니다.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                <span>
                  <strong style={{ color: 'var(--text-primary)' }}>Create API key</strong> 버튼을 누르고, 새로운 프로젝트를 선택하여 키를 생성합니다.
                </span>
              </p>
              <p className="flex items-start gap-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5">4</span>
                <span>
                  생성된 <code>AIza...</code> 로 시작하는 긴 문자열을 복사하여 아래 입력창에 붙여넣기 후 우측 상단의 <strong style={{ color: 'var(--text-primary)' }}>저장</strong> 버튼을 눌러주세요.
                </span>
              </p>
            </div>
          </div>
          <div>
            <label className="label">Gemini API 키 (AI 기능 필수)</label>
            <input className="input font-mono text-xs w-full" type="password"
              value={settings.gemini_api_key || ''}
              onChange={e => updateSetting('gemini_api_key', e.target.value)}
              placeholder="AIzaSyB..." />
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
              * API 키는 로컬 PC에만 안전하게 암호화되어 저장되며 외부로 전송되지 않습니다.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'user' && (
        <div className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">이름</label>
              <input className="input" value={user.name} onChange={e => setUser({ ...user, name: e.target.value })} placeholder="홍길동" />
            </div>
            <div>
              <label className="label">학교명</label>
              <input className="input" value={user.school_name} onChange={e => setUser({ ...user, school_name: e.target.value })} placeholder="○○초등학교" />
            </div>
            <div>
              <label className="label">부서</label>
              <input className="input" value={user.department} onChange={e => setUser({ ...user, department: e.target.value })} placeholder="행정실" />
            </div>
            <div>
              <label className="label">이메일</label>
              <input className="input" type="email" value={user.email} onChange={e => setUser({ ...user, email: e.target.value })} placeholder="example@edu.go.kr" />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="card space-y-5">
          {/* 백업 */}
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>💾 데이터 백업</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              저장 위치(PC, USB, 구글 드라이브 등)를 선택하여 모든 데이터를 백업합니다.
            </p>
            <button onClick={backup} className="btn-primary text-sm">
              <Database size={14} /> {backupDone ? '백업 완료 ✓' : '백업 파일 저장...'}
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>🔄 데이터 복원</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              이전에 저장한 백업 파일(.db)을 선택하여 데이터를 복원합니다.<br />
              <span style={{ color: 'var(--accent-red)', fontWeight: 600 }}>⚠️ 현재 데이터가 백업 파일 내용으로 교체됩니다.</span>
            </p>
            <button onClick={restore} className="btn-danger text-sm">
              <RefreshCw size={14} /> 백업 파일에서 복원...
            </button>
            {restoreMsg && (
              <p className="text-xs mt-3 p-2 rounded-lg" style={{
                color: restoreMsg.startsWith('✅') ? 'var(--accent-green)' : 'var(--accent-red)',
                background: restoreMsg.startsWith('✅') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${restoreMsg.startsWith('✅') ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>
                {restoreMsg}
              </p>
            )}
          </div>

        </div>
      )}

      {/* 날씨 설정 탭 */}
      {activeTab === 'weather' && (
        <div className="card space-y-5">
          <div>
            <h3 className="font-semibold text-sm mb-1 text-white">☁️ 날씨 설정</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>앱에서 GPS 등 위치 정보를 수집하지 않으며, 아래에서 설정한 지역 기준으로 날씨를 표시합니다.</p>
          </div>

          {/* 지역 선택 */}
          <div className="relative">
            <label className="label">지역 선택</label>
            {!showRegionSelector ? (
              <div
                className="flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors"
                style={{ background: 'rgba(20,184,166,0.05)', border: '1px solid rgba(20,184,166,0.2)' }}
                onClick={() => setShowRegionSelector(true)}
              >
                <MapPin size={16} className="text-mint" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {settings.weather_city || '지역을 선택해주세요'}
                </span>
                <span className="ml-auto text-xs text-mint">변경하기</span>
              </div>
            ) : (
              <div className="mt-2 absolute z-10 w-full left-0 top-full">
                <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-xs font-semibold text-pink-500">지역 검색 및 선택</span>
                  <button onClick={() => setShowRegionSelector(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>
                <RegionSelector onSelect={selectWeatherRegion} />
              </div>
            )}
          </div>

          {/* 자동 갱신 주기 */}
          <div>
            <label className="label">자동 갱신 주기</label>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>날씨 정보 자동 갱신 간격</p>
            <select
              className="input w-full"
              value={settings.weather_interval || '30'}
              onChange={e => { updateSetting('weather_interval', e.target.value); window.api.db.updateSetting('weather_interval', e.target.value) }}
            >
              <option value="10">10분</option>
              <option value="30">30분</option>
              <option value="60">1시간</option>
              <option value="120">2시간</option>
            </select>
          </div>
        </div>
      )}
      {activeTab === 'version' && (
        <div className="card space-y-6">
          {/* ===== 버전 정보 ===== */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>교행 보드</h3>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  {appVersion}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                학교 행정실 업무 보조 올인원 데스크톱 위젯 (Electron + React + Gemini AI)
              </p>
            </div>
            <button
              onClick={() => {
                if ((window.api as any)?.updater?.openUrl) {
                  (window.api as any).updater.openUrl('https://github.com/sksu123/widjet/releases')
                } else {
                  window.open('https://github.com/sksu123/widjet/releases', '_blank')
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: 'rgba(100,116,139,0.1)',
                color: 'var(--text-muted)',
                border: '1px solid rgba(100,116,139,0.2)'
              }}
            >
              <ExtLink size={12} />
              GitHub 저장소
            </button>
          </div>

          <div className="divider" />

          {/* ===== 업데이트 확인 ===== */}
          <div>
            <div className="flex items-start justify-between">
              <div>
                <label className="label">업데이트 확인</label>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {updateStatus === 'idle' && '업데이트 확인 버튼을 눌러 최신 버전이 있는지 확인하세요.'}
                  {updateStatus === 'checking' && '⏳ 업데이트를 확인 중입니다...'}
                  {updateStatus === 'latest' && '✓ 현재 최신 버전을 사용 중입니다.'}
                  {updateStatus === 'available' && `🔔 새 버전이 발견되었습니다! (${updateInfo}) - 자동 다운로드 중...`}
                  {updateStatus === 'downloaded' && `✅ 새 버전(${updateInfo}) 다운로드 완료! 프로그램을 재시작하면 자동 설치됩니다.`}
                  {updateStatus === 'error' && `❌ 확인 실패: ${updateInfo}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    setUpdateStatus('checking')
                    setUpdateInfo('')
                    loadReleaseNotes()

                    if ((window.api as any).updater) {
                      ;(window.api as any).updater.onUpdateAvailable((info: any) => {
                        setUpdateStatus('available')
                        setUpdateInfo(info.version || '')
                        setShowReleaseNotes(true)
                      })
                      ;(window.api as any).updater.onUpdateNotAvailable(() => {
                        setUpdateStatus('latest')
                        setShowReleaseNotes(true)
                      })
                      ;(window.api as any).updater.onError((err: string) => {
                        setUpdateStatus('error')
                        setUpdateInfo(err)
                      })
                      ;(window.api as any).updater.onUpdateDownloaded((info: any) => {
                        setUpdateStatus('downloaded')
                        setUpdateInfo(info.version || '')
                        setShowReleaseNotes(true)
                      })
                      const res = await (window.api as any).updater.checkForUpdates()
                      if (res && res.success === false && res.error) {
                        setUpdateStatus('error')
                        setUpdateInfo(res.error)
                      }
                    } else {
                      setUpdateStatus('error')
                      setUpdateInfo('업데이트 기능을 사용할 수 없습니다.')
                    }
                  }}
                  disabled={updateStatus === 'checking' || updateStatus === 'available'}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: (updateStatus === 'checking' || updateStatus === 'available') ? 'rgba(100,116,139,0.1)' : 'rgba(59,130,246,0.1)',
                    color: (updateStatus === 'checking' || updateStatus === 'available') ? 'var(--text-muted)' : '#60a5fa',
                    border: '1px solid',
                    borderColor: (updateStatus === 'checking' || updateStatus === 'available') ? 'rgba(100,116,139,0.2)' : 'rgba(59,130,246,0.2)',
                    opacity: (updateStatus === 'checking' || updateStatus === 'available') ? 0.7 : 1,
                    cursor: (updateStatus === 'checking' || updateStatus === 'available') ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RefreshCw size={12} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                  업데이트 확인
                </button>

                {updateStatus === 'downloaded' && (
                  <button
                    onClick={() => {
                      if ((window.api as any).updater?.quitAndInstall) {
                        (window.api as any).updater.quitAndInstall()
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
                  >
                    <Download size={12} />
                    지금 재시작하여 설치
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="divider" />

          {/* ===== GitHub Release Notes (업데이트 상세 내역) ===== */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  GitHub 릴리스 노트 (업데이트 내역)
                </h4>
              </div>

              <div className="flex items-center gap-2">
                {releases.length > 1 && (
                  <select
                    value={selectedReleaseIndex}
                    onChange={(e) => setSelectedReleaseIndex(Number(e.target.value))}
                    className="input text-xs py-1 px-2 h-7"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  >
                    {releases.map((rel, idx) => (
                      <option key={idx} value={idx}>
                        {rel.tagName || rel.name} {idx === 0 ? '(최신)' : ''}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  onClick={() => {
                    const current = releases[selectedReleaseIndex]
                    if (current && current.body) {
                      navigator.clipboard.writeText(current.body)
                      setCopiedReleaseNote(true)
                      setTimeout(() => setCopiedReleaseNote(false), 2000)
                    }
                  }}
                  disabled={releases.length === 0}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors"
                  style={{
                    background: 'rgba(100,116,139,0.15)',
                    color: copiedReleaseNote ? '#4ade80' : 'var(--text-muted)',
                    border: '1px solid rgba(100,116,139,0.25)'
                  }}
                  title="릴리스 노트 마크다운 내용 복사"
                >
                  {copiedReleaseNote ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedReleaseNote ? '복사됨!' : '내용 복사'}</span>
                </button>

                <button
                  onClick={() => loadReleaseNotes()}
                  disabled={loadingReleases}
                  className="p-1 rounded text-xs transition-colors hover:bg-slate-700/40"
                  style={{ color: 'var(--text-muted)' }}
                  title="릴리스 정보 새로고침"
                >
                  <RefreshCw size={13} className={loadingReleases ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {loadingReleases && releases.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 border border-slate-700/50 rounded-xl bg-slate-900/40">
                <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-blue-400" />
                GitHub 릴리스 노트를 불러오는 중입니다...
              </div>
            ) : releases.length > 0 ? (
              <div className="border border-slate-700/60 rounded-xl bg-slate-900/60 overflow-hidden">
                {/* 릴리스 헤더 */}
                <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between bg-slate-800/40">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">
                      {releases[selectedReleaseIndex]?.name || releases[selectedReleaseIndex]?.tagName}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-mono">
                      {releases[selectedReleaseIndex]?.tagName}
                    </span>
                  </div>
                  {releases[selectedReleaseIndex]?.publishedAt && (
                    <span className="text-[11px] text-slate-400">
                      {new Date(releases[selectedReleaseIndex].publishedAt).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  )}
                </div>

                {/* 릴리스 본문 (마크다운) */}
                <div className="p-4 max-h-[380px] overflow-y-auto text-xs leading-relaxed text-slate-200 space-y-2 select-text">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {releases[selectedReleaseIndex]?.body || '상세 릴리스 노트 내용이 없습니다.'}
                  </ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 border border-slate-700/50 rounded-xl bg-slate-900/40">
                <FileText size={20} className="mx-auto mb-1.5 text-slate-500" />
                <p>릴리스 노트를 불러올 수 없습니다. [업데이트 확인]을 누르거나 인터넷 연결을 확인하세요.</p>
                <button
                  onClick={() => loadReleaseNotes()}
                  className="mt-2 text-xs text-blue-400 hover:underline"
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
