import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns'
import type { AdminSchedule } from '../../types/api'

const CATEGORIES = [
  { value: '회계/예산', color: '#3b82f6' },
  { value: '인사/노무', color: '#8b5cf6' },
  { value: '시설/안전', color: '#f59e0b' },
  { value: '급식/보건', color: '#10b981' },
  { value: '행정', color: '#ec4899' },
]
const getCatColor = (cat: string) => CATEGORIES.find(c => c.value === cat)?.color || '#6b7280'

interface YearViewProps {
  yearSchedules: AdminSchedule[]
  year: number
  onMonthClick: (month: number) => void
}

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']
const DAY_LABELS = ['일','월','화','수','목','금','토']

export default function YearView({ yearSchedules, year, onMonthClick }: YearViewProps) {
  const today = new Date()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, padding: '4px 0' }}>
      {MONTH_NAMES.map((mName, mi) => {
        const monthNum = mi + 1
        const monthDate = new Date(year, mi, 1)
        const days = eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) })
        const startPad = startOfMonth(monthDate).getDay()
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === mi

        // 해당 월의 일정
        const ym = `${year}-${String(monthNum).padStart(2, '0')}`
        const monthSchedules = yearSchedules.filter(s => s.date.startsWith(ym))
        const scheduleByDate: Record<string, AdminSchedule[]> = {}
        for (const s of monthSchedules) {
          if (!scheduleByDate[s.date]) scheduleByDate[s.date] = []
          scheduleByDate[s.date].push(s)
        }

        return (
          <div
            key={mName}
            onClick={() => onMonthClick(monthNum)}
            style={{
              background: 'var(--bg-card)',
              border: isCurrentMonth ? '1.5px solid rgba(59,130,246,0.5)' : '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 10px',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            {/* 월 헤더 */}
            <div style={{ fontWeight: 700, fontSize: 13, color: isCurrentMonth ? '#3b82f6' : 'var(--text-primary)', marginBottom: 6, textAlign: 'center' }}>
              {mName}
            </div>

            {/* 요일 헤더 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 2 }}>
              {DAY_LABELS.map((d, i) => (
                <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, color: i === 0 ? '#ef4444' : i === 6 ? '#60a5fa' : 'var(--text-muted)', padding: '1px 0' }}>
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`p${i}`} style={{ height: 20 }} />
              ))}
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const dayScheds = scheduleByDate[dateStr] || []
                const hasDeadline = dayScheds.some(s => s.is_deadline === 1)
                const hasAny = dayScheds.length > 0
                const todayCell = isToday(day)
                const dow = day.getDay()

                return (
                  <div
                    key={dateStr}
                    style={{
                      height: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <span style={{
                      fontSize: 9,
                      fontWeight: todayCell ? 700 : 400,
                      color: todayCell ? '#fff' : dow === 0 ? '#ef4444' : dow === 6 ? '#60a5fa' : 'var(--text-secondary)',
                      background: todayCell ? '#3b82f6' : 'transparent',
                      borderRadius: '50%',
                      width: 14,
                      height: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {format(day, 'd')}
                    </span>
                    {hasAny && (
                      <div style={{
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: hasDeadline ? '#ef4444' : getCatColor(dayScheds[0].category),
                        position: 'absolute',
                        bottom: 1,
                      }} />
                    )}
                  </div>
                )
              })}
            </div>

            {/* 일정 수 표시 */}
            {monthSchedules.length > 0 && (
              <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                {monthSchedules.length}개 일정
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
