import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Cloud, Sun, CloudRain, Wind, Droplets, Calendar, Clock,
  Bot, CreditCard, Package, Zap, BookOpen, ChevronRight,
  TrendingUp, Bell
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface WeatherData {
  city: string; temp: number; feels_like: number
  humidity: number; description: string; icon: string; wind_speed: number
}
interface Schedule { id: number; title: string; start_date: string; category: string; color: string; days_left: number }
interface User { name: string; school_name: string; department: string }

export default function Dashboard() {
  const navigate = useNavigate()
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [todaySchedules, setTodaySchedules] = useState<Schedule[]>([])
  const [ddays, setDdays] = useState<Schedule[]>([])
  const [user, setUser] = useState<User>({ name: '관리자', school_name: '○○초등학교', department: '행정실' })
  const [now, setNow] = useState(new Date())
  const [cards, setCards] = useState<{ total: number; available: number; borrowed: number }>({ total: 0, available: 0, borrowed: 0 })
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

  async function loadData() {
    try {
      const [weatherRes, todayRes, ddayRes, userRes, cardsRes, settingsRes] = await Promise.all([
        window.api.calendar.getWeather('Seoul'),
        window.api.calendar.getToday(),
        window.api.calendar.getDday(),
        window.api.db.getUser(),
        window.api.db.getCards(),
        window.api.db.getSettings()
      ])

      if (weatherRes.success) setWeather(weatherRes.data as WeatherData)
      if (todayRes.success) setTodaySchedules(todayRes.data as Schedule[])
      if (ddayRes.success) setDdays(ddayRes.data as Schedule[])
      if (userRes.success) setUser(userRes.data as User)
      if (cardsRes.success) {
        const c = cardsRes.data as Array<{ is_available: number }>
        setCards({
          total: c.length,
          available: c.filter(x => x.is_available === 1).length,
          borrowed: c.filter(x => x.is_available === 0).length
        })
      }
      if (settingsRes.success) {
        const s = settingsRes.data as Record<string, string>
        if (s.dashboard_widgets) {
          try { setWidgetsConfig(JSON.parse(s.dashboard_widgets)) } catch(e) {}
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const quickLinks = [
    { label: 'AI 행정비서', icon: Bot, path: '/ai', color: '#8b5cf6', desc: '업무 절차 및 공문 작성 지원' },
    { label: 'K-에듀파인', icon: BookOpen, path: '/edufine', color: '#14b8a6', desc: '예산과목 추천 및 지출 검토' },
    { label: '업무 계산기', icon: Zap, path: '/calculator', color: '#f59e0b', desc: '여비·수당·부가세 등 자동 계산' },
    { label: '법인카드 관리', icon: CreditCard, path: '/card', color: '#ec4899', desc: '대여·반납 현황 관리' },
    { label: '여비정산신청서', icon: Package, href: 'https://sksu123-yeabi.vercel.app/', color: '#f97316', desc: '여비정산 자동 계산 및 신청서 작성', isExternal: true },
    { label: '자동화 센터', icon: Zap, path: '/automation', color: '#06b6d4', desc: '백업·파일 일괄 변경' },
  ]

  const weatherIcon = (icon: string) => {
    if (icon?.includes('01')) return <Sun size={32} className="text-yellow-400" />
    if (icon?.includes('09') || icon?.includes('10')) return <CloudRain size={32} className="text-blue-400" />
    return <Cloud size={32} className="text-slate-400" />
  }

  return (
    <div className="space-y-5 fade-in">

      {/* 상단 헤더 */}
      <div className="card-glass p-5 rounded-2xl"
        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(20,184,166,0.1))' }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #14b8a6)' }}>
                {user.name[0]}
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.school_name} · {user.department}</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  안녕하세요, {user.name}님 👋
                </p>
              </div>
            </div>
            <p className="text-3xl font-bold mt-2 tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {format(now, 'HH:mm:ss')}
            </p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {format(now, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
            </p>
          </div>

          {/* 날씨 */}
          {widgetsConfig.weather && weather && (
            <div className="text-right flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                {weatherIcon(weather.icon)}
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {weather.temp}°C
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{weather.description}</p>
                </div>
              </div>
              <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1"><Droplets size={10} />{weather.humidity}%</span>
                <span className="flex items-center gap-1"><Wind size={10} />{weather.wind_speed}m/s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* D-Day & 오늘 일정 */}
      {(widgetsConfig.dday || widgetsConfig.today) && (
        <div className="grid grid-cols-2 gap-4">
          {/* D-Day */}
          {widgetsConfig.dday && (
            <div className="card">
              <p className="section-title flex items-center gap-1.5">
                <Bell size={11} /> 다가오는 일정
              </p>
              <div className="space-y-2">
                {ddays.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>등록된 일정이 없습니다</p>
                ) : ddays.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color || '#3b82f6' }} />
                      <span className="text-xs truncate" style={{ color: 'var(--text-secondary)', maxWidth: '120px' }}>{s.title}</span>
                    </div>
                    <span className="text-xs font-bold tabular-nums"
                      style={{ color: s.days_left === 0 ? '#10b981' : s.days_left <= 3 ? '#ef4444' : 'var(--accent-blue)' }}>
                      {s.days_left === 0 ? 'D-Day' : `D-${s.days_left}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 오늘 일정 */}
          {widgetsConfig.today && (
            <div className="card">
              <p className="section-title flex items-center gap-1.5">
                <Calendar size={11} /> 오늘 일정
              </p>
              <div className="space-y-2">
                {todaySchedules.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>오늘 일정이 없습니다</p>
                ) : todaySchedules.slice(0, 4).map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color || '#3b82f6' }} />
                    <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 현황 요약 */}
      {widgetsConfig.summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '법인카드 이용 가능', value: `${cards.available}/${cards.total}`, icon: CreditCard, color: '#ec4899' },
            { label: '오늘 일정', value: `${todaySchedules.length}건`, icon: Calendar, color: '#3b82f6' },
            { label: '이번 달 D-Day', value: `${ddays.length}건`, icon: Clock, color: '#f59e0b' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}22` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 빠른 실행 */}
      {widgetsConfig.quick && (
        <div>
          <p className="section-title">빠른 실행</p>
          <div className="grid grid-cols-3 gap-3">
            {quickLinks.map(({ label, icon: Icon, path, href, color, desc, isExternal }) => (
              <button
                key={label}
                onClick={() => isExternal && href ? window.open(href, '_blank') : navigate(path as string)}
                className="card text-left group hover:scale-[1.02] active:scale-[0.98] transition-all duration-150"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${color}22` }}>
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                  {isExternal ? (
                    <span className="text-[10px] opacity-50 px-1 border border-slate-600 rounded">앱</span>
                  ) : (
                    <ChevronRight size={14} style={{ color: 'var(--text-muted)' }}
                      className="mt-1 group-hover:translate-x-0.5 transition-transform opacity-0 group-hover:opacity-100" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
