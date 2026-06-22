import { useState, useEffect } from 'react'
import { Settings as SettingsIcon, Save, User, Database, RefreshCw, Search, Building2, Check, X, Cloud, MapPin, Edit2, Download } from 'lucide-react'
import { RegionSelector } from '../../components/RegionSelector'

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [user, setUser] = useState({ name: '', school_name: '', department: '', email: '', avatar_color: '#3b82f6' })
  const [saved, setSaved] = useState(false)
  const [backupDone, setBackupDone] = useState(false)
  const [restoreMsg, setRestoreMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'general' | 'api' | 'weather' | 'user' | 'data' | 'school'>('general')
  const [autoStart, setAutoStart] = useState(false)
  // 업데이트 상태: 'idle' | 'checking' | 'latest' | 'available' | 'error'
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'latest' | 'available' | 'error'>('idle')
  const [updateInfo, setUpdateInfo] = useState<string>('')

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // 날씨 지역 변경 상태
  const [showRegionSelector, setShowRegionSelector] = useState(false)

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
    { key: 'api', label: 'API 설정', icon: Cloud },
    { key: 'weather', label: '날씨 설정', icon: Cloud },
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
          
          <div className="divider" />

          {/* ===== 업데이트 ===== */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="label">업데이트</label>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {updateStatus === 'idle' && '업데이트 확인 버튼을 눌러 최신 버전을 확인하세요.'}
                  {updateStatus === 'checking' && '⏳ 업데이트를 확인 중입니다...'}
                  {updateStatus === 'latest' && '✓ 최신 버전을 사용 중입니다.'}
                  {updateStatus === 'available' && `🔔 새 버전이 있습니다! ${updateInfo} - 자동 다운로드 중...앱실행 시 설치됩니다.`}
                  {updateStatus === 'error' && `❌ 확인 실패: ${updateInfo}`}
                </p>
              </div>
              <button
                onClick={async () => {
                  setUpdateStatus('checking')
                  setUpdateInfo('')
                  // 이벤트 리스너 등록 (중복 방지를 위해 한 번만)
                  if ((window.api as any).updater) {
                    ;(window.api as any).updater.onUpdateAvailable((info: any) => {
                      setUpdateStatus('available')
                      setUpdateInfo(info.version || '')
                    })
                    ;(window.api as any).updater.onUpdateNotAvailable(() => {
                      setUpdateStatus('latest')
                    })
                    ;(window.api as any).updater.onError((err: string) => {
                      setUpdateStatus('error')
                      setUpdateInfo(err)
                    })
                    await (window.api as any).updater.checkForUpdates()
                  } else {
                    setUpdateStatus('error')
                    setUpdateInfo('업데이트 기능을 사용할 수 없습니다.')
                  }
                }}
                disabled={updateStatus === 'checking'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: updateStatus === 'checking' ? 'rgba(100,116,139,0.1)' : 'rgba(59,130,246,0.1)',
                  color: updateStatus === 'checking' ? 'var(--text-muted)' : '#60a5fa',
                  border: '1px solid',
                  borderColor: updateStatus === 'checking' ? 'rgba(100,116,139,0.2)' : 'rgba(59,130,246,0.2)',
                  opacity: updateStatus === 'checking' ? 0.7 : 1,
                  cursor: updateStatus === 'checking' ? 'not-allowed' : 'pointer'
                }}
              >
                <RefreshCw size={12} className={updateStatus === 'checking' ? 'animate-spin' : ''} />
                업데이트 확인
              </button>
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

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>버전 정보</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>학교행정 AI 위젯 v1.0.1</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Electron + React + Gemini AI</p>
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
    </div>
  )
}
