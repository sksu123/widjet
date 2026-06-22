import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Calendar as CalIcon, Plus, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Schedule {
  id: number; title: string; start_date: string; end_date?: string
  category: string; color: string; is_all_day: number
}

const CATEGORIES = [
  { value: 'general', label: '일반', color: '#3b82f6' },
  { value: 'exam', label: '시험', color: '#ef4444' },
  { value: 'meeting', label: '회의', color: '#8b5cf6' },
  { value: 'event', label: '행사', color: '#f59e0b' },
  { value: 'finance', label: '재무', color: '#10b981' },
  { value: 'holiday', label: '휴무', color: '#06b6d4' },
]

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'general', color: '#3b82f6', is_all_day: true, start_date: '', repeat_type: 'none' })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showSchoolScheduleInCalendar, setShowSchoolScheduleInCalendar] = useState(true)
  const [schoolEvents, setSchoolEvents] = useState<{date: string; eventName: string; isHoliday: boolean}[]>([])

  const location = useLocation()

  useEffect(() => {
    loadSchedules()
    loadSchoolSchedule()
  }, [currentDate])

  // 외부(대시보드 등)에서 날짜를 지정해 일정 추가 모달을 열도록 요청한 경우
  useEffect(() => {
    if (location.state?.addScheduleDate) {
      const dateStr = location.state.addScheduleDate
      const parsedDate = new Date(dateStr)
      setForm(prev => ({ ...prev, start_date: dateStr }))
      setSelectedDate(parsedDate)
      setShowForm(true)
      
      // 현재 달력이 해당 날짜의 달을 보여주도록 이동
      if (!isSameMonth(parsedDate, currentDate)) {
        setCurrentDate(parsedDate)
      }
      
      // 새로고침이나 뒤로가기 시 다시 열리는 것을 방지하기 위해 state 초기화
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  async function loadSchedules() {
    const res = await window.api.db.getSchedules(currentDate.getFullYear(), currentDate.getMonth() + 1)
    if (res.success) setSchedules(res.data as Schedule[])
  }

  async function loadSchoolSchedule() {
    if(!window.api.calendar.getSchoolSchedule) return;
    const res = await window.api.calendar.getSchoolSchedule(currentDate.getFullYear(), currentDate.getMonth() + 1)
    if (res.success) {
      setSchoolEvents(res.data as {date: string; eventName: string; isHoliday: boolean}[])
    }
  }

  const days = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) })
  const startPad = startOfMonth(currentDate).getDay()

  const getSchedulesForDay = (day: Date) =>
    schedules.filter(s => isSameDay(new Date(s.start_date), day))

  const saveSchedule = async () => {
    if (!form.title || !form.start_date) return
    const cat = CATEGORIES.find(c => c.value === form.category)
    const payload = {
      ...form,
      color: cat?.color || '#3b82f6',
      is_all_day: form.is_all_day ? 1 : 0,
    }
    if (editingId) {
      await window.api.db.updateSchedule(editingId, payload)
    } else {
      await window.api.db.addSchedule(payload)
    }
    setShowForm(false)
    setEditingId(null)
    setForm({ title: '', category: 'general', color: '#3b82f6', is_all_day: true, start_date: '', repeat_type: 'none' })
    loadSchedules()
  }

  const openEdit = (s: Schedule) => {
    setEditingId(s.id)
    setForm({
      title: s.title,
      category: s.category,
      color: s.color,
      is_all_day: s.is_all_day === 1,
      start_date: s.start_date,
      repeat_type: 'none'
    })
    setShowForm(true)
  }

  const deleteSchedule = async (id: number) => {
    await window.api.db.deleteSchedule(id)
    loadSchedules()
  }

  const selectedSchedules = selectedDate ? getSchedulesForDay(selectedDate) : []
  const selectedSchoolEvents = selectedDate ? schoolEvents.filter(e => e.date === format(selectedDate, 'yyyyMMdd')) : []

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
            <CalIcon size={16} className="text-white" />
          </div>
          <h1 className="page-title">일정 관리</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 py-1 rounded-lg border" style={{ background: 'rgba(0,0,0,0.03)', borderColor: 'var(--border)' }}>
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>학사일정 표시</span>
            <button 
              onClick={() => setShowSchoolScheduleInCalendar(!showSchoolScheduleInCalendar)}
              className={`w-8 h-4 rounded-full transition-colors relative ${showSchoolScheduleInCalendar ? 'bg-blue-500' : 'bg-slate-300'}`}
            >
              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${showSchoolScheduleInCalendar ? 'left-4' : 'left-0.5'}`} />
            </button>
          </div>
          <button onClick={() => { setEditingId(null); setForm({ title: '', category: 'general', color: '#3b82f6', is_all_day: true, start_date: '', repeat_type: 'none' }); setShowForm(true) }} className="btn-primary text-xs">
            <Plus size={14} /> 일정 추가
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 캘린더 */}
        <div className="col-span-2 card">
          {/* 월 이동 */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="btn-ghost p-1.5">
              <ChevronLeft size={16} />
            </button>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {format(currentDate, 'yyyy년 M월', { locale: ko })}
            </p>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="btn-ghost p-1.5">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-1">
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={d} className="text-center text-xs py-1 font-medium"
                style={{ color: i === 0 ? '#ef4444' : i === 6 ? '#60a5fa' : 'var(--text-muted)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startPad }).map((_, i) => (
              <div key={`pad-${i}`} className="h-14" />
            ))}
            {days.map(day => {
              const daySchedules = getSchedulesForDay(day)
              const dateString = format(day, 'yyyyMMdd')
              const daySchoolEvents = schoolEvents.filter(e => e.date === dateString)
              const isSelected = selectedDate && isSameDay(day, selectedDate)
              const today = isToday(day)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className="h-14 flex flex-col items-center pt-1 rounded-lg transition-all hover:bg-white/5 relative"
                  style={isSelected ? { background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)' } : {}}
                >
                  <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full font-medium ${today ? 'text-white' : ''}`}
                    style={today ? { background: '#3b82f6' } :
                      { color: day.getDay() === 0 ? '#ef4444' : day.getDay() === 6 ? '#60a5fa' : 'var(--text-secondary)' }}>
                    {format(day, 'd')}
                  </span>
                  <div className="flex gap-0.5 mt-0.5">
                    {daySchedules.slice(0, 3).map(s => (
                      <div key={s.id} className="w-1 h-1 rounded-full" style={{ background: s.color }} />
                    ))}
                    {showSchoolScheduleInCalendar && daySchoolEvents.slice(0, 3 - Math.min(3, daySchedules.length)).map((ev, i) => (
                      <div key={`sc-${i}`} className="w-1 h-1 rounded-full" style={{ background: ev.isHoliday ? '#ef4444' : '#94a3b8' }} />
                    ))}
                  </div>
                  {(daySchedules.length > 0 || (showSchoolScheduleInCalendar && daySchoolEvents.length > 0)) && (
                    <div className="absolute bottom-0.5 w-full px-1 flex flex-col gap-px" style={{ marginBottom: '1px' }}>
                      {daySchedules.slice(0, 1).map(s => (
                        <div key={s.id} className="truncate text-[9px] px-1 py-0 rounded" style={{ background: `${s.color}33`, color: s.color }}>
                          <span className="font-bold opacity-80 mr-1">({CATEGORIES.find(c => c.value === s.category)?.label || '일반'})</span>
                          {s.title}
                        </div>
                      ))}
                      {showSchoolScheduleInCalendar && daySchoolEvents.slice(0, daySchedules.length > 0 ? 0 : 1).map((ev, i) => (
                        <div key={`scl-${i}`} className="truncate text-[9px] px-1 py-0 rounded"
                          style={{ background: ev.isHoliday ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)', color: ev.isHoliday ? '#ef4444' : 'var(--text-muted)' }}>
                          {ev.eventName}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* 선택된 날짜 일정 */}
        <div className="card">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            {selectedDate ? format(selectedDate, 'M월 d일 일정', { locale: ko }) : '날짜를 선택하세요'}
          </p>
          {selectedSchedules.length === 0 && (!showSchoolScheduleInCalendar || selectedSchoolEvents.length === 0) ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {selectedDate ? '등록된 일정이 없습니다' : '캘린더에서 날짜를 클릭하세요'}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedSchedules.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-lg group cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{ background: `${s.color}11`, border: `1px solid ${s.color}33` }}
                  onClick={() => openEdit(s)}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      <span className="font-bold opacity-80 mr-1" style={{ color: s.color }}>
                        ({CATEGORIES.find(c => c.value === s.category)?.label || '일반'})
                      </span>
                      {s.title}
                    </p>
                  </div>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(s)} title="수정"
                      className="p-1.5 rounded-md hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => deleteSchedule(s.id)} title="삭제"
                      className="p-1.5 rounded-md hover:bg-red-500/20 text-red-600 dark:text-red-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {showSchoolScheduleInCalendar && selectedSchoolEvents.map((ev, i) => (
                <div key={`sc-list-${i}`} className="flex items-start gap-2 p-2 rounded-lg group"
                  style={{ background: ev.isHoliday ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: ev.isHoliday ? '#ef4444' : '#94a3b8' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: ev.isHoliday ? '#ef4444' : 'var(--text-primary)' }}>
                      {ev.eventName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 일정 추가 모달 */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="card w-80 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{editingId ? '일정 수정' : '새 일정 추가'}</p>
            <div>
              <label className="label">제목</label>
              <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="일정 제목" />
            </div>
            <div>
              <label className="label">날짜</label>
              <input className="input" type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div>
              <label className="label">분류</label>
              <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">반복 설정</label>
              <select className="input" value={form.repeat_type} onChange={e => setForm({ ...form, repeat_type: e.target.value })}>
                <option value="none">반복 없음</option>
                <option value="daily">매일 (1년)</option>
                <option value="weekly">매주 (1년)</option>
                <option value="monthly">매월 (1년)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={saveSchedule} className="btn-primary flex-1 justify-center text-sm">저장</button>
              <button onClick={() => { setShowForm(false); setEditingId(null) }} className="btn-ghost flex-1 justify-center text-sm">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
