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
        <div className="card space-y-5">

          {/* ===== 테마 ===== */}
          <div>
            <label className="label">테마 디자인</label>

            {/* 기본 테마 */}
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 mt-1" style={{ color: 'var(--text-muted)' }}>기본 테마</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { value: 'dark', label: '🌙 다크', bg: '#0f172a', accent: '#3b82f6' },
                { value: 'light', label: '☀️ 라이트', bg: '#f8fafc', accent: '#3b82f6' },
                { value: 'ocean', label: '🌊 오션 네이비', bg: '#0a192f', accent: '#64ffda' },
                { value: 'forest', label: '🌲 포레스트 그린', bg: '#0d1b13', accent: '#86efac' },
                { value: 'mocha', label: '☕ 모카 브라운', bg: '#1f1b18', accent: '#d6b08a' },
                { value: 'lavender', label: '🌸 소프트 라벤더', bg: '#fdfcff', accent: '#a78bfa' },
              ].map(({ value, label, bg, accent }) => (
                <button key={value} onClick={() => {
                  updateSetting('theme', value)
                  const font = settings.font || 'noto'
                  const layout = settings.layout || 'standard'
                  document.documentElement.className = `${value} font-${font} layout-${layout}`
                }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={settings.theme === value
                    ? { background: accent + '30', border: `1.5px solid ${accent}`, color: 'var(--text-primary)' }
                    : { background: bg + '40', border: '1.5px solid var(--border)', color: 'var(--text-muted)' }
                  }>
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: bg, border: `2px solid ${accent}` }} />
                  {label}
                </button>
              ))}
            </div>

            {/* 유명 앱 스타일 */}
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Famous App Style</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { value: 'kakao', label: '💬 카카오톡', bg: '#fae100', accent: '#3c1e1e', textColor: '#1a1200' },
                { value: 'naver', label: '🔍 네이버', bg: '#03c75a', accent: '#03c75a', textColor: '#ffffff' },
                { value: 'toss', label: '💳 토스(Toss)', bg: '#4361ee', accent: '#4361ee', textColor: '#ffffff' },
                { value: 'instagram', label: '📷 인스타그램', bg: '#833ab4', accent: '#e1306c', textColor: '#ffffff' },
                { value: 'netflix', label: '▶ 넷플릭스', bg: '#141414', accent: '#e50914', textColor: '#ffffff' },
                { value: 'youtube', label: '▶ 유튜브', bg: '#0f0f0f', accent: '#ff0000', textColor: '#f1f1f1' },
                { value: 'baemin', label: '🚲 배민', bg: '#2cb4af', accent: '#2cb4af', textColor: '#ffffff' },
                { value: 'daangn', label: '🥕 당근마켓', bg: '#ff6f0f', accent: '#ff6f0f', textColor: '#ffffff' },
              ].map(({ value, label, bg, accent, textColor }) => (
                <button key={value} onClick={() => {
                  updateSetting('theme', value)
                  const font = settings.font || 'noto'
                  const layout = settings.layout || 'standard'
                  document.documentElement.className = `${value} font-${font} layout-${layout}`
                }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={settings.theme === value
                    ? { background: bg, border: `1.5px solid ${accent}`, color: textColor, boxShadow: `0 0 0 2px ${accent}` }
                    : { background: bg + '22', border: `1.5px solid ${bg}55`, color: 'var(--text-secondary)' }
                  }>
                  {label}
                </button>
              ))}
            </div>

            {/* 비주얼 테마 & 무드 */}
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>Visual Theme & Mood</p>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'pastel', label: '🎨 파스텔 톤', bg: 'linear-gradient(135deg,#ffd6e7,#c3f0ca,#c8d6ff)', textColor: '#4a3060' },
                { value: 'chalkboard', label: '🖊 칠판 테마', bg: '#1a3a2a', textColor: '#f5f0e8' },
              ].map(({ value, label, bg, textColor }) => (
                <button key={value} onClick={() => {
                  updateSetting('theme', value)
                  const font = settings.font || 'noto'
                  const layout = settings.layout || 'standard'
                  document.documentElement.className = `${value} font-${font} layout-${layout}`
                }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={settings.theme === value
                    ? { background: bg, border: '1.5px solid rgba(255,255,255,0.5)', color: textColor, boxShadow: '0 0 0 2px rgba(255,255,255,0.3)' }
                    : { background: bg, border: '1.5px solid var(--border)', color: textColor, opacity: 0.7 }
                  }>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* ===== 글꼴 ===== */}
          <div>
            <label className="label">글꼴 (폰트)</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'noto', label: 'Noto Sans KR', desc: '기본 · 안정적인 가독성', sample: '가나다ABCabc' },
                { value: 'pretendard', label: 'Pretendard', desc: '깔끔함 · 현대적 고딕', sample: '가나다ABCabc' },
                { value: 'nanum', label: '나눔고딕', desc: '따뜻함 · 친근한 느낌', sample: '가나다ABCabc' },
                { value: 'myeongjo', label: '나눔명조', desc: '격식체 · 공문서 스타일', sample: '가나다ABCabc' },
                { value: 'blackhan', label: 'Black Han Sans', desc: '굵고 강렬한 임팩트', sample: '가나다ABC' },
                { value: 'dohyeon', label: '도현체', desc: '둥글고 부드러운 고딕', sample: '가나다ABCabc' },
                { value: 'gowun', label: '고운도담', desc: '아기자기한 손글씨 느낌', sample: '가나다ABCabc' },
                { value: 'jua', label: '주아체', desc: '귀엽고 개성 있는 스타일', sample: '가나다ABCabc' },
                { value: 'gamja', label: '감자꽃체', desc: '손글씨 · 감성적인 느낌', sample: '가나다ABCabc' },
              ].map(({ value, label, desc, sample }) => {
                const fontFamilyMap: Record<string, string> = {
                  noto: "'Noto Sans KR', sans-serif",
                  pretendard: "'Pretendard', sans-serif",
                  nanum: "'Nanum Gothic', sans-serif",
                  myeongjo: "'Nanum Myeongjo', serif",
                  blackhan: "'Black Han Sans', sans-serif",
                  dohyeon: "'Do Hyeon', sans-serif",
                  gowun: "'Gowun Dodum', sans-serif",
                  jua: "'Jua', sans-serif",
                  gamja: "'Gamja Flower', sans-serif",
                }
                const isSelected = (settings.font || 'noto') === value
                return (
                  <button key={value} onClick={() => {
                    updateSetting('font', value)
                    const allFonts = ['font-noto','font-pretendard','font-nanum','font-myeongjo','font-blackhan','font-dohyeon','font-gowun','font-jua','font-gamja']
                    document.documentElement.classList.remove(...allFonts)
                    document.documentElement.classList.add(`font-${value}`)
                  }}
                    className="text-left px-3 py-2.5 rounded-lg transition-all"
                    style={isSelected
                      ? { background: 'rgba(59,130,246,0.15)', border: '1.5px solid rgba(59,130,246,0.5)', color: 'var(--text-primary)' }
                      : { background: 'var(--bg-tertiary)', border: '1.5px solid var(--border)', color: 'var(--text-muted)' }
                    }>
                    <p className="text-sm font-semibold" style={{ fontFamily: fontFamilyMap[value], color: 'var(--text-primary)' }}>{sample}</p>
                    <p className="text-[10px] font-medium mt-0.5">{label}</p>
                    <p className="text-[10px] mt-0.5 opacity-60">{desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ===== 레이아웃 ===== */}
          <div>
            <label className="label">화면 레이아웃</label>
            <select className="input" value={settings.layout || 'standard'} onChange={e => {
              updateSetting('layout', e.target.value)
              document.documentElement.classList.remove('layout-standard', 'layout-compact')
              document.documentElement.classList.add(`layout-${e.target.value}`)
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

          <div className="divider" />
          
          <div className="p-3 rounded-lg text-xs leading-relaxed" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)' }}>
            <p className="font-semibold" style={{ color: '#2dd4bf' }}>💡 나이스(NEIS) 급식 API 발급 및 설정 가이드</p>
            <div className="mt-2 space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <p>
                <strong className="text-white">1. API 키 발급:</strong><br/>
                <a href="https://open.neis.go.kr/" target="_blank" rel="noreferrer" style={{ color: '#2dd4bf', textDecoration: 'underline' }}>나이스 교육정보 개방포털</a> 회원가입 후, [인증키 신청] 메뉴에서 무료로 발급받습니다.
              </p>
              <p>
                <strong className="text-white">2. 교육청코드 & 학교코드 확인:</strong><br/>
                개방포털 상단의 <strong>[데이터셋] - [학교기본정보]</strong> 메뉴로 이동하여 우측의 <strong>[Open API] 탭 ❯ [API 시뮬레이터]</strong>에서 SCHUL_NM 에 학교명을 입력하고 [호출]을 누르세요.<br/>
                결과창에서 <code>ATPT_OFCDC_SC_CODE</code>(교육청코드)와 <code>SD_SCHUL_CODE</code>(학교코드)를 복사해서 아래에 붙여넣습니다.
              </p>
            </div>
          </div>

          <div>
            <label className="label">나이스(NEIS) API 키</label>
            <input className="input font-mono text-xs" type="password"
              value={settings.neis_api_key || ''}
              onChange={e => updateSetting('neis_api_key', e.target.value)}
              placeholder="NEIS 인증키..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">시도교육청코드</label>
              <input className="input font-mono text-xs" type="text"
                value={settings.neis_atpt_code || ''}
                onChange={e => updateSetting('neis_atpt_code', e.target.value)}
                placeholder="예: J10 (경기도)" />
            </div>
            <div>
              <label className="label">학교 표준코드</label>
              <input className="input font-mono text-xs" type="text"
                value={settings.neis_schul_code || ''}
                onChange={e => updateSetting('neis_schul_code', e.target.value)}
                placeholder="예: 7530000" />
            </div>
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
