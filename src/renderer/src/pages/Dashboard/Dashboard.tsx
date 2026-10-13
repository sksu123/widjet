import { useEffect, useState, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ZoomIn, ZoomOut, 
  Cloud, Sun, CloudRain, Wind, Droplets, Calendar as CalendarIcon, Clock,
  Bot, CreditCard, Package, Zap, BookOpen, ChevronRight, ChevronLeft,
  TrendingUp, Bell, Utensils, CheckCircle2, Circle, MapPin, RefreshCw, X as XIcon,
  FolderHeart, Edit2, LayoutList, LayoutGrid, Folder, File, Plus, Trash2, Check, Pin
 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns'

import { StickyNote, MemoData } from '../../components/StickyNote'
import FavoritesWidget from '../../components/FavoritesWidget/FavoritesWidget'
import DdayPanel from '../../components/DdayPanel/DdayPanel'
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

interface ConfirmModal {
  open: boolean
  message: string
  onConfirm: () => void
}

const CATEGORIES = [
  { value: 'general', label: '일반' },
  { value: 'exam', label: '시험' },
  { value: 'meeting', label: '회의' },
  { value: 'event', label: '행사' },
  { value: 'finance', label: '재무' },
  { value: 'holiday', label: '휴무' },
]

const getCategoryLabel = (cat: string) => CATEGORIES.find(c => c.value === cat)?.label || '일반'
const getAdminCategoryColor = (cat: string) => {
  switch (cat) {
    case '회계/예산': return '#3b82f6'
    case '인사/노무': return '#8b5cf6'
    case '시설/안전': return '#f59e0b'
    case '급식/보건': return '#10b981'
    case '행정': return '#ec4899'
    default: return '#6b7280'
  }
}

const RealtimeClock = () => {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="flex flex-col items-end">
      <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {format(now, 'HH:mm:ss')}
      </p>
      <p className=" font-medium" style={{ color: 'var(--text-muted)' }}>
        {format(now, 'yyyy. MM. dd. (EEE)', { locale: ko })}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherSummary, setWeatherSummary] = useState('')
  const [weatherSummaryLoading, setWeatherSummaryLoading] = useState(false)
  const weatherSummaryCacheRef = useRef<Record<string, string>>({})
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([])
  const [ddays, setDdays] = useState<Schedule[]>([])
  const [monthSchedules, setMonthSchedules] = useState<Schedule[]>([])
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
  
  const [memos, setMemos] = useState<MemoData[]>([])
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({ open: false, message: '', onConfirm: () => {} })
  
  // 레이아웃 추가 상태
  const [showSchoolScheduleInCalendar, setShowSchoolScheduleInCalendar] = useState(true)
  const [showAdminScheduleInCalendar, setShowAdminScheduleInCalendar] = useState(true)
  const [rightTab, setRightTab] = useState<'todo' | 'school'>('todo')

  // 행정달력 일정
  const [adminMonthSchedules, setAdminMonthSchedules] = useState<{id:number;title:string;date:string;category:string;is_deadline:number}[]>([])
  const [adminTodaySchedules, setAdminTodaySchedules] = useState<{id:number;title:string;date:string;category:string;is_deadline:number}[]>([])

  // 연락처 검색
  const [contacts, setContacts] = useState<{id: number; type: 'staff'|'company'; name: string; department?: string; ceo_name?: string; phone: string; mobile?: string; email: string; note: string}[]>([])
  const [staffSearch, setStaffSearch] = useState('')
  const [extSearch, setExtSearch] = useState('')
  const [companySearch, setCompanySearch] = useState('')

  // 캘린더 날짜 hover 팝업
  const [hoveredDay, setHoveredDay] = useState<{
    day: Date;
    daySchedules: Schedule[];
    daySchoolEvents: {eventName: string; isHoliday: boolean}[];
    dayAdminSchedules: {id:number;title:string;date:string;category:string;is_deadline:number}[];
    x: number;
    y: number;
  } | null>(null)
  
  const [widgetsConfig, setWidgetsConfig] = useState({
    weather: true,
    dday: true,
    today: true,
    summary: true,
    quick: true,
    favorites: true,
    memo: true,
    contacts: true
  })

  useEffect(() => {
    loadData()
    if (window.api && (window.api as any).mobile?.onDataChanged) {
      const unsub = (window.api as any).mobile.onDataChanged(() => {
        loadData()
      })
      return () => {
        if (typeof unsub === 'function') unsub()
      }
    }
  }, [])

  // 달 변경 시 해당 달 일정 자동 갱신
  useEffect(() => {
    window.api.calendar.getMonth(scheduleYear, scheduleMonth).then(r => {
      if (r.success) setMonthSchedules(r.data as any[])
    })
    if (window.api.adminCal) {
      window.api.adminCal.get(scheduleYear, scheduleMonth).then(r => {
        if (r.success) setAdminMonthSchedules(r.data as any[])
      })
    }
  }, [scheduleYear, scheduleMonth])

  useEffect(() => {
    if (weather) {
      loadWeatherSummary(weather)
    }
  }, [weather])

  async function loadWeatherSummary(wData: WeatherData) {
    if (!window.api.ai || !(window.api.ai as any).weatherSummary) return;
    
    const cacheKey = `${wData.city}-${wData.temp}-${wData.description}-${wData.pm10}`;
    if (weatherSummaryCacheRef.current[cacheKey]) {
      setWeatherSummary(weatherSummaryCacheRef.current[cacheKey]);
      return;
    }

    setWeatherSummaryLoading(true)
    try {
      const res = await (window.api.ai as any).weatherSummary(wData)
      if (res.success) {
        setWeatherSummary(res.text)
        weatherSummaryCacheRef.current[cacheKey] = res.text;
      }
    } finally {
      setWeatherSummaryLoading(false)
    }
  }

  async function loadData() {
    try {
      const [weatherRes, todayRes, ddayRes, userRes, settingsRes, mealRes, contactsRes] = await Promise.all([
        window.api.calendar.getWeather(),
        window.api.calendar.getToday(),
        window.api.calendar.getDday(),
        window.api.db.getUser(),
        window.api.db.getSettings(),
        window.api.calendar.getMeal ? window.api.calendar.getMeal() : Promise.resolve({ success: false, error: 'NEIS_NOT_CONFIGURED' }),
        window.api.db.getContacts ? window.api.db.getContacts() : Promise.resolve({ success: true, data: [] })
      ])

      if (weatherRes.success) setWeather(weatherRes.data as WeatherData)
      if (todayRes.success) setTodaySchedules(todayRes.data as Schedule[])
      // 이달 전체 일정 (캘린더 표시용)
      const monthRes = await window.api.calendar.getMonth(
        new Date().getFullYear(),
        new Date().getMonth() + 1
      )
      if (monthRes.success) setMonthSchedules(monthRes.data as Schedule[])
      if (ddayRes.success) setDdays(ddayRes.data as Schedule[])
      if (userRes.success) setUser(userRes.data as User)
      
      if (settingsRes.success) {
        const s = settingsRes.data as Record<string, string>
        if (s.dashboard_widgets) {
          try { const saved = JSON.parse(s.dashboard_widgets); setWidgetsConfig(prev => ({ ...prev, ...saved })); } catch(e) {}
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


      if (contactsRes && contactsRes.success) {
        setContacts(contactsRes.data as any[])
      }

      loadMemos()

      // 학사일정 초기 로드
      const y = new Date().getFullYear()
      const m = new Date().getMonth() + 1
      loadSchoolSchedule(y, m)

      // 행정달력 일정 로드
      if (window.api.adminCal) {
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const [adminMonthRes, adminTodayRes] = await Promise.all([
          window.api.adminCal.get(y, m),
          window.api.adminCal.getAll(y, undefined, undefined)
        ])
        if (adminMonthRes.success) setAdminMonthSchedules(adminMonthRes.data as any[])
        if (adminTodayRes.success) setAdminTodaySchedules((adminTodayRes.data as any[]).filter((s: any) => s.date === todayStr))
      }

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


  async function loadMemos() {
    if (!window.api.db.getMemos) return
    const res = await window.api.db.getMemos()
    if (res.success) setMemos(res.data as MemoData[])
  }

  const isAddingMemo = useRef(false)

  async function handleAddMemo(x?: number, y?: number) {
    if (!window.api.db.addMemo) return
    // 연속 더블클릭으로 여러 장 생성 방지
    if (isAddingMemo.current) return
    isAddingMemo.current = true
    setTimeout(() => { isAddingMemo.current = false }, 600)

    const newZIndex = memos.length > 0 ? Math.max(...memos.map(m => m.z_index)) + 1 : 10

    let offsetX = 8
    let offsetY = 8
    
    if (memos.length > 0) {
      // 기존 메모가 있을 때, 가장 최근에 추가된 메모(또는 배열 마지막 메모) 옆에 배치
      const lastMemo = memos[memos.length - 1]
      offsetX = (lastMemo.x || 8) + 230 // 기존 메모 너비(220) + 여백(10)
      offsetY = lastMemo.y || 8
      
      // 화면 오른쪽 끝을 넘어갈 경우 적절히 처리 (선택사항, 일단은 무조건 오른쪽에 추가)
    }

    const res = await window.api.db.addMemo({
      title: '', content: '', color: '#fef08a',
      x: x !== undefined ? x : offsetX,
      y: y !== undefined ? y : offsetY,
      width: 220, height: 130, z_index: newZIndex, is_pinned: 0
    })
    if (res.success) loadMemos()
  }

  async function handleUpdateMemo(id: number, data: Partial<MemoData>) {
    if (!window.api.db.updateMemo) return
    setMemos(prev => prev.map(m => m.id === id ? { ...m, ...data } : m))
    await window.api.db.updateMemo(id, data)
  }

  function handleDeleteMemo(id: number) {
    if (!window.api.db.deleteMemo) return
    setConfirmModal({
      open: true,
      message: '메모를 삭제하시겠습니까?',
      onConfirm: async () => {
        await window.api.db.deleteMemo!(id)
        loadMemos()
      }
    })
  }

  function handleClearMemos() {
    if (!window.api.db.deleteMemo) return
    if (memos.length === 0) return
    setConfirmModal({
      open: true,
      message: '보드에 있는 모든 메모를 일괄 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      onConfirm: async () => {
        if ((window.api.db as any).clearMemos) {
          await (window.api.db as any).clearMemos()
        } else {
          await Promise.all(memos.map(m => window.api.db.deleteMemo!(m.id)))
        }
        loadMemos()
      }
    })
  }

  const closeConfirmModal = useCallback(() => {
    setConfirmModal({ open: false, message: '', onConfirm: () => {} })
  }, [])

  const handleConfirmOk = useCallback(async () => {
    const fn = confirmModal.onConfirm
    closeConfirmModal()
    await fn()
  }, [confirmModal.onConfirm, closeConfirmModal])


  async function handleFocusMemo(id: number) {
    const target = memos.find(m => m.id === id)
    if (!target) return
    const maxZ = Math.max(...memos.map(m => m.z_index), 10)
    if (target.z_index < maxZ) {
      handleUpdateMemo(id, { z_index: maxZ + 1 })
    }
  }

  const toggleSchedule = async (id: number, currentCompleted: number) => {
    const nextVal = currentCompleted === 1 ? 0 : 1
    setTodaySchedules(prev => prev.map(s => s.id === id ? { ...s, is_completed: nextVal } : s))
    if (window.api.calendar.toggleScheduleStatus) {
      await window.api.calendar.toggleScheduleStatus(id, nextVal)
    }
    if ((window.api as any).mobile?.notifyChange) {
      (window.api as any).mobile.notifyChange()
    }
  }

  const weatherIcon = (icon: string) => {
    if (icon?.includes('01')) return <Sun size={32} className="text-yellow-400" />
    if (icon?.includes('09') || icon?.includes('10')) return <CloudRain size={32} className="text-blue-400" />
    return <Cloud size={32} className="text-slate-400" />
  }

  return (
    <>
      {/* ── 커스텀 확인 모달 (confirm() 대체 – 키보드 먹통 방지) ── */}
      {confirmModal.open && (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 99999, background: 'rgba(0,0,0,0.45)' }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeConfirmModal() }}
        >
          <div
            className="rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minWidth: 280, maxWidth: 380 }}
          >
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
              {confirmModal.message}
            </p>
            <div className="flex justify-end gap-2">
              <button
                autoFocus
                onClick={closeConfirmModal}
                className="px-4 py-1.5 rounded-lg text-sm transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >
                취소
              </button>
              <button
                onClick={handleConfirmOk}
                className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors bg-red-500 hover:bg-red-600 text-white"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2 lg:gap-4 min-h-full fade-in pb-4">
      {/* ==================================================== */}
      {/* 좌측 패널: 대형 캘린더 (화면의 약 60~65% 차지) */}
      {/* ==================================================== */}
      <div className="flex-1 flex flex-col gap-2 lg:gap-4 min-w-0">
        <div className="flex-1 flex flex-col rounded-2xl border p-3 lg:p-4 xl:p-5 shadow-sm min-h-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        {/* 캘린더 헤더 */}
        <div className="flex flex-wrap items-center justify-start gap-2 mb-3 lg:mb-5">
          <div className="flex items-center gap-1">
            <button onClick={() => {
              const prevDate = new Date(scheduleYear, scheduleMonth - 2, 1)
              setScheduleYear(prevDate.getFullYear())
              setScheduleMonth(prevDate.getMonth() + 1)
              loadSchoolSchedule(prevDate.getFullYear(), prevDate.getMonth() + 1)
              window.api.calendar.getMonth(prevDate.getFullYear(), prevDate.getMonth() + 1).then(r => { if(r.success) setMonthSchedules(r.data as Schedule[]) })
            }} className="p-1.5 rounded-lg transition-colors" style={{ background: 'transparent' }} onMouseOver={e=>e.currentTarget.style.background='rgba(0,0,0,0.05)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}>
              <ChevronLeft size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
            <span className="text-base lg:text-xl font-bold min-w-[80px] lg:min-w-[100px] text-center" style={{ color: 'var(--text-primary)' }}>
              {scheduleYear}년 {scheduleMonth}월
            </span>
            <button onClick={() => {
              const nextDate = new Date(scheduleYear, scheduleMonth, 1)
              setScheduleYear(nextDate.getFullYear())
              setScheduleMonth(nextDate.getMonth() + 1)
              loadSchoolSchedule(nextDate.getFullYear(), nextDate.getMonth() + 1)
              window.api.calendar.getMonth(nextDate.getFullYear(), nextDate.getMonth() + 1).then(r => { if(r.success) setMonthSchedules(r.data as Schedule[]) })
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
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border ml-2" style={{ background: 'rgba(0,0,0,0.03)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>학사일정 표시</span>
            <button 
              onClick={() => setShowSchoolScheduleInCalendar(!showSchoolScheduleInCalendar)}
              className={`w-8 h-4 rounded-full transition-colors relative ${showSchoolScheduleInCalendar ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${showSchoolScheduleInCalendar ? 'left-4' : 'left-0.5'}`} />
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border" style={{ background: 'rgba(0,0,0,0.03)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>행정일정 표시</span>
            <button 
              onClick={() => setShowAdminScheduleInCalendar(!showAdminScheduleInCalendar)}
              className={`w-8 h-4 rounded-full transition-colors relative ${showAdminScheduleInCalendar ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${showAdminScheduleInCalendar ? 'left-4' : 'left-0.5'}`} />
            </button>
          </div>
        </div>

        {/* 캘린더 그리드 */}
        <div className="flex-1 flex flex-col">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-1 lg:mb-2">
            {['일','월','화','수','목','금','토'].map((d, i) => (
              <div key={d} className="text-center font-bold text-xs lg:text-sm py-1" style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#3b82f6' : 'var(--text-muted)' }}>
                {d}
              </div>
            ))}
          </div>
          
          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-1 lg:gap-2 flex-1" style={{ gridAutoRows: 'minmax(65px, auto)' }}>
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
                const daySchedules = monthSchedules.filter(s => isSameDay(new Date(s.start_date), day))
                
                // 해당 날짜의 행정달력 일정
                const dayAdminSchedules = adminMonthSchedules.filter(s => s.date === format(day, 'yyyy-MM-dd'))
                
                // 해당 날짜의 학사일정
                const dateString = format(day, 'yyyyMMdd')
                const daySchoolEvents = schoolEvents.filter(e => e.date === dateString)

                
                const isSunday = day.getDay() === 0
                const isSaturday = day.getDay() === 6
                const isHoliday = daySchoolEvents.some(e => e.isHoliday)

                return (
                  <div key={idx} 
                    className={`rounded-lg lg:rounded-xl p-1 lg:p-2 border flex flex-col transition-colors ${isTodayFlag ? 'ring-2 ring-blue-500 ring-offset-1' : ''} ${isCurrentMonth ? 'hover:shadow-md' : ''}`}
                    style={{ 
                      background: isCurrentMonth ? 'rgba(0,0,0,0.015)' : 'rgba(0,0,0,0.03)',
                      borderColor: isTodayFlag ? 'rgba(59,130,246,0.3)' : 'var(--border)',
                      opacity: isCurrentMonth ? 1 : 0.4,
                      cursor: isCurrentMonth ? 'pointer' : 'default'
                    }}
                    onClick={() => {
                      if (!isCurrentMonth) return
                      navigate('/calendar', { state: { addScheduleDate: format(day, 'yyyy-MM-dd') } })
                    }}
                    onMouseEnter={(e) => {
                      if (!isCurrentMonth) return
                      if (daySchedules.length === 0 && daySchoolEvents.length === 0 && dayAdminSchedules.length === 0) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      setHoveredDay({
                        day,
                        daySchedules,
                        daySchoolEvents,
                        dayAdminSchedules,
                        x: rect.left + rect.width / 2,
                        y: rect.top
                      })
                    }}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* 날짜 텍스트 */}
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-xs lg:text-sm font-bold w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center rounded-full ${isTodayFlag ? 'bg-blue-500 text-white' : ''}`}
                        style={{ color: isTodayFlag ? 'white' : (isSunday || isHoliday) ? '#ef4444' : isSaturday ? '#3b82f6' : 'var(--text-primary)' }}>
                        {format(day, 'd')}
                      </span>
                    </div>

                    {/* 일정 목록 (스크롤 숨김 처리) */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1" style={{ maxHeight: 'calc(100% - 24px)', scrollbarWidth: 'none' }}>
                      {/* 내 일정 */}
                      {daySchedules.map((s, i) => {
                        const isDday = s.title?.startsWith('[D-DAY]')
                        const displayTitle = isDday ? s.title.replace('[D-DAY] ', '') : s.title
                        return (
                          <div key={`my-${i}`} className=" truncate px-1.5 py-0.5 rounded font-bold"
                            style={{ 
                              background: isDday ? 'rgba(124,58,237,0.15)' : `${s.color}20`, 
                              color: isDday ? '#7c3aed' : (s.color || 'var(--text-primary)'),
                              border: isDday ? '1px solid rgba(124,58,237,0.4)' : 'none',
                              fontSize: '10px'
                            }}>
                            {isDday ? '🚩 ' : <span className="w-1 h-1 inline-block rounded-full mr-1 align-middle" style={{ background: s.color }}/>}
                            {isDday ? displayTitle : <><span className="font-bold mr-1 opacity-80">({getCategoryLabel(s.category)})</span>{s.title}</>}
                          </div>
                        )
                      })}
                      
                      {/* 학사일정 */}
                      {daySchoolEvents.filter(ev => showSchoolScheduleInCalendar || ev.isHoliday).map((ev, i) => (
                        <div key={`sc-${i}`} className=" truncate px-1.5 py-0.5 rounded"
                          style={{ background: ev.isHoliday ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)', color: ev.isHoliday ? '#ef4444' : 'var(--text-muted)', fontSize: '10px' }}>
                          {ev.eventName}
                        </div>
                      ))}
                      {/* 행정달력 일정 */}
                      {showAdminScheduleInCalendar && dayAdminSchedules.slice(0, 2).map((s, i) => (
                        <div key={`adm-${i}`} className="truncate px-1.5 py-0.5 rounded"
                          style={{ background: s.is_deadline === 1 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.12)', color: s.is_deadline === 1 ? '#ef4444' : '#d97706', fontSize: '10px', fontWeight: 600 }}>
                          {s.is_deadline === 1 ? '⚑ ' : '📋 '}{s.title}
                        </div>
                      ))}
                      {showAdminScheduleInCalendar && dayAdminSchedules.length > 2 && (
                        <div style={{ fontSize: '9px', color: '#d97706', paddingLeft: 2 }}>+{dayAdminSchedules.length - 2}개 행정</div>
                      )}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* 캘린더 날짜 hover 팝업 (fixed - 레이아웃 흔들림 없음) */}
        {hoveredDay && (() => {
          const filteredSchool = hoveredDay.daySchoolEvents.filter(ev => showSchoolScheduleInCalendar || ev.isHoliday)
          const filteredAdmin = showAdminScheduleInCalendar ? hoveredDay.dayAdminSchedules : []
          const totalItems = hoveredDay.daySchedules.length + filteredSchool.length + filteredAdmin.length
          const popupH = 48 + totalItems * 28
          const spaceBelow = window.innerHeight - hoveredDay.y
          const showBelow = spaceBelow > popupH + 12
          return (
            <div
              className="fixed z-[9999] pointer-events-none"
              style={{
                left: Math.min(hoveredDay.x - 100, window.innerWidth - 220),
                top: showBelow ? hoveredDay.y + 8 : hoveredDay.y - popupH - 8,
                width: 200
              }}
            >
              <div className="rounded-xl shadow-2xl overflow-hidden"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                {/* 팝업 헤더 */}
                <div className="px-3 py-2 font-bold text-xs"
                  style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {format(hoveredDay.day, 'M월 d일 (EEE)', { locale: ko })} 일정
                </div>
                <div className="p-2 space-y-1.5">
                  {/* 내 일정 */}
                  {hoveredDay.daySchedules.map((s, i) => (
                    <div key={`p-my-${i}`} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
                      style={{ background: `${s.color}18`, color: 'var(--text-primary)' }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="truncate">
                        <span className="font-bold mr-1 opacity-80" style={{ color: s.color }}>({getCategoryLabel(s.category)})</span>
                        {s.title}
                      </span>
                    </div>
                  ))}
                  {/* 학사일정 */}
                  {filteredSchool.map((ev, i) => (
                    <div key={`p-sc-${i}`} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
                      style={{ background: ev.isHoliday ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)', color: ev.isHoliday ? '#ef4444' : 'var(--text-secondary)' }}>
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: ev.isHoliday ? '#ef4444' : '#94a3b8' }} />
                      <span className="truncate">{ev.eventName}</span>
                    </div>
                  ))}
                  {/* 행정달력 일정 */}
                  {filteredAdmin.map((s, i) => {
                    const catColor = getAdminCategoryColor(s.category)
                    return (
                      <div key={`p-adm-${i}`} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg"
                        style={{ background: s.is_deadline === 1 ? 'rgba(239,68,68,0.1)' : `${catColor}18`, color: s.is_deadline === 1 ? '#ef4444' : 'var(--text-primary)' }}>
                        <span className="shrink-0 font-bold" style={{ fontSize: 13, color: s.is_deadline === 1 ? '#ef4444' : catColor }}>{s.is_deadline === 1 ? '⚑' : '📋'}</span>
                        <span className="truncate">
                          <span className="font-bold mr-1 opacity-80" style={{ color: catColor }}>[{s.category}]</span>
                          {s.title}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })()}
      </div>
      </div>

      {/* ==================================================== */}
      {/* 우측 패널: 위젯 모음 (화면의 약 35~40% 차지) */}
      {/* ==================================================== */}
      <div className="w-[300px] lg:w-[350px] xl:w-[400px] flex-shrink-0 flex flex-col gap-2 lg:gap-4 pr-1">
        
        {/* 1. 사용자 정보 및 날씨/시간 (가장 상단 고정) */}
        <div className="p-3 lg:p-4 xl:p-5 rounded-2xl flex-shrink-0 flex flex-col gap-2 lg:gap-3 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(20,184,166,0.05))', border: '1px solid rgba(59,130,246,0.2)' }}>
          
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{user.school_name} · {user.department}</p>
              <p className="text-sm lg:text-base font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{user.name}님, 안녕하세요!</p>
            </div>
            <div className="text-right">
              <RealtimeClock />
            </div>
          </div>

          {widgetsConfig.weather && weather && (
            <>
            <div className="mt-1 lg:mt-2 flex items-center justify-between rounded-xl p-2 lg:p-3 cursor-pointer transition-colors"
                 onClick={() => setShowWeatherModal(true)}
                 style={{ border: '1px solid var(--border)', background: 'rgba(0,0,0,0.05)' }}>
              <div className="flex items-center gap-2 lg:gap-3">
                <div className="scale-110">{weatherIcon(weather.icon)}</div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg lg:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{weather.temp}°C</span>
                    <span className="text-[11px] font-medium px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.2)', color: '#60a5fa' }}>{weather.description}</span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{weather.city}</p>
                </div>
              </div>
              <div className="text-right space-y-1">
                <p className=" font-medium flex justify-end items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <span className={`w-2 h-2 rounded-full ${parseInt(weather.pm10) > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}></span> 미세 {weather.pm10 || '-'}
                </p>
                <p className=" font-medium flex justify-end items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <span className={`w-2 h-2 rounded-full ${parseInt(weather.pm25) > 35 ? 'bg-red-500' : 'bg-emerald-500'}`}></span> 초미세 {weather.pm25 || '-'}
                </p>
              </div>
            </div>
            
            {/* AI 날씨 요약 한줄 배치 */}
            <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors" 
                 style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.1)' }}
                 onClick={() => setShowWeatherModal(true)}>
              <Bot size={12} className="text-blue-500 shrink-0" />
              <p className="text-[10.5px] truncate font-medium" style={{ color: 'var(--text-secondary)' }} title={weatherSummaryLoading ? '요약 중...' : weatherSummary}>
                {weatherSummaryLoading ? 'AI 행정 날씨 브리핑 작성 중...' : (weatherSummary || '날씨 정보가 업데이트되었습니다.')}
              </p>
            </div>
            </>
          )}
          
          {/* 장식용 블러 원 */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* 2. 오늘의 급식 */}
        <div className="card flex-shrink-0 flex flex-col p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <Utensils size={14} className="text-orange-500" /> 오늘의 급식
            </h3>
            {mealError !== 'NEIS_NOT_CONFIGURED' && (
              <div className="flex items-center rounded-lg border" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.05)' }}>
                <button onClick={() => { const next = mealDayOffset - 1; setMealDayOffset(next); loadMeal(next) }} className="p-1 rounded-l-lg transition-colors" style={{ background:'transparent' }} onMouseOver={e=>e.currentTarget.style.background='rgba(0,0,0,0.1)'} onMouseOut={e=>e.currentTarget.style.background='transparent'}><ChevronLeft size={14} style={{ color: 'var(--text-muted)' }}/></button>
                <span className=" font-semibold w-12 text-center" style={{ color: 'var(--text-primary)' }}>
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
                <button onClick={() => navigate('/settings')} className=" font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(249,115,22,0.1)', color: '#ea580c' }}>설정하기</button>
              </div>
            ) : mealLoading ? (
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>불러오는 중...</p>
            ) : mealError ? (
              <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>{mealError}</p>
            ) : meals.length === 0 ? (
              <p className="text-[11px] text-center" style={{ color: 'var(--text-muted)' }}>급식 정보가 없습니다.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {/* 아침/점심/저녁 탭 선택 */}
                <div className="flex items-center gap-1.5 mb-1">
                  {meals.map(m => {
                    const emoji = m.type === '1' ? '🌅' : m.type === '2' ? '☀️' : '🌙'
                    const isSelected = selectedMealTypes.includes(m.type)
                    const accentColor = m.type === '1' ? '#f59e0b' : m.type === '2' ? '#f97316' : '#6366f1'
                    return (
                      <button
                        key={m.type}
                        onClick={() => setSelectedMealTypes([m.type])}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
                        style={{
                          background: isSelected ? `${accentColor}22` : 'rgba(0,0,0,0.05)',
                          color: isSelected ? accentColor : 'var(--text-muted)',
                          border: `1.5px solid ${isSelected ? accentColor : 'transparent'}`,
                          boxShadow: isSelected ? `0 0 0 1px ${accentColor}44` : 'none'
                        }}
                      >
                        {emoji} {m.typeName}
                      </button>
                    )
                  })}
                </div>

                {/* 선택된 급식 메뉴 */}
                {meals.filter(m => selectedMealTypes.includes(m.type)).map(m => (
                  <div key={m.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        {m.type === '1' ? '🌅' : m.type === '2' ? '☀️' : '🌙'} {m.typeName}
                      </span>
                      {m.kcal && (
                        <span className=" font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(249,115,22,0.1)', color: '#ea580c' }}>
                          {m.kcal}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] leading-relaxed pl-1 space-y-0.5 max-h-[120px] overflow-y-auto pr-1"
                      style={{ color: 'var(--text-secondary)', scrollbarWidth: 'thin' }}>
                      {m.menus.map((menu, i) => <div key={i}>{menu}</div>)}
                    </div>
                  </div>
                ))}
                {meals.filter(m => selectedMealTypes.includes(m.type)).length === 0 && (
                  <p className=" text-center py-2" style={{ color: 'var(--text-muted)' }}>선택된 급식이 없습니다.</p>
                )}
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
              <>
                {todaySchedules.length === 0 && adminTodaySchedules.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-50 py-6">
                    <CheckCircle2 size={24} className="mb-2" style={{ color: 'var(--text-muted)' }} />
                    <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>오늘 일정이 없습니다</p>
                  </div>
                ) : (
                  <>
                    {todaySchedules.map((s) => (
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
                            <span className="font-bold mr-1 opacity-80" style={{ color: s.color }}>({getCategoryLabel(s.category)})</span>
                            {s.title}
                          </p>
                        </div>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color || '#3b82f6' }} />
                      </div>
                    ))}
                    {/* 행정달력 오늘 일정 */}
                    {adminTodaySchedules.map((s) => {
                      const catColor = getAdminCategoryColor(s.category)
                      return (
                        <div key={`adm-${s.id}`} className="flex items-center gap-3 p-2.5 rounded-lg border transition-all"
                          style={{ borderColor: s.is_deadline === 1 ? 'rgba(239,68,68,0.3)' : `${catColor}44`, background: s.is_deadline === 1 ? 'rgba(239,68,68,0.05)' : `${catColor}11` }}>
                          <span style={{ fontSize: 14, color: s.is_deadline === 1 ? '#ef4444' : catColor }}>{s.is_deadline === 1 ? '⚑' : '📋'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: s.is_deadline === 1 ? '#ef4444' : 'var(--text-primary)' }}>
                              <span className="font-bold mr-1 opacity-80" style={{ color: catColor }}>[{s.category}]</span>
                              {s.title}
                            </p>
                          </div>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.is_deadline === 1 ? '#ef4444' : catColor }} />
                        </div>
                      )
                    })}
                  </>
                )}
              </>
            )}

            {rightTab === 'school' && (
              scheduleError === 'NEIS_NOT_CONFIGURED' ? (
                <div className="flex flex-col items-center justify-center h-full py-6">
                  <p className="text-[11px] mb-2" style={{ color: 'var(--text-secondary)' }}>나이스(NEIS) 연동이 필요합니다.</p>
                  <button onClick={() => navigate('/settings')} className=" font-medium px-3 py-1 rounded-full" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}>설정하기</button>
                </div>
              ) : schoolEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-6">
                  <CalendarIcon size={24} className="mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>이번 달 학사일정이 없습니다.</p>
                </div>
              ) : (
                <div
                  className="overflow-y-auto space-y-1 pr-1"
                  style={{
                    maxHeight: '288px',  /* 8줄 × 36px */
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--border) transparent'
                  }}
                >
                  {schoolEvents.map((ev, i) => {
                    const d = ev.date
                    const mo = parseInt(d.substring(4, 6), 10)
                    const da = parseInt(d.substring(6, 8), 10)
                    const dayOfWeek = new Date(parseInt(d.substring(0, 4), 10), mo - 1, da).getDay()
                    const dayNames = ['일','월','화','수','목','금','토']
                    const isRed = ev.isHoliday || dayOfWeek === 0 || dayOfWeek === 6

                    return (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: isRed ? 'rgba(239,68,68,0.05)' : 'transparent', border: isRed ? '1px solid rgba(239,68,68,0.1)' : '1px solid transparent' }}>
                        <span className="text-[11px] font-bold w-12 shrink-0 text-center" style={{ color: isRed ? '#ef4444' : 'var(--accent-blue)' }}>
                          {mo}/{da}({dayNames[dayOfWeek]})
                        </span>
                        <span className="text-[11px] font-medium" style={{ color: isRed ? '#ef4444' : 'var(--text-primary)' }}>
                          {ev.eventName}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </div>

              </div>

            
      {/* ============================================================ */}
      {/* [3단] 우측 패널: 즐겨찾기, 메모 보드, 연락처 검색 (30%) */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {/* 파일/폴더 즐겨찾기 */}
        {widgetsConfig.favorites && (
          <div className="card flex flex-col flex-1 min-h-[250px] p-4" style={{ overflow: 'hidden' }}>
            <FavoritesWidget isWidget={true} />
          </div>
        )}

        {/* 메모 보드 */}
        {/* D-DAY + 메모 보드 나란히 배치 */}
        <div className="flex gap-3 flex-1 min-h-[300px]">
          {/* D-DAY 패널 */}
          <div className="flex-1 min-w-0">
            <DdayPanel onDdayChange={() => {
              // D-DAY 추가/수정/삭제 시 이달 일정 갱신
              window.api.calendar.getMonth(scheduleYear, scheduleMonth).then(r => {
                if (r.success) setMonthSchedules(r.data as any[])
              })
            }} />
          </div>

          {/* 메모 보드 */}
          {widgetsConfig.memo && (
            <div className="flex-1 card flex flex-col p-4 relative overflow-hidden min-w-0">
              <div className="flex items-center justify-between mb-2 z-10 relative">
                <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Pin size={14} className="text-orange-500" /> 메모 보드
                  <span className="text-[10px] font-normal ml-2 hidden sm:inline" style={{ color: 'var(--text-muted)' }}>빈 공간 더블 클릭: 추가</span>
                </h3>
                {memos.length > 0 && (
                  <button
                    onClick={handleClearMemos}
                    className="text-[11px] px-2 py-1 rounded transition-colors flex items-center gap-1"
                    style={{ color: 'var(--text-secondary)', background: 'var(--bg-elevated)' }}
                    title="모든 메모를 일괄 삭제합니다"
                  >
                    <Trash2 size={12} /> 모두 지우기
                  </button>
                )}
              </div>
              
              <div
                className="flex-1 relative w-full h-full memo-container"
                onDoubleClick={(e) => {
                  const target = e.target as HTMLElement
                  const isMemoCard = target.closest('.absolute')
                  if (isMemoCard) return
                  if (e.target === e.currentTarget) {
                    const rect = e.currentTarget.getBoundingClientRect()
                    handleAddMemo(e.clientX - rect.left, e.clientY - rect.top)
                  }
                }}
              >
                {memos.map(memo => (
                  <StickyNote
                    key={memo.id}
                    memo={memo}
                    onUpdate={handleUpdateMemo}
                    onDelete={handleDeleteMemo}
                    onFocus={handleFocusMemo}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 주요 연락처 검색 (좌우 분할 배치) */}
        {widgetsConfig.contacts && (
          <div className="flex gap-3">
            {/* 교직원 연락처 */}
            <div className="card flex-1 flex flex-col p-3 shrink-0 relative" style={{ overflow: 'visible', zIndex: staffSearch ? 50 : 1 }}>
              <div className="flex items-center gap-1 mb-2">
                <span style={{ fontSize: '1.1em' }}>📞</span> 
                <h3 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>교직원 검색</h3>
              </div>
              
              <div className="relative">
                <input type="text" placeholder="이름" 
                  className="w-full pl-7 pr-6 py-1 text-[11px] rounded-md border outline-none transition-colors focus:ring-1 focus:ring-blue-500"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 ">🔍</span>
                {staffSearch && (
                  <button onClick={() => setStaffSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <XIcon size={10} />
                  </button>
                )}
              </div>

              {staffSearch && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 w-[280px] z-[100] rounded-xl shadow-2xl border p-2 overflow-y-auto max-h-[300px]" 
                     style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', backdropFilter: 'blur(10px)' }}>
                  {(() => {
                    const term = staffSearch.toLowerCase();
                    const getChosung = (str: string) => {
                      const chosung = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
                      let result = "";
                      for(let i=0; i<str.length; i++) {
                        const code = str.charCodeAt(i) - 44032;
                        if(code > -1 && code < 11172) result += chosung[Math.floor(code / 588)];
                        else result += str.charAt(i);
                      }
                      return result;
                    }
                    const termChosung = getChosung(term);
                    const matchString = (str?: string) => (str || '').toLowerCase().includes(term) || getChosung(str || '').includes(termChosung);

                    const filtered = contacts.filter(c => c.type === 'staff' && (
                      matchString(c.name) || matchString(c.phone) || matchString(c.mobile) || matchString(c.note)
                    ));

                    if (filtered.length === 0) {
                      return <div className="py-4 text-center text-xs text-gray-500">검색 결과가 없습니다.</div>;
                    }

                    return filtered.map(c => (
                      <div key={c.id} className="p-3 mb-1.5 last:mb-0 rounded-lg hover:bg-white/5 transition-colors cursor-default" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                        <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{c.name}</div>
                        <div className="flex items-center gap-2 mt-1.5 text-xs">
                          {c.department && <span style={{ color: 'var(--text-muted)' }}>{c.department}</span>}
                          {c.phone && <span className="text-[11px] font-mono" style={{ color: 'var(--accent-blue)' }}>내선: {c.phone}</span>}
                          {c.mobile && <span className="text-[11px] font-mono" style={{ color: 'var(--accent-mint)' }}>{c.mobile}</span>}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            {/* 업체 연락처 */}
            <div className="card flex-1 flex flex-col p-3 shrink-0 relative" style={{ overflow: 'visible', zIndex: companySearch ? 50 : 1 }}>
              <div className="flex items-center gap-1 mb-2">
                <span style={{ fontSize: '1.1em' }}>🏢</span> 
                <h3 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>업체 검색</h3>
              </div>
              
              <div className="relative">
                <input type="text" placeholder="상호/대표명" 
                  className="w-full pl-7 pr-6 py-1 text-[11px] rounded-md border outline-none transition-colors focus:ring-1 focus:ring-blue-500"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                />
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 ">🔍</span>
                {companySearch && (
                  <button onClick={() => setCompanySearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                    <XIcon size={10} />
                  </button>
                )}
              </div>

            {companySearch && (
              <div className="absolute bottom-[calc(100%+8px)] left-0 w-[280px] z-[100] rounded-xl shadow-2xl border p-2 overflow-y-auto max-h-[300px]" 
                   style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', backdropFilter: 'blur(10px)' }}>
                {(() => {
                  const term = companySearch.toLowerCase();
                  const getChosung = (str: string) => {
                    const chosung = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
                    let result = "";
                    for(let i=0; i<str.length; i++) {
                      const code = str.charCodeAt(i) - 44032;
                      if(code > -1 && code < 11172) result += chosung[Math.floor(code / 588)];
                      else result += str.charAt(i);
                    }
                    return result;
                  }
                  const termChosung = getChosung(term);
                  const matchString = (str?: string) => (str || '').toLowerCase().includes(term) || getChosung(str || '').includes(termChosung);

                  const filtered = contacts.filter(c => c.type === 'company' && (
                    matchString(c.name) || matchString(c.ceo_name) || matchString(c.phone) || matchString(c.mobile) || matchString(c.email) || matchString(c.note)
                  ));

                  if (filtered.length === 0) {
                    return <div className="py-4 text-center text-xs text-gray-500">검색 결과가 없습니다.</div>;
                  }

                  return filtered.map(c => (
                    <div key={c.id} className="p-3 mb-1.5 last:mb-0 rounded-lg hover:bg-white/5 transition-colors cursor-default" style={{ border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                      <div className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        {c.name}
                        {c.ceo_name && <span className=" font-normal" style={{ color: 'var(--text-muted)' }}>({c.ceo_name})</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                        {c.phone && <span className="text-[11px] font-mono" style={{ color: 'var(--accent-blue)' }}>☎ {c.phone}</span>}
                        {c.mobile && <span className="text-[11px] font-mono" style={{ color: 'var(--accent-mint)' }}>📱 {c.mobile}</span>}
                      </div>
                      {c.email && <div className=" mt-1" style={{ color: 'var(--text-secondary)' }}>✉ {c.email}</div>}
                    </div>
                  ));
                })()}
              </div>
            )}
          </div>
         </div>
        )}
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
                  <div className="rounded-2xl p-6 flex flex-col items-center justify-center border shadow-sm relative overflow-hidden h-full" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-3 mb-2 mt-4">
                      <div className="scale-[1.5] origin-center">{weatherIcon(weather.icon)}</div>
                      <p className="text-5xl font-bold tracking-tighter" style={{ color: 'var(--text-primary)' }}>{weather.temp}°C</p>
                    </div>
                    <p className="text-sm font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>{weather.description}</p>
                    <div className="flex items-center gap-1.5 text-xs font-medium mb-6 px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' }}>
                      <MapPin size={12} /> {weather.city}
                    </div>

                    <div className="w-full flex flex-col gap-2 text-sm px-2 mb-4">
                      <div className="flex justify-between p-2.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>체감온도</span>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{weather.feels_like}</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>강수확률</span>
                        <span className="font-bold text-blue-500">{weather.wind}</span>
                      </div>
                      <div className="flex justify-between p-2.5 rounded-lg" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>습도</span>
                        <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{weather.humidity}</span>
                      </div>
                    </div>
                    
                    {/* Air Quality Mini tags */}
                    <div className="flex gap-2  w-full justify-center">
                      <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-medium border border-green-100">미세 {weather.pm10}</span>
                      <span className="px-2 py-1 rounded bg-green-50 text-green-700 font-medium border border-green-100">초미세 {weather.pm25}</span>
                    </div>

                    {(weather as any).kma && (
                      <div className="mt-4 p-3 rounded-lg text-[11px] w-full text-center font-bold shadow-sm" style={{ background: 'rgba(59,130,246,0.08)', color: '#2563eb' }}>
                        📢 {(weather as any).kma}
                      </div>
                    )}
                  </div>
                </div>

                {/* 우측: 주간 예보 그리드 */}
                <div className="flex flex-col gap-4 h-full">
                  <div className="rounded-2xl p-5 border shadow-sm flex flex-col h-full" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><CalendarIcon size={16} className="text-emerald-500" /> 주간 예보 (7일)</h3>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 flex-1 items-center">
                      {weather.weekly && weather.weekly.length > 0 ? (
                        weather.weekly.map((w, i) => {
                          const isToday = i === 0;
                          return (
                            <div key={i} className="rounded-xl p-2 border flex flex-col items-center justify-between text-center transition-all h-full" 
                              style={{ 
                                borderColor: isToday ? 'rgba(16,185,129,0.3)' : 'var(--border)', 
                                background: isToday ? 'rgba(16,185,129,0.03)' : 'var(--bg-background)'
                              }}>
                              <p className={`text-xs font-bold mb-3 ${isToday ? 'text-emerald-600' : ''}`} style={{ color: isToday ? '' : 'var(--text-primary)' }}>{isToday ? '오늘' : w.day}</p>
                              
                              <div className="scale-[0.8] origin-center mb-1">{weatherIcon(w.icon || (w as any).amIcon)}</div>
                              <span className=" font-bold text-blue-500 mb-3">{w.rain || (w as any).amRain}</span>
                              
                              <div className="flex flex-col items-center gap-0.5 mt-auto w-full pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                                <span className="text-[11px] font-bold text-red-500">{w.high}°</span>
                                <span className="text-[11px] font-bold text-blue-500">{w.low}°</span>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="col-span-full py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>주간 예보 정보가 없습니다.</div>
                      )}
                    </div>
                  </div>
                </div>              </div>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  )
}
