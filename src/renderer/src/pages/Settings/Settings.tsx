import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, Key, User, Palette, Bell, Database, RefreshCw } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [user, setUser] = useState({ name: '', school_name: '', department: '', email: '' })
  const [saved, setSaved] = useState(false)
  const [backupDone, setBackupDone] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'user' | 'data'>('general')
  const [autoStart, setAutoStart] = useState(false)
  const [dashboardWidgets, setDashboardWidgets] = useState({
    weather: true,
    dday: true,
    today: true,
    summary: true,
    quick: true
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const [settingsRes, userRes, autoStartRes] = await Promise.all([
      window.api.db.getSettings(),
      window.api.db.getUser(),
      window.api.system?.getLoginItem ? window.api.system.getLoginItem() : Promise.resolve({ success: false, openAtLogin: false })
    ])
    if (settingsRes.success) {
      const s = settingsRes.data as Record<string, string>
      setSettings(s)
      if (s.dashboard_widgets) {
        try {
          setDashboardWidgets(JSON.parse(s.dashboard_widgets))
        } catch (e) {}
      }
    }
    if (userRes.success) {
      const u = userRes.data as typeof user
      setUser({ name: u.name, school_name: u.school_name, department: u.department, email: u.email || '' })
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
    await window.api.db.updateSetting('dashboard_widgets', JSON.stringify(dashboardWidgets))
    
    // 자동 실행 저장
    if (window.api.system?.setLoginItem) {
      await window.api.system.setLoginItem(autoStart)
    }
    
    // 사용자 저장
    await window.api.db.updateUser(user as Record<string, unknown>)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function backup() {
    const res = await window.api.file.backupDb()
    if (res.success) {
      setBackupDone(true)
      setTimeout(() => setBackupDone(false), 2000)
    }
  }

  const TABS = [
    { key: 'general', label: '일반', icon: SettingsIcon },
    { key: 'api', label: 'API 키', icon: Key },
    { key: 'user', label: '사용자', icon: User },
    { key: 'data', label: '데이터', icon: Database },
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
        <div className="card space-y-4">
          <div>
            <label className="label">테마</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'dark', label: '🌙 다크' },
                { value: 'light', label: '☀️ 라이트' },
                { value: 'ocean', label: '🌊 오션 네이비' },
                { value: 'forest', label: '🌲 포레스트 그린' },
                { value: 'mocha', label: '☕ 모카 브라운' },
                { value: 'lavender', label: '🌸 소프트 라벤더' }
              ].map(({ value, label }) => (
                <button key={value} onClick={() => {
                  updateSetting('theme', value)
                  document.documentElement.className = value
                }}
                  className="py-2 px-1 rounded-lg text-xs font-medium transition-all"
                  style={settings.theme === value
                    ? { background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', color: 'var(--text-primary)' }
                    : { background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
                  }>
                  {label}
                </button>
              ))}
            </div>
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
          
          <div className="divider" />
          
          <div>
            <label className="label">행정실 허브 화면 구성</label>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>메인 화면에 표시할 위젯을 선택하세요.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'weather', label: '상단 날씨' },
                { key: 'dday', label: '다가오는 일정' },
                { key: 'today', label: '오늘 일정' },
                { key: 'summary', label: '현황 요약' },
                { key: 'quick', label: '빠른 실행 버튼' }
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <input type="checkbox"
                    checked={dashboardWidgets[key as keyof typeof dashboardWidgets]}
                    onChange={e => setDashboardWidgets({ ...dashboardWidgets, [key]: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500" />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="card space-y-4">
          <div className="p-3 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p className="font-semibold" style={{ color: '#60a5fa' }}>💡 API 키 발급 방법 가이드</p>
            <div className="mt-2 space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <p>
                <strong className="text-white">1. Gemini API (AI 기능):</strong><br/>
                <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>aistudio.google.com</a>에 접속하여 Google 계정으로 로그인 후 [Get API key]를 클릭해 무료로 발급받습니다.
              </p>
              <p>
                <strong className="text-white">2. OpenWeatherMap API (날씨):</strong><br/>
                <a href="https://openweathermap.org/" target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>openweathermap.org</a>에 접속 및 가입 후 내 프로필의 [My API keys]에서 무료로 발급받습니다.
              </p>
            </div>
          </div>
          <div>
            <label className="label">Gemini API 키 (AI 기능 필수)</label>
            <input className="input font-mono text-xs" type="password"
              value={settings.gemini_api_key || ''}
              onChange={e => updateSetting('gemini_api_key', e.target.value)}
              placeholder="AIza..." />
          </div>
          <div>
            <label className="label">OpenWeatherMap API 키 (날씨 선택)</label>
            <input className="input font-mono text-xs" type="password"
              value={settings.weather_api_key || ''}
              onChange={e => updateSetting('weather_api_key', e.target.value)}
              placeholder="날씨 API 키..." />
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
        <div className="card space-y-4">
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>데이터 백업</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              앱 데이터를 파일로 백업합니다. 정기적으로 백업하는 것을 권장합니다.
            </p>
            <button onClick={backup} className="btn-primary text-sm">
              <Database size={14} /> {backupDone ? '백업 완료 ✓' : '지금 백업'}
            </button>
          </div>
          <div className="divider" />
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>버전 정보</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>학교행정 AI 위젯 v1.0.0</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Electron + React + Gemini AI</p>
          </div>
        </div>
      )}
    </div>
  )
}
