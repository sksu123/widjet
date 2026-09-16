import { useState } from 'react'
import { format } from 'date-fns'
import { Edit2, Trash2, AlertCircle } from 'lucide-react'
import type { AdminSchedule } from '../../types/api'

const CATEGORIES = [
  { value: '회계/예산', color: '#3b82f6' },
  { value: '인사/노무', color: '#8b5cf6' },
  { value: '시설/안전', color: '#f59e0b' },
  { value: '급식/보건', color: '#10b981' },
  { value: '행정', color: '#ec4899' },
]
const getCatColor = (cat: string) => CATEGORIES.find(c => c.value === cat)?.color || '#6b7280'

interface ListViewProps {
  schedules: AdminSchedule[]
  onEdit: (schedule: AdminSchedule) => void
  onDelete: (id: number) => void
}

export default function ListView({ schedules, onEdit, onDelete }: ListViewProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  // 날짜별 그룹화
  const groups: Record<string, AdminSchedule[]> = {}
  for (const s of schedules) {
    if (!groups[s.date]) groups[s.date] = []
    groups[s.date].push(s)
  }
  const sortedDates = Object.keys(groups).sort()

  if (sortedDates.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 12 }}>
        <AlertCircle size={36} style={{ opacity: 0.4 }} />
        <p style={{ fontSize: 14, margin: 0 }}>해당 조건의 일정이 없습니다.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', paddingBottom: 16 }}>
      {sortedDates.map(dateStr => {
        const date = new Date(dateStr)
        const dayOfWeek = date.getDay()
        const dowLabels = ['일', '월', '화', '수', '목', '금', '토']
        const dowColor = dayOfWeek === 0 ? '#ef4444' : dayOfWeek === 6 ? '#60a5fa' : 'var(--text-secondary)'

        return (
          <div key={dateStr}>
            {/* 날짜 헤더 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: '1px solid var(--border)',
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {format(date, 'M월 d일')}
              </span>
              <span style={{ fontSize: 12, color: dowColor, fontWeight: 600 }}>
                ({dowLabels[dayOfWeek]})
              </span>
            </div>

            {/* 일정 목록 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {groups[dateStr].map(s => {
                const color = getCatColor(s.category)
                const isDeadline = s.is_deadline === 1
                const isConfirming = confirmDeleteId === s.id

                return (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'var(--bg-card)',
                      border: `1px solid ${isDeadline ? '#ef444444' : 'var(--border)'}`,
                      borderLeft: `3px solid ${isDeadline ? '#ef4444' : color}`,
                      borderRadius: 8,
                    }}
                  >
                    {/* 카테고리 뱃지 */}
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 10,
                      background: `${color}22`,
                      color,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}>
                      {s.category}
                    </span>

                    {/* 제목 */}
                    <span style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: 500,
                      color: isDeadline ? '#ef4444' : 'var(--text-primary)',
                    }}>
                      {isDeadline && '⚑ '}{s.title}
                    </span>

                    {/* 삭제 확인 인라인 */}
                    {isConfirming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>삭제할까요?</span>
                        <button
                          onClick={() => { onDelete(s.id); setConfirmDeleteId(null) }}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                        >예</button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >아니오</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          onClick={() => onEdit(s)}
                          title="수정"
                          style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#3b82f6')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(s.id)}
                          title="삭제"
                          style={{ padding: 4, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 4, display: 'flex', alignItems: 'center' }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
