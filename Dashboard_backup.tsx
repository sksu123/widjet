import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Cloud, Sun, CloudRain, Wind, Droplets, Calendar as CalendarIcon, Clock,
  Bot, CreditCard, Package, Zap, BookOpen, ChevronRight, ChevronLeft,
  TrendingUp, Bell, Utensils, CheckCircle2, Circle, MapPin, RefreshCw, X as XIcon,
  FolderHeart, Edit2, LayoutList, LayoutGrid, Folder, File, Plus, Trash2, Check
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns'

import { RegionSelector } from '../../components/RegionSelector'

interface WeatherData {
  city: string; temp: number | string; compareYm: string;
  feels_like: string; humidity: string; description: string; icon: string; wind: string;
  pm10: string; pm25: string; uv: string; ozone: string;
  hourly: { time: string; icon: string; temp: string; humidity: string; wind: string }[];
  weekly: { day: string; date: string; amIcon: string; pmIcon: string; amRain: string; pmRain: string; low: string; high: string }[];
  updatedAt: string;
}
interface Schedule { id: number; title: string; start_date: string; category: string; color: string; days_left: number; is_completed: number }
interface User { name: string; school_name: string; department: string }

export default function Dashboard() {
  const navigate = useNavigate()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherSummary, setWeatherSummary] = useState('')
  const [weatherSummaryLoading, setWeatherSummaryLoading] = useState(false)
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([])
  const [ddays, setDdays] = useState<Schedule[]>([])
  const [user, setUser] = useState<User>({ name: '관리자', school_name: '○○초등학교', department: '행정실' })
  const [now, setNow] = useState(new Date())
  
  const [meals, setMeals] = useState<{type: string, typeName: string, menus: string[], kcal: string}[]>([])
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(['1', '2', '3'])
  const [mealError, setMealError] = useState<string>('')
  const [mealDayOffset, setMealDayOffset] = useState(0)
  const [mealLoading, setMealLoading] = useState(false)
  
  const [showWeatherModal, setShowWeatherModal] = useState(false)
  const [showRegionSelector, setShowRegionSelector] = useState(false)
  const [isWeatherRefreshing, setIsWeatherRefreshing] = useState(false)
  
  // 학사일정
  const [scheduleYear, setScheduleYear] = useState(new Date().getFullYear())
  const [scheduleMonth, setScheduleMonth] = useState(new Date().getMonth() + 1)
  const [schoolEvents, setSchoolEvents] = useState<{date: string; eventName: string; isHoliday: boolean}[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState('')
  
  // 파일/폴더 즐겨찾기
  const [favorites, setFavorites] = useState<{id: number; name: string; path: string; type: string}[]>([])
  const [isFavoritesEdit, setIsFavoritesEdit] = useState(false)
  
  // 레이아웃 추가 상태
  const [showSchoolScheduleInCalendar, setShowSchoolScheduleInCalendar] = useState(true)
  const [rightTab, setRightTab] = useState<'todo' | 'school'>('todo')
  
  const [widgetsConfig, setWidgetsConfig] = useState({
    weather: true,
    dday: true,
    today: true,
    summary: true,
    quick: true
  })

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (weather) {
      loadWeatherSummary(weather)
    }
  }, [weather])

  async function loadWeatherSummary(wData: WeatherData) {
    if (!window.api.ai || !(window.api.ai as any).weatherSummary) return;
    setWeatherSummaryLoading(true)
    try {
      const res = await (window.api.ai as any).weatherSummary(wData)
      if (res.success) setWeatherSummary(res.text)
    } finally {
      setWeatherSummaryLoading(false)
    }
  }

  async function loadData() {
    try {
      const [weatherRes, todayRes, ddayRes, userRes, settingsRes, mealRes, favRes] = await Promise.all([
        window.api.calendar.getWeather(),
        window.api.calendar.getToday(),
        window.api.calendar.getDday(),
        window.api.db.getUser(),
        window.api.db.getSettings(),
        window.api.calendar.getMeal ? window.api.calendar.getMeal() : Promise.resolve({ success: false, error: 'NEIS_NOT_CONFIGURED' }),
        window.api.file.getFavorites ? window.api.file.getFavorites() : Promise.resolve({ success: true, data: [] })
      ])

      if (weatherRes.success) setWeather(weatherRes.data as WeatherData)
      if (todayRes.success) setTodaySchedules(todayRes.data as Schedule[])
      if (ddayRes.success) setDdays(ddayRes.data as Schedule[])
      if (userRes.success) setUser(userRes.data as User)
      
      if (settingsRes.success) {
        const s = settingsRes.data as Record<string, string>
        if (s.dashboard_widgets) {
          try { setWidgetsConfig(JSON.parse(s.dashboard_widgets)) } catch(e) {}
        }
      }
      
      if (mealRes) {
        if (mealRes.success) {
          const mealData = mealRes.data as any
          if (Array.isArray(mealData) && mealData.length > 0 && typeof mealData[0] === 'object' && mealData[0].type) {
            setMeals(mealData)
          } else if (mealData.menus) {
            setMeals([{ type: '2', typeName: '점심', menus: mealData.menus, kcal: mealData.kcal || '' }])
          } else if (Array.isArray(mealData)) {
            setMeals([{ type: '2', typeName: '점심', menus: mealData, kcal: '' }])
          } else {
            setMeals([])
          }
        } else {
          setMealError(mealRes.error as string)
        }
      }

      if (favRes && favRes.success) {
        setFavorites(favRes.data as any[])
      }

      // 학사일정 초기 로드
      const y = new Date().getFullYear()
      const m = new Date().getMonth() + 1
      loadSchoolSchedule(y, m)
    } catch (e) {
      console.error(e)
    }
  }

  async function loadSchoolSchedule(year: number, month: number) {
    if(!window.api.calendar.getSchoolSchedule) return;
    setScheduleLoading(true)
    setScheduleError('')
    try {
      const res = await window.api.calendar.getSchoolSchedule(year, month)
      if (res.success) {
        setSchoolEvents(res.data as {date: string; eventName: string; isHoliday: boolean}[])
      } else {
        setScheduleError(res.error as string)
      }
    } catch (e) {
      setScheduleError('학사일정을 불러오지 못했습니다.')
    } finally {
      setScheduleLoading(false)
    }
  }

  // 날짜 오프셋에 따라 급식 정보 불러오기
  async function loadMeal(offset: number) {
    setMealLoading(true)
    setMeals([])
    setMealError('')
    try {
      const d = new Date()
      d.setDate(d.getDate() + offset)
      const yyyymmdd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0')
      const res = await (window.api.calendar.getMeal as (d?: string) => Promise<{success: boolean; data?: any; error?: string}>)(yyyymmdd)
      if (res.success && res.data) {
        if (Array.isArray(res.data) && res.data.length > 0 && typeof res.data[0] === 'object' && res.data[0].type) {
          setMeals(res.data)
        } else if (res.data.menus) {
          setMeals([{ type: '2', typeName: '점심', menus: res.data.menus, kcal: res.data.kcal || '' }])
        } else if (Array.isArray(res.data)) {
          setMeals([{ type: '2', typeName: '점심', menus: res.data, kcal: '' }])
        } else {
          setMeals([])
        }
      } else {
        setMealError(res.error as string)
      }
    } catch (e) {
      setMealError('급식 정보를 불러오지 못했습니다.')
    } finally {
      setMealLoading(false)
    }
  }

  // 즐겨찾기 다시 로드
  async function loadFavorites() {
    if (!window.api.file.getFavorites) return
    const res = await window.api.file.getFavorites()
    if (res.success) setFavorites(res.data as any[])
  }

  // 즐겨찾기 수동 추가 다이얼로그
  async function handleAddFavoriteDialog(type: 'file' | 'folder') {
    if (!window.api.file.openDialog || !window.api.file.addFavorite) return
    const options: any = { properties: type === 'folder' ? ['openDirectory'] : ['openFile'] }
    const res = await window.api.file.openDialog(options)
    if (res.success && res.paths && res.paths.length > 0) {
      const path = res.paths[0]
      const name = path.split('').pop() || path.split('/').pop() || 'Unknown'
      await window.api.file.addFavorite(name, path, type)
      loadFavorites()
    }
  }

  // 즐겨찾기 삭제
  async function handleDeleteFavorite(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.api.file.removeFavorite) return
    if (confirm('이 항목을 즐겨찾기에서 제거하시겠습니까?')) {
      await window.api.file.removeFavorite(id)
      loadFavorites()
    }
  }

  // 파일/폴더 열기
  async function handleOpenFavorite(path: string) {
    if (isFavoritesEdit) return
    if (!window.api.file.openPath) return
    const res = await window.api.file.openPath(path)
    if (!res.success) {
      alert(`열기 실패: ${res.error}`)
    }
  }

  // 드래그 앤 드롭
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!window.api.file.addFavorite) return
    const files = Array.from(e.dataTransfer.files)
    for (const f of files) {
      const path = (f as any).path
      if (path) {
        const isFolder = !f.name.includes('.') && f.size % 4096 === 0
        await window.api.file.addFavorite(f.name, path, isFolder ? 'folder' : 'file')
      }
    }
    loadFavorites()
  }

  const toggleSchedule = async (id: number, currentCompleted: number) => {
    const nextVal = currentCompleted === 1 ? 0 : 1
    setTodaySchedules(prev => prev.map(s => s.id === id ? { ...s, is_completed: nextVal } : s))
    if (window.api.calendar.toggleScheduleStatus) {
      await window.api.calendar.toggleScheduleStatus(id, nextVal)
    }
  }

  const weatherIcon = (icon: string) => {
    if (icon?.includes('01')) return <Sun size={32} className="text-yellow-400" />
    if (icon?.includes('09') || icon?.includes('10')) return <CloudRain size={32} className="text-blue-400" />
    return <Cloud size={32} className="text-slate-400" />
  }

  return (
    <div className="flex gap-5 h-full fade-in pb-4">
      {/* ==================================================== */}
      {/* 좌측 패널: 대형 캘린더 (화면의 약 60~65% 차지) */}
      {/* ==================================================== */}
      <div className="flex-1 flex flex-col min-w-0 rounded-2xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {/* 캘린더 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <CalendarIcon size={22} className="text-blue-500" />
              이번 달 일정
            </h2>
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg border ml-2" style={{ background: 'rgba(0,0,0,0.03)', borderColor: 'var(--border)' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>학사일정 표시</span>
              <button 
                onClick={() => setShowSchoolScheduleInCalendar(!showSchoolScheduleInCalendar)}
                className={`w-8 h-4 rounded-full transition-colors relative ${showSchoolScheduleInCalendar ? 'bg-blue-500' : 'bg-slate-300'}`}
              >
                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${showSchoolScheduleInCalendar ? 'left-4' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* 달 변경 버튼 */}
            <div className="flex items-center gap-2">
              <button onClick={() => {
                const prevDate = new Date(scheduleYear, scheduleMonth - 2, 1)
                setScheduleYear(prevDate.getFullYear())
                setScheduleMonth(prevDate.getMonth() + 1)
                loadSchoolSchedule(prevDate.getFullYear(), prevDate.getMonth() + 1)
              }} className="p-1.5 rounded-lg transition-colors" style={{ background: 'transparent' }} onMouseOver={e=>e.currentTarget.style.background='rgba(0,0,0,0.05)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                <ChevronLeft size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
              <span className="text-lg font-bold min-w-[100px] text-center" style={{ color: 'var(--text-primary)' }}>
                {scheduleYear}년 {scheduleMonth}월
              </span>
              <button onClick={() => {
                const nextDate = new Date(scheduleYear, scheduleMonth, 1)
                setScheduleYear(nextDate.getFullYear())
                setScheduleMonth(nextDate.getMonth() + 1)
                loadSchoolSchedule(nextDate.getFullYear(), nextDate.getMonth() + 1)
              }} className="p-1.5 rounded-lg transition-colors" style={{ background: 'transparent' }} onMouseOver={e=>e.currentTarget.style.background='rgba(0,0,0,0.05)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>
            
            <button className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}
              onClick={() => {
                const now = new Date()
                setScheduleYear(now.getFullYear())
                setScheduleMonth(now.getMonth() + 1)
                loadSchoolSchedule(now.getFullYear(), now.getMonth() + 1)
              }}>
              오늘
            </button>
          </div>
        </div>

        {/* 캘린더 그리드 */}
        <div className="flex-1 flex flex-col">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <div key={d} className="text-center font-bold text-sm py-1" style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--text-muted)' }}>
                {d}
              </div>
            ))}
          </div>
          
          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
            {(() => {
              const displayMonthStart = new Date(scheduleYear, scheduleMonth - 1, 1)
              const displayMonthEnd = endOfMonth(displayMonthStart)
              const calStart = startOfWeek(displayMonthStart, { weekStartsOn: 0 })
              const calEnd = endOfWeek(displayMonthEnd, { weekStartsOn: 0 })
              const days = eachDayOfInterval({ start: calStart, end: calEnd })

              return days.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === displayMonthStart.getMonth()
                const isTodayFlag = isToday(day)
                
                // 해당 날짜의 내 일정
                const daySchedules = ddays.filter(s => isSameDay(new Date(s.start_date), day))
                
                // 해당 날짜의 학사일정
                const dateString = format(day, 'yyyyMMdd')
                const daySchoolEvents = schoolEvents.filter(e => e.date === dateString)
                
                const isSunday = day.getDay() === 0
                const isSaturday = day.getDay() === 6
                const isHoliday = daySchoolEvents.some(e => e.isHoliday)

                return (
                  <div key={idx} 
                    className={`rounded-xl p-2 border flex flex-col transition-all ${isTodayFlag ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                    style={{ 
                      background: isCurrentMonth ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.03)',
                      borderColor: isTodayFlag ? 'rgba(59,130,246,0.3)' : 'var(--border)',
                      opacity: isCurrentMonth ? 1 : 0.4
                    }}
                  >
                    {/* 날짜 텍스트 */}
                    <div className="flex justify-between items-start mb-1.5">
                      <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isTodayFlag ? 'bg-blue-500 text-white' : ''}`}
                        style={{ color: isTodayFlag ? 'white' : (isSunday || isHoliday) ? '#ef4444' : isSaturday ? '#3b82f6' : 'var(--text-primary)' }}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* 일정 목록 (스크롤 숨김 처리) */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1" style={{ maxHeight: 'calc(100% - 24px)', scrollbarWidth: 'none' }}>
                      {/* 내 일정 */}
                      {daySchedules.map((s, i) => (
                        <div key={`my-${i}`} className="text-[10px] truncate px-1.5 py-0.5 rounded"
                          style={{ background: `${s.color}20`, color: s.color || 'var(--text-primary)' }}>
                          <span className="w-1 h-1 inline-block rounded-full mr-1 align-middle" style={{ background: s.color }}/>
                          {s.title}
                        </div>
                      ))}
                      
                      {/* 학사일정 */}
                      {showSchoolScheduleInCalendar && daySchoolEvents.map((ev, i) => (
                        <div key={`sc-${i}`} className="text-[10px] truncate px-1.5 py-0.5 rounded"
                          style={{ background: ev.isHoliday ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)', color: ev.isHoliday ? '#ef4444' : 'var(--text-muted)' }}>
                          {ev.eventName}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 우측 패널: 위젯 모음 (화면의 약 35~40% 차지) */}
      {/* ==================================================== */}
      <div className="w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
        
        {/* 1. 사용자 정보 및 날씨/시간 (가장 상단 고정) */}
        <div className="p-5 rounded-2xl flex flex-col gap-3 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(20,184,166,0.05))', border: '1px solid rgba(59,130,246,0.2)' }}>
          
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{user.school_name} · {user.department}</p>
              <p className="text-base font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{user.name}님, 안녕하세요!</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {format(now, 'HH:mm:ss')}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {format(now, 'yyyy. MM. dd. (EEE)', { locale: ko })}
              </p>
            </div>
          </div>

          {widgetsConfig.weather && weather && (
            <div className="mt-2 flex items-center justify-between rounded-xl p-3 cursor-pointer transition-colors"
                 onClick={() => setShowWeatherModal(true)}
                 style={{ border: '1px solid var(--border)', background: 'rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-3">
                <div className="scale-110">{weatherIcon(weather.icon)}</div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{weather.temp}°C</span>
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>{weather.description}</span>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{weather.city} · 어제보다 {weather.compareYm || ''}</p>
                </div>
              </div>
              <div className="text-right space-y-1">
                <p className="text-[10px] font-medium flex justify-end items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <span className={`w-2 h-2 rounded-full ${parseInt(weather.pm10) > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}></span> 미세 {weather.pm10 || '-'}
                </p>
                <p className="text-[10px] font-medium flex justify-end items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <span className={`w-2 h-2 rounded-full ${parseInt(weather.pm25) > 35 ? 'bg-red-500' : 'bg-emerald-500'}`}></span> 초미세 {weather.pm25 || '-'}
                </p>
              </div>
            </div>
          )}
          
          {/* 장식용 블러 원 */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* 2. 오늘의 급식 */}
        <div className="card flex flex-col p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Utensils size={14} className="text-orange-500" /> 오늘의 급식
            </h3>
            {mealError !== 'NEIS_NOT_CONFIGURED' && (
              <div className="flex items-center rounded-lg border" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.05)' }}>
                <button onClick={() => { const next = mealDayOffset - 1; setMealDayOffset(next); loadMeal(next) }} className="p-1 rounded-l-lg transition-colors" style={{ background:'transparent' }} onMouseOver={e=>e.currentTarget.style.background='rgba(0,0,0,0.1)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}><ChevronLeft size={14} style={{ color: 'var(--text-muted)' }}/></button>
                <span className="text-[10px] font-semibold w-12 text-center" style={{ color: 'var(--text-primary)' }}>
                  {mealDayOffset === 0 ? '오늘' : mealDayOffset === -1 ? '어제' : mealDayOffset === 1 ? '내일' : (() => { const d = new Date(); d.setDate(d.getDate() + mealDayOffset); return `${d.getMonth() + 1}/${d.getDate()}` })()}
                </span>
                <button onClick={() => { const next = mealDayOffset + 1; setMealDayOffset(next); loadMeal(next) }} className="p-1 rounded-r-lg transition-colors" style={{ background:'transparent' }} onMouseOver={e=>e.currentTarget.style.background='rgba(0,0,0,0.1)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}><ChevronRight size={14} style={{ color: 'var(--text-muted)' }}/></button>
              </div>
            )}
          </div>
          
          <div className="min-h-[90px] flex flex-col justify-center rounded-xl p-3 border" style={{ borderColor: 'rgba(0,0,0,0.03)', background: 'rgba(0,0,0,0.05)' }}>
            {mealError === 'NEIS_NOT_CONFIGURED' ? (
              <div className="text-center">
                <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>나이스(NEIS) 연동이 필요합니다.</p>
                <button onClick={() => navigate('/settings')} className="text-[10px] font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(249,115,22,0.1)', color: '#ea580c' }}>설정하기</button>
              </div>
            ) : mealLoading ? (
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
            ) : mealError ? (
              <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>{mealError}</p>
            ) : meals.length === 0 ? (
              <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>급식 정보가 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-center gap-3 mb-1">
                  {meals.map(m => (
                    <label key={m.type} className="flex items-center gap-1 cursor-pointer text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      <input 
                        type="checkbox" 
                        className="rounded text-emerald-500 focus:ring-emerald-500 w-3 h-3"
                        checked={selectedMealTypes.includes(m.type)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMealTypes([...selectedMealTypes, m.type])
                          else setSelectedMealTypes(selectedMealTypes.filter(t => t !== m.type))
                        }}
                      />
                      <span>
                        {m.type === '1' ? '🌅' : m.type === '2' ? '☀️' : '🌙'} {m.typeName}
                      </span>
                    </label>
                  ))}
                </div>
                
                <div className="space-y-3 max-h-[150px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {meals.filter(m => selectedMealTypes.includes(m.type)).length === 0 ? (
                    <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>선택된 급식이 없습니다.</p>
                  ) : meals.filter(m => selectedMealTypes.includes(m.type)).map(m => (
                    <div key={m.type} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                          {m.type === '1' ? '🌅' : m.type === '2' ? '☀️' : '🌙'} {m.typeName}
                        </span>
                        {m.kcal && (
                          <span className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>{m.kcal}</span>
                        )}
                      </div>
                      <div className="text-[11px] leading-relaxed font-medium pl-1" style={{ color: 'var(--text-secondary)' }}>
                        {m.menus.map((menu, i) => <div key={i}>{menu}</div>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. 할 일 / 학사일정 탭 */}
        <div className="card flex flex-col p-4 flex-1 min-h-[220px]">
          {/* 탭 헤더 */}
          <div className="flex gap-1 mb-3 p-1 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.05)' }}>
            <button 
              onClick={() => setRightTab('todo')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${rightTab === 'todo' ? 'shadow-sm' : ''}`}
              style={{ background: rightTab === 'todo' ? 'var(--bg-card)' : 'transparent', color: rightTab === 'todo' ? 'var(--accent-blue)' : 'var(--text-muted)' }}
            >
              오늘의 일정/할일
            </button>
            <button 
              onClick={() => setRightTab('school')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${rightTab === 'school' ? 'shadow-sm' : ''}`}
              style={{ background: rightTab === 'school' ? 'var(--bg-card)' : 'transparent', color: rightTab === 'school' ? 'var(--accent-blue)' : 'var(--text-muted)' }}
            >
              월간 학사일정
            </button>
          </div>

          {/* 탭 컨텐츠 */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-2" style={{ scrollbarWidth: 'none' }}>
            {rightTab === 'todo' && (
              todaySchedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-6">
                  <CheckCircle2 size={24} className="mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>오늘 일정이 없습니다</p>
                </div>
              ) : todaySchedules.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border transition-all" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.05)' }}>
                  <button onClick={() => toggleSchedule(s.id, s.is_completed || 0)}
                    className="flex-shrink-0 focus:outline-none transition-transform hover:scale-110 active:scale-90">
                    {s.is_completed === 1 
                      ? <CheckCircle2 size={18} className="text-emerald-500" /> 
                      : <Circle size={18} className="text-slate-400 transition-colors" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${s.is_completed === 1 ? 'line-through opacity-50' : ''}`}
                      style={{ color: 'var(--text-primary)' }}>
                      {s.title}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color || '#3b82f6' }} />
                </div>
              ))
            )}

            {rightTab === 'school' && (
              scheduleError === 'NEIS_NOT_CONFIGURED' ? (
                <div className="flex flex-col items-center justify-center h-full py-6">
                  <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>나이스(NEIS) 연동이 필요합니다.</p>
                  <button onClick={() => navigate('/settings')} className="text-[10px] font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>설정하기</button>
                </div>
              ) : schoolEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-6">
                  <CalendarIcon size={24} className="mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>이번 달 학사일정이 없습니다.</p>
                </div>
              ) : schoolEvents.map((ev, i) => {
                const d = ev.date
                const mo = parseInt(d.substring(4, 6), 10)
                const da = parseInt(d.substring(6, 8), 10)
                const dayOfWeek = new Date(parseInt(d.substring(0, 4), 10), mo - 1, da).getDay()
                const dayNames = ['일','월','화','수','목','금','토']
                const isRed = ev.isHoliday || dayOfWeek === 0 || dayOfWeek === 6
                
                return (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: isRed ? 'rgba(239,68,68,0.05)' : 'transparent', border: isRed ? '1px solid rgba(239,68,68,0.1)' : '1px solid transparent' }}>
                    <span className="text-[11px] font-bold w-12 text-center" style={{ color: isRed ? '#ef4444' : 'var(--accent-blue)' }}>
                      {mo}/{da}({dayNames[dayOfWeek]})
                    </span>
                    <span className="text-[11px] font-medium" style={{ color: isRed ? '#ef4444' : 'var(--text-primary)' }}>
                      {ev.eventName}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 4. 파일/폴더 즐겨찾기 */}
        <div className="card flex flex-col p-4 min-h-[160px]" 
          onDragOver={handleDragOver} 
          onDrop={handleDrop}
          style={{ border: isFavoritesEdit ? '2px dashed var(--accent-blue)' : '1px solid var(--border)' }}>
          
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <FolderHeart size={14} className="text-emerald-500" /> 즐겨찾기
            </h3>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setIsFavoritesEdit(!isFavoritesEdit)}
                className={`p-1.5 rounded-lg border transition-colors ${isFavoritesEdit ? 'border-blue-500 text-blue-500' : 'border-transparent text-muted'}`}
                style={{ color: !isFavoritesEdit ? 'var(--text-muted)' : undefined, background: isFavoritesEdit ? 'rgba(59,130,246,0.1)' : 'transparent' }}>
                {isFavoritesEdit ? <Check size={12} /> : <Edit2 size={12} />}
              </button>
            </div>
          </div>

          {isFavoritesEdit && (
            <div className="flex gap-2 mb-3">
              <button onClick={() => handleAddFavoriteDialog('file')} className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors" style={{ color: 'var(--text-primary)', background: 'rgba(0,0,0,0.05)' }}>
                <Plus size={10} /> 파일
              </button>
              <button onClick={() => handleAddFavoriteDialog('folder')} className="flex-1 py-1.5 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors" style={{ color: 'var(--text-primary)', background: 'rgba(0,0,0,0.05)' }}>
                <Plus size={10} /> 폴더
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
            {favorites.length === 0 && !isFavoritesEdit ? (
              <div className="h-full flex flex-col items-center justify-center py-4 border border-dashed rounded-xl opacity-60" style={{ borderColor: 'var(--border)' }}>
                <Folder size={20} className="mb-1" style={{ color: 'var(--text-muted)' }} />
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>파일/폴더를 드롭하세요</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {favorites.map((fav) => (
                  <div key={fav.id} onClick={() => handleOpenFavorite(fav.path)}
                    className="relative group cursor-pointer flex flex-col items-center text-center p-2 rounded-xl transition-colors border"
                    style={{ borderColor: 'rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.05)' }} title={fav.path}>
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg mb-1" 
                      style={{ background: fav.type === 'folder' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)' }}>
                      {fav.type === 'folder' 
                        ? <Folder size={20} style={{ color: '#f59e0b' }} />
                        : <File size={20} style={{ color: '#3b82f6' }} />
                      }
                    </div>
                    <p className="text-[10px] font-medium truncate w-full" style={{ color: 'var(--text-primary)' }}>{fav.name}</p>
                    
                    {isFavoritesEdit && (
                      <button onClick={(e) => handleDeleteFavorite(fav.id, e)}
                        className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors z-10">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

            {/* 날씨 상세 모달 */}
      {showWeatherModal && weather && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowWeatherModal(false); setShowRegionSelector(false); }}>
          <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90vh' }}
            onClick={e => { e.stopPropagation(); setShowRegionSelector(false); }}>
            
            {/* 상단 헤더 */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <div className="flex items-center gap-3">
                <Sun size={20} className="text-orange-500" />
                <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>날씨 정보</span>
                
                <div className="relative ml-2">
                  <button onClick={(e) => { e.stopPropagation(); setShowRegionSelector(!showRegionSelector); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors" 
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    <MapPin size={14} className="text-emerald-500" /> {weather.city}
                  </button>
                  {showRegionSelector && (
                    <div className="absolute left-0 top-full mt-2 w-80 z-[60]" onClick={e => e.stopPropagation()}>
                      <RegionSelector onSelect={async (city, code) => {
                          setShowRegionSelector(false)
                          await window.api.db.updateSetting('weather_city', city)
                          await window.api.db.updateSetting('weather_zone_code', code)
                          setIsWeatherRefreshing(true)
                          const res = await window.api.calendar.getWeather(true)
                          if (res.success) setWeather(res.data as WeatherData)
                          setIsWeatherRefreshing(false)
                        }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>마지막 업데이트: {weather.updatedAt || '방금 전'}</span>
                <button onClick={async () => {
                  setIsWeatherRefreshing(true)
                  const res = await window.api.calendar.getWeather(true)
                  if (res.success) setWeather(res.data as WeatherData)
                  setIsWeatherRefreshing(false)
                }} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  <RefreshCw size={12} className={isWeatherRefreshing ? 'animate-spin' : ''} /> 새로고침
                </button>
                <button onClick={() => setShowWeatherModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ color: 'var(--text-muted)' }}>
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg-background)' }}>
              
              {/* AI 날씨 요약 배너 */}
              <div className="mb-6 rounded-xl p-4 border flex items-start gap-3 shadow-sm" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.2)' }}>
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Bot size={20} className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1">AI 행정 업무 날씨 브리핑</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {weatherSummaryLoading ? '날씨 정보를 기반으로 행정 업무 요약을 생성 중입니다...' : (weatherSummary || '날씨 정보가 업데이트되었습니다.')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
                
                {/* 좌측: 현재 날씨 상세 */}
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl p-8 flex flex-col items-center justify-center border shadow-sm relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="mx-auto scale-[2] transform origin-center mb-6">{weatherIcon(weather.icon)}</div>
                    <p className="text-6xl font-bold mb-2 tracking-tighter" style={{ color: 'var(--text-primary)' }}>{weather.temp}°C</p>
                    <p className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>{weather.description}</p>
                    <div className="flex items-center gap-1.5 text-sm font-medium mb-6 px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' }}>
                      <MapPin size={12} /> {weather.city}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full">
                      <div className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        미세먼지 {weather.pm10 || '정보없음'}
                      </div>
                      <div className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        초미세먼지 {weather.pm25 || '정보없음'}
                      </div>
                      <div className="px-3 py-1.5 rounded-full text-xs font-bold w-full text-center mt-1" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        오존 {weather.ozone || '정보없음'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div className="rounded-xl p-3 flex flex-col items-center justify-center border" style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-muted)' }}><Droplets size={14} /> <span className="text-xs font-medium">습도</span></div>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{weather.humidity || '-'}</p>
                      </div>
                      <div className="rounded-xl p-3 flex flex-col items-center justify-center border" style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-muted)' }}><Wind size={14} /> <span className="text-xs font-medium">풍속</span></div>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{weather.wind || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 우측: 주간 예보 그리드 */}
                <div className="flex flex-col gap-4 h-full">
                  <div className="rounded-2xl p-6 border shadow-sm flex flex-col h-full" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><CalendarIcon size={16} className="text-emerald-500" /> 주간 예보</h3>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>오전/오후 강수확률 · 최저/최고</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {weather.weekly && weather.weekly.length > 0 ? (
                        weather.weekly.map((w, i) => {
                          const isToday = i === 0;
                          return (
                            <div key={i} className="rounded-xl p-4 border flex flex-col items-center justify-center text-center transition-all hover:-translate-y-1 hover:shadow-md" 
                              style={{ 
                                borderColor: isToday ? 'rgba(16,185,129,0.3)' : 'var(--border)', 
                                background: isToday ? 'rgba(16,185,129,0.03)' : 'var(--bg-background)'
                              }}>
                              <p className={`text-sm font-bold ${isToday ? 'text-emerald-600 dark:text-emerald-400' : ''}`} style={{ color: isToday ? '' : 'var(--text-primary)' }}>{isToday ? '오늘' : w.day}</p>
                              <p className="text-[10px] font-medium mb-3" style={{ color: 'var(--text-muted)' }}>{w.date}</p>
                              
                              <div className="flex items-center justify-center gap-4 w-full mb-3">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>오전</span>
                                  <div className="scale-75 origin-center">{weatherIcon(w.amIcon)}</div>
                                  <span className="text-[10px] font-bold text-blue-500">{w.amRain}</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>오후</span>
                                  <div className="scale-75 origin-center">{weatherIcon(w.pmIcon)}</div>
                                  <span className="text-[10px] font-bold text-blue-500">{w.pmRain}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-blue-500">{w.low}°</span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/</span>
                                <span className="text-sm font-bold text-red-500">{w.high}°</span>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="col-span-full py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>주간 예보 정보가 없습니다.</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
