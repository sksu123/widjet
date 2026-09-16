import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Printer, Download,
  Search, X, LayoutGrid, List, CalendarDays, Copy
} from 'lucide-react'
import type { AdminSchedule } from '../../types/api'
import MonthView from './MonthView'
import ListView from './ListView'
import YearView from './YearView'
import ScheduleModal from './ScheduleModal'

type ViewMode = 'month' | 'list'

const CATEGORIES = [
  { value: '전체',   color: '#6b7280' },
  { value: '회계/예산', color: '#3b82f6' },
  { value: '인사/노무', color: '#8b5cf6' },
  { value: '시설/안전', color: '#f59e0b' },
  { value: '급식/보건', color: '#10b981' },
  { value: '행정',   color: '#ec4899' },
]

export default function CalendarPage() {
  const now = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [schedules, setSchedules] = useState<AdminSchedule[]>([])
  const [loading, setLoading] = useState(false)

  // 필터 상태
  const [keyword, setKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')

  // 모달 상태
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<AdminSchedule | null>(null)
  const [defaultDate, setDefaultDate] = useState('')

  // 연도 복사 확인 상태
  const [showCopyConfirm, setShowCopyConfirm] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')

  // 데이터 로드 (월간/목록 모두 해당 월만)
  const loadSchedules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.api.adminCal.get(year, month)
      if (res.success) setSchedules(res.data as AdminSchedule[])
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => {
    loadSchedules()
  }, [loadSchedules])

  // 프론트엔드 필터 적용
  const filteredSchedules = schedules.filter(s => {
    if (selectedCategory !== '전체' && s.category !== selectedCategory) return false
    if (keyword.trim() && !s.title.toLowerCase().includes(keyword.trim().toLowerCase())) return false
    return true
  })

  // 이전/다음 이동
  const goPrev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const goNext = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }
  const goToday = () => {
    setYear(now.getFullYear())
    setMonth(now.getMonth() + 1)
  }

  const handleAddSchedule = (date = '') => {
    setEditingSchedule(null)
    setDefaultDate(date)
    setModalOpen(true)
  }

  const handleEditSchedule = (schedule: AdminSchedule) => {
    setEditingSchedule(schedule)
    setDefaultDate('')
    setModalOpen(true)
  }

  const handleSave = async (data: Record<string, unknown>) => {
    if (editingSchedule) {
      await window.api.adminCal.update(editingSchedule.id, data)
    } else {
      await window.api.adminCal.add(data)
    }
    setModalOpen(false)
    loadSchedules()
  }

  const handleDelete = async (id: number, similar?: boolean) => {
    if (similar) {
      await window.api.adminCal.deleteSimilar(id)
    } else {
      await window.api.adminCal.delete(id)
    }
    setModalOpen(false)
    loadSchedules()
  }

  // A4 인쇄 — 숨겨진 iframe을 사용해 인쇄 (Electron window.open 오류 방지)
  const handlePrint = () => {
    const printContent = document.getElementById('admin-cal-print-area')
    if (!printContent) return
    
    // 이전 인쇄용 iframe이 있다면 제거
    const oldIframe = document.getElementById('print-iframe') as HTMLIFrameElement
    if (oldIframe) {
      document.body.removeChild(oldIframe)
    }

    const iframe = document.createElement('iframe')
    iframe.id = 'print-iframe'
    iframe.style.position = 'absolute'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = 'none'
    document.body.appendChild(iframe)

    const doc = iframe.contentWindow?.document
    if (!doc) return

    doc.open()
    doc.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <title>행정 달력 인쇄</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Malgun Gothic', '맑은 고딕', sans-serif; font-size: 11px; color: #000; background: #fff; padding: 20px; }
          h2 { font-size: 16px; font-weight: bold; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
          th { background: #f5f5f5; font-weight: bold; text-align: center; }
          .deadline { color: #dc2626; font-weight: bold; }
          .print-only { display: block !important; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `)
    doc.close()

    iframe.contentWindow?.focus()
    setTimeout(() => {
      iframe.contentWindow?.print()
    }, 500)
  }

  // CSV 다운로드
  const handleCsvDownload = () => {
    const data = viewMode === 'year' ? yearSchedules : filteredSchedules
    const header = '날짜,카테고리,제목,마감일여부,메모\n'
    const rows = data.map(s =>
      `"${s.date}","${s.category}","${s.title.replace(/"/g, '""')}","${s.is_deadline ? '마감일' : '일반'}","${(s.memo || '').replace(/"/g, '""')}"`
    ).join('\n')
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `행정달력_${year}년${viewMode !== 'year' ? `_${month}월` : ''}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 연도 복사
  const handleCopyYear = async () => {
    const res = await window.api.adminCal.copyYear(year, year + 1)
    if (res.success) {
      setCopyMsg(`${year}년 일정 ${(res as any).count}개를 ${year + 1}년으로 복사했습니다.`)
    } else {
      setCopyMsg((res as any).message || '복사할 일정이 없습니다.')
    }
    setShowCopyConfirm(false)
    loadSchedules()
    setTimeout(() => setCopyMsg(''), 3000)
  }

  const titleLabel = `${year}년 ${month}월`

  // 인쇄용 HTML 구성 (현재 보이는 일정 목록)
  const printData = filteredSchedules
  const printTitle = `행정 달력 - ${titleLabel}${selectedCategory !== '전체' ? ` [${selectedCategory}]` : ''}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* ── 상단 툴바 ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <CalendarDays size={16} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">행정 달력</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>학교 행정실 5대 핵심 업무(회계/예산, 인사/노무, 시설/안전, 급식/보건, 행정) 일정을 체계적으로 관리합니다.</p>
          </div>
        </div>
        
        <div style={{ flex: 1 }} />

        {/* 우측 상단 컨트롤 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* 뷰 전환 */}
            <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: 8, padding: 2, gap: 2 }}>
              {([['month', '월간', LayoutGrid], ['list', '목록', List]] as const).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode as ViewMode)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    background: viewMode === mode ? 'var(--bg-card)' : 'transparent',
                    color: viewMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: viewMode === mode ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>

            {/* 년월 이동 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={goPrev} style={navBtnStyle}><ChevronLeft size={16} /></button>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', minWidth: 90, textAlign: 'center' }}>{titleLabel}</span>
              <button onClick={goNext} style={navBtnStyle}><ChevronRight size={16} /></button>
              <button onClick={goToday} style={{ ...navBtnStyle, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>오늘</button>
            </div>
          </div>

          {/* 액션 버튼들 */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => handleAddSchedule()} style={actionBtnStyle}><Plus size={14} /> 일정 추가</button>
            <button onClick={handlePrint} style={iconBtnStyle} title="인쇄"><Printer size={15} /></button>
            <button onClick={handleCsvDownload} style={iconBtnStyle} title="CSV 다운로드"><Download size={15} /></button>
            <button onClick={() => setShowCopyConfirm(true)} style={iconBtnStyle} title={`${year}년 → ${year + 1}년 복사`}><Copy size={15} /></button>
          </div>
        </div>
      </div>

      {/* ── 필터 바 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', borderBottom: '1px solid var(--border)',
        flexShrink: 0, flexWrap: 'wrap', background: 'var(--bg-secondary)',
      }}>
        {/* 카테고리 필터 */}
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              border: `1.5px solid ${selectedCategory === cat.value ? cat.color : 'var(--border)'}`,
              background: selectedCategory === cat.value ? cat.color : 'var(--bg-card)',
              color: selectedCategory === cat.value ? '#fff' : cat.color,
            }}
          >
            {cat.value}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        {viewMode === 'list' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px' }}>
            <Search size={13} style={{ color: 'var(--text-muted)' }} />
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="일정 검색..."
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 12, color: 'var(--text-primary)', width: 140 }}
            />
            {keyword && (
              <button onClick={() => setKeyword('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── 알림 ── */}
      {copyMsg && (
        <div style={{ padding: '8px 16px', background: '#10b98122', borderBottom: '1px solid #10b98144', fontSize: 12, color: '#10b981', fontWeight: 600 }}>
          ✓ {copyMsg}
        </div>
      )}

      {/* ── 연도 복사 확인 모달 ── */}
      {showCopyConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, maxWidth: 380, width: '90vw', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <Copy size={32} style={{ color: '#f59e0b', marginBottom: 12 }} />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 8px' }}>일정 복사</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.6 }}>
              {year}년 일정을 {year + 1}년으로 복사합니다.<br />
              주말에 해당하는 일정 중 시설/안전은 금요일로, 나머지는 월요일로 자동 조정됩니다.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCopyYear} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>복사</button>
              <button onClick={() => setShowCopyConfirm(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>취소</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 메인 콘텐츠 ── */}
      <div id="admin-cal-print-area" style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
        {/* 인쇄용 숨김 헤더 */}
        <div className="print-only" style={{ display: 'none' }}>
          <h2>{printTitle}</h2>
          <table>
            <thead>
              <tr><th>날짜</th><th>카테고리</th><th>제목</th><th>비고</th></tr>
            </thead>
            <tbody>
              {printData.map(s => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.category}</td>
                  <td className={s.is_deadline === 1 ? 'deadline' : ''}>{s.is_deadline === 1 ? '⚑ ' : ''}{s.title}</td>
                  <td>{s.memo || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>불러오는 중...</div>
        ) : viewMode === 'month' ? (
          <MonthView
            schedules={filteredSchedules}
            year={year}
            month={month}
            onAddSchedule={handleAddSchedule}
            onEditSchedule={handleEditSchedule}
          />
        ) : (
          <ListView
            schedules={filteredSchedules}
            onEdit={handleEditSchedule}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* ── 일정 추가/수정 모달 ── */}
      <ScheduleModal
        isOpen={modalOpen}
        schedule={editingSchedule}
        defaultDate={defaultDate}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer',
}

const actionBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 5,
  padding: '6px 12px', border: 'none', borderRadius: 8,
  background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
}

const iconBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8,
  background: 'var(--bg-card)', color: 'var(--text-secondary)', cursor: 'pointer',
}
