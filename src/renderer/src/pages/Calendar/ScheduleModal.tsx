import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import type { AdminSchedule } from '../../types/api'

const CATEGORIES = [
  { value: '회계/예산', color: '#3b82f6' },
  { value: '인사/노무', color: '#8b5cf6' },
  { value: '시설/안전', color: '#f59e0b' },
  { value: '급식/보건', color: '#10b981' },
  { value: '행정', color: '#ec4899' },
]

interface ScheduleFormData {
  title: string
  category: string
  date: string
  end_date: string
  is_deadline: boolean
  is_recurring: boolean
  memo: string
}

interface ScheduleModalProps {
  isOpen: boolean
  schedule?: AdminSchedule | null
  defaultDate?: string
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDelete?: (id: number, similar: boolean) => Promise<void>
  onClose: () => void
}

export default function ScheduleModal({
  isOpen,
  schedule,
  defaultDate,
  onSave,
  onDelete,
  onClose,
}: ScheduleModalProps) {
  const [form, setForm] = useState<ScheduleFormData>({
    title: '',
    category: '행정',
    date: '',
    end_date: '',
    is_deadline: false,
    is_recurring: false,
    memo: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setDeleteConfirm(false)
    if (schedule) {
      setForm({
        title: schedule.title,
        category: schedule.category,
        date: schedule.date,
        end_date: schedule.end_date || '',
        is_deadline: schedule.is_deadline === 1,
        is_recurring: schedule.is_recurring === 1,
        memo: schedule.memo || '',
      })
    } else {
      setForm({
        title: '',
        category: '행정',
        date: defaultDate || '',
        end_date: '',
        is_deadline: false,
        is_recurring: false,
        memo: '',
      })
    }
    setError('')
  }, [isOpen, schedule, defaultDate])

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose()
  }

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('제목을 입력해주세요.')
      return
    }
    if (!form.date) {
      setError('날짜를 선택해주세요.')
      return
    }
    setSaving(true)
    try {
      await onSave({
        title: form.title.trim(),
        category: form.category,
        date: form.date,
        end_date: form.end_date || null,
        is_deadline: form.is_deadline ? 1 : 0,
        is_recurring: form.is_recurring ? 1 : 0,
        memo: form.memo,
      })
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 13,
    outline: 'none',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          width: 420,
          maxWidth: '90vw',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            {schedule ? '일정 수정' : '일정 추가'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 4,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* 폼 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* 제목 */}
          <div>
            <label style={labelStyle}>제목 <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              style={inputStyle}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="일정 제목을 입력하세요"
              autoFocus
            />
          </div>

          <div>
            <label style={labelStyle}>카테고리</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setForm({ ...form, category: cat.value })}
                  style={{
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.15s',
                    border: `1.5px solid ${cat.color}`,
                    background: form.category === cat.value ? cat.color : 'transparent',
                    color: form.category === cat.value ? '#fff' : cat.color,
                    fontSize: 12, fontWeight: form.category === cat.value ? 700 : 500,
                  }}
                >
                  {cat.value}
                </button>
              ))}
            </div>
          </div>


          {/* 날짜 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>날짜 <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="date"
                style={inputStyle}
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>종료 날짜 (선택)</label>
              <input
                type="date"
                style={inputStyle}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                min={form.date}
              />
            </div>
          </div>

          {/* 마감일 여부 */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={form.is_deadline}
                onChange={(e) => setForm({ ...form, is_deadline: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: '#ef4444', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: form.is_deadline ? '#ef4444' : 'var(--text-secondary)', fontWeight: form.is_deadline ? 600 : 400 }}>
                마감일로 표시 (빨간색 강조)
              </span>
            </label>
          </div>

          {/* 매월 반복 여부 */}
          <div style={{ marginTop: -2 }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                style={{ width: 15, height: 15, accentColor: '#3b82f6', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: form.is_recurring ? '#3b82f6' : 'var(--text-secondary)', fontWeight: form.is_recurring ? 600 : 400 }}>
                매월 반복 (해당 연도의 1~12월 자동 생성)
              </span>
            </label>
          </div>

          {/* 메모 */}
          <div>
            <label style={labelStyle}>메모</label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72, fontFamily: 'inherit' }}
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
              placeholder="메모를 입력하세요 (선택)"
              rows={3}
            />
          </div>

          {/* 에러 */}
          {error && (
            <p style={{ fontSize: 12, color: '#ef4444', margin: 0 }}>{error}</p>
          )}

          {/* 버튼 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {!deleteConfirm ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 10,
                    border: 'none',
                    background: 'var(--accent, #3b82f6)',
                    color: '#fff',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
                {schedule && onDelete && (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    disabled={saving}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      borderRadius: 10,
                      border: '1px solid #ef4444',
                      background: 'transparent',
                      color: '#ef4444',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: saving ? 'not-allowed' : 'pointer',
                      opacity: saving ? 0.7 : 1,
                    }}
                  >
                    삭제
                  </button>
                )}
                <button
                  onClick={onClose}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  취소
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 8 }}>
                <p style={{ fontSize: 13, color: '#ef4444', fontWeight: 600, margin: '0 0 4px', textAlign: 'center' }}>
                  일정을 삭제하시겠습니까?
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button 
                    onClick={async () => {
                      setSaving(true)
                      try { await onDelete?.(schedule!.id, false) } finally { setSaving(false) }
                    }} 
                    disabled={saving}
                    style={{ flex: 1, background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    이 일정만 삭제
                  </button>
                  <button 
                    onClick={async () => {
                      setSaving(true)
                      try { await onDelete?.(schedule!.id, true) } finally { setSaving(false) }
                    }} 
                    disabled={saving}
                    style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    유사 일정 모두 삭제
                  </button>
                </div>
                <button 
                  onClick={() => setDeleteConfirm(false)} 
                  disabled={saving}
                  style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 0', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  취소
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
