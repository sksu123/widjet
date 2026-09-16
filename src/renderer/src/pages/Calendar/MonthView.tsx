import { useMemo, useState } from 'react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval,
  format, isToday,
} from 'date-fns'
import { X } from 'lucide-react'
import type { AdminSchedule } from '../../types/api'

const CATEGORIES = [
  { value: '회계/예산', color: '#3b82f6' },
  { value: '인사/노무', color: '#8b5cf6' },
  { value: '시설/안전', color: '#f59e0b' },
  { value: '급식/보건', color: '#10b981' },
  { value: '행정',     color: '#ec4899' },
]
const getCatColor = (category: string) =>
  CATEGORIES.find(c => c.value === category)?.color || '#6b7280'

interface MonthViewProps {
  schedules: AdminSchedule[]
  year: number
  month: number
  onAddSchedule: (date: string) => void
  onEditSchedule: (schedule: AdminSchedule) => void
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

export default function MonthView({
  schedules, year, month, onAddSchedule, onEditSchedule,
}: MonthViewProps) {
  const monthDate = useMemo(() => new Date(year, month - 1, 1), [year, month])
  const days = useMemo(
    () => eachDayOfInterval({ start: startOfMonth(monthDate), end: endOfMonth(monthDate) }),
    [monthDate],
  )
  const startPad = startOfMonth(monthDate).getDay()

  // +N개 팝업 상태
  const [overflowPopup, setOverflowPopup] = useState<{
    dateStr: string
    schedules: AdminSchedule[]
    x: number
    y: number
  } | null>(null)

  const getSchedulesForDay = (day: Date): AdminSchedule[] => {
    const dateStr = format(day, 'yyyy-MM-dd')
    return schedules.filter(s => {
      if (s.end_date) return dateStr >= s.date && dateStr <= s.end_date
      return s.date === dateStr
    })
  }

  const totalCells = startPad + days.length
  const rows = Math.ceil(totalCells / 7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>

      {/* 오버플로우 팝업 */}
      {overflowPopup && (
        <>
          {/* 배경 클릭 닫기 */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 500 }}
            onClick={() => setOverflowPopup(null)}
          />
          <div
            style={{
              position: 'fixed',
              left: Math.min(overflowPopup.x, window.innerWidth - 260),
              top: Math.min(overflowPopup.y, window.innerHeight - 300),
              width: 250,
              zIndex: 501,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            {/* 팝업 헤더 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px', borderBottom: '1px solid var(--border)',
              background: 'var(--bg-secondary)',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                {overflowPopup.dateStr} 일정 전체 ({overflowPopup.schedules.length}개)
              </span>
              <button
                onClick={() => setOverflowPopup(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
              >
                <X size={14} />
              </button>
            </div>
            {/* 팝업 일정 목록 */}
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {overflowPopup.schedules.map(s => {
                const color = getCatColor(s.category)
                const isDeadline = s.is_deadline === 1
                return (
                  <div
                    key={s.id}
                    onClick={() => { onEditSchedule(s); setOverflowPopup(null) }}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 8px', borderRadius: 6, cursor: 'pointer',
                      background: isDeadline ? '#ef444422' : `${color}22`,
                      color: isDeadline ? '#ef4444' : color,
                      border: `1px solid ${isDeadline ? '#ef444444' : `${color}44`}`,
                    }}
                  >
                    {isDeadline && '⚑ '}{s.title}
                    <span style={{ fontSize: 10, marginLeft: 4, opacity: 0.7 }}>[{s.category}]</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* 요일 헤더 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)', marginBottom: 2 }}>
        {DAY_LABELS.map((d, i) => (
          <div key={d} style={{ textAlign: 'center', padding: '6px 0', fontSize: 12, fontWeight: 600, color: i === 0 ? '#ef4444' : i === 6 ? '#60a5fa' : 'var(--text-muted)' }}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridTemplateRows: `repeat(${rows}, 1fr)`, flex: 1, gap: 1 }}>
        {/* 앞 패딩 */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} style={{ background: 'var(--bg-primary)', opacity: 0.4, borderRadius: 8, minHeight: 90 }} />
        ))}

        {/* 날짜 셀 */}
        {days.map(day => {
          const daySchedules = getSchedulesForDay(day)
          const today = isToday(day)
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayOfWeek = day.getDay()
          const MAX_VISIBLE = 3
          const visibleSchedules = daySchedules.slice(0, MAX_VISIBLE)
          const extraCount = daySchedules.length - MAX_VISIBLE

          return (
            <div
              key={day.toISOString()}
              onClick={() => onAddSchedule(dateStr)}
              style={{
                background: today ? 'rgba(59,130,246,0.07)' : 'var(--bg-card)',
                border: today ? '1.5px solid rgba(59,130,246,0.4)' : '1px solid var(--border)',
                borderRadius: 8, padding: '4px 4px 2px', cursor: 'pointer',
                minHeight: 90, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (!today) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-secondary)' }}
              onMouseLeave={e => { if (!today) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card)' }}
            >
              {/* 날짜 숫자 */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 22, borderRadius: '50%',
                background: today ? '#3b82f6' : 'transparent',
                fontSize: 12, fontWeight: today ? 700 : 500,
                color: today ? '#fff' : dayOfWeek === 0 ? '#ef4444' : dayOfWeek === 6 ? '#60a5fa' : 'var(--text-primary)',
                marginBottom: 2, flexShrink: 0,
              }}>
                {format(day, 'd')}
              </div>

              {/* 일정 뱃지 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, overflow: 'hidden' }}>
                {visibleSchedules.map(s => {
                  const color = getCatColor(s.category)
                  const isDeadline = s.is_deadline === 1
                  return (
                    <div
                      key={s.id}
                      onClick={e => { e.stopPropagation(); onEditSchedule(s) }}
                      title={s.title}
                      style={{
                        fontSize: 10, fontWeight: 600, padding: '1px 4px', borderRadius: 3,
                        background: isDeadline ? '#ef4444' : `${color}22`,
                        color: isDeadline ? '#fff' : color,
                        border: isDeadline ? 'none' : `1px solid ${color}44`,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        cursor: 'pointer', flexShrink: 0,
                      }}
                    >
                      {isDeadline && '⚑ '}{s.title}
                    </div>
                  )
                })}

                {/* +N개 클릭 → 팝업 */}
                {extraCount > 0 && (
                  <div
                    onClick={e => {
                      e.stopPropagation()
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                      setOverflowPopup({
                        dateStr,
                        schedules: daySchedules,
                        x: rect.left,
                        y: rect.bottom + 4,
                      })
                    }}
                    style={{
                      fontSize: 10, color: '#3b82f6', paddingLeft: 4, fontWeight: 700,
                      cursor: 'pointer', textDecoration: 'underline',
                    }}
                  >
                    +{extraCount}개 더보기
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
