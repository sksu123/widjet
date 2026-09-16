import { useEffect, useState } from 'react'
import { Cloud, Sun, CloudRain, Utensils, Coffee, SunMedium, X, Check } from 'lucide-react'

interface WeatherData {
  city: string; temp: number | string; description: string; icon: string; pm10: string;
  compareYm?: string; feels_like?: string; humidity?: string; wind?: string;
}

export default function DailyRoutinePopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [type, setType] = useState<'start' | 'lunch' | 'end' | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [meal, setMeal] = useState<any>(null)
  const [userName, setUserName] = useState('선생님')

  useEffect(() => {
    // Check every 30 seconds
    const interval = setInterval(checkRoutine, 30000)
    checkRoutine() // check immediately
    return () => clearInterval(interval)
  }, [])

  const checkRoutine = async () => {
    if (isOpen) return;

    const now = new Date()
    const today = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0]
    
    const [settingsRes, userRes] = await Promise.all([
      window.api.db.getSettings(),
      window.api.db.getUser()
    ])
    
    let startTime = '08:30'
    let lunchTime = '12:00'
    let endTime = '16:30'

    if (settingsRes.success) {
      const s = settingsRes.data as Record<string, string>
      if (s.work_start_time) startTime = s.work_start_time
      if (s.lunch_time) lunchTime = s.lunch_time
      if (s.work_end_time) endTime = s.work_end_time
    }
    
    if (userRes.success && (userRes.data as any).name) {
      setUserName((userRes.data as any).name)
    }

    const getMins = (timeStr) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    }

    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = getMins(startTime);
    const lunchMins = getMins(lunchTime);
    const endMins = getMins(endTime) - 5;

    // Requirement: First launch of the day shows the start greeting
    const storageKeyFirst = `routine_${today}_first_launch`
    if (!localStorage.getItem(storageKeyFirst)) {
      localStorage.setItem(storageKeyFirst, 'true')
      // mark start as triggered so it doesn't duplicate at exact start time
      localStorage.setItem(`routine_${today}_start`, 'true')
      
      setType('start')
      const wRes = await window.api.calendar.getWeather()
      if (wRes.success) setWeather(wRes.data)
      setIsOpen(true)
      return
    }

    let matchType = null

    // Requirement: Show exactly at the configured time (strict 1-minute window)
    if (nowMins === endMins) matchType = 'end'
    else if (nowMins === lunchMins) matchType = 'lunch'
    else if (nowMins === startMins) matchType = 'start'

    if (matchType) {
      const storageKey = `routine_${today}_${matchType}`
      if (!localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, 'true')
        setType(matchType)
        
        if (matchType === 'start' || matchType === 'end') {
          const wRes = await window.api.calendar.getWeather()
          if (wRes.success) setWeather(wRes.data)
        } else if (matchType === 'lunch') {
          if (window.api.calendar.getMeal) {
            const mRes = await window.api.calendar.getMeal()
            if (mRes.success) setMeal(mRes.data)
          }
        }
        
        setIsOpen(true)
      }
    }
  }

  if (!isOpen || !type) return null

  const getWeatherIcon = (icon: string) => {
    if (icon?.includes('01')) return <Sun size={40} className="text-yellow-400" />
    if (icon?.includes('09') || icon?.includes('10')) return <CloudRain size={40} className="text-blue-400" />
    return <Cloud size={40} className="text-slate-400" />
  }

  const renderContent = () => {
    if (type === 'start') {
      return (
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 mb-2">
            <Coffee size={32} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>좋은 아침입니다, {userName}님!</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            상쾌한 하루의 시작입니다.<br/>오늘도 활기차고 행복한 하루 보내시길 응원합니다!
          </p>
          {weather && (
            <div className="flex items-center gap-4 mt-4 p-4 rounded-xl border w-full justify-center" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              {getWeatherIcon(weather.icon)}
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>오늘의 날씨 ({weather.city})</p>
                <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{weather.temp}°</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{weather.description} · 미세먼지: {weather.pm10}</p>
              </div>
            </div>
          )}
        </div>
      )
    }
    
    if (type === 'lunch') {
      // safely extract meal text
      let mealText = '오늘의 식단 정보를 불러올 수 없습니다.'
      if (meal) {
        if (typeof meal === 'string') mealText = meal;
        else if (meal.mealName) mealText = meal.mealName;
        else if (Array.isArray(meal)) {
          const lunch = meal.find(m => m.type === '2') || meal[0];
          if (lunch && Array.isArray(lunch.menus)) {
            mealText = lunch.menus.join(', ');
          } else {
            mealText = meal.map(m => m.DDISH_NM?.replace(/<[^>]*>?/gm, '')).filter(Boolean).join(', ') || mealText;
          }
        }
      }
      
      return (
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mb-2">
            <Utensils size={32} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>즐거운 점심시간입니다!</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            업무는 잠시 내려놓고 맛있는 점심 식사 하세요.<br/>여유로운 휴식 시간이 되시길 바랍니다.
          </p>
          <div className="mt-4 p-4 rounded-xl border w-full text-left" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
            <p className="text-xs font-bold mb-2 text-orange-500">오늘의 급식 메뉴</p>
            <p className="text-sm font-medium leading-loose" style={{ color: 'var(--text-primary)' }}>
              {mealText || '급식 정보가 없습니다.'}
            </p>
          </div>
        </div>
      )
    }

    if (type === 'end') {
      const isRaining = weather?.icon?.includes('09') || weather?.icon?.includes('10') || weather?.description?.includes('비')
      
      return (
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 mb-2">
            <SunMedium size={32} />
          </div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>퇴근 시간 5분 전입니다!</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            오늘 하루도 정말 고생 많으셨습니다.<br/>마무리 잘 하시고 조심히 퇴근하세요!
          </p>
          {weather && (
            <div className="flex flex-col gap-2 mt-4 p-4 rounded-xl border w-full text-left" style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)' }}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>현재 날씨 ({weather.temp}°)</span>
                {getWeatherIcon(weather.icon)}
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {isRaining ? '🌧 밖에는 비가 오고 있습니다. 우산을 꼭 챙기세요!' : '맑은 날씨입니다. 가벼운 발걸음으로 퇴근하세요!'}
              </p>
            </div>
          )}
        </div>
      )
    }
    
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm fade-in">
      <div className="w-[380px] rounded-3xl shadow-2xl p-6 flex flex-col relative"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        
        {renderContent()}

        <button onClick={() => setIsOpen(false)}
          className="mt-6 w-full py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
          <Check size={18} /> 확인
        </button>
      </div>
    </div>
  )
}
