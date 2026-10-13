import { useState, useEffect } from 'react'
import { Flag, Plus, Edit2, Trash2, Check, X } from 'lucide-react'

export interface CustomDday {
  id: string
  title: string
  targetDate: string // YYYY-MM-DD
  scheduleId?: number // 연동된 일정 ID
}

export default function DdayPanel({ onDdayChange }: { onDdayChange?: () => void } = {}) {
  const [ddays, setDdays] = useState<CustomDday[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')

  useEffect(() => {
    loadDdays()
    if (window.api && (window.api as any).mobile?.onDataChanged) {
      const unsub = (window.api as any).mobile.onDataChanged(() => {
        loadDdays()
      })
      return () => {
        if (typeof unsub === 'function') unsub()
      }
    }
  }, [])

  const loadDdays = async () => {
    if (window.api && window.api.db && window.api.db.getSettings) {
      const res = await window.api.db.getSettings()
      if (res.success && res.data.custom_ddays) {
        try {
          const parsed = JSON.parse(res.data.custom_ddays)
          setDdays(parsed)
        } catch (e) {
          console.error('Failed to parse custom_ddays', e)
        }
      }
    }
  }

  const saveDdays = async (newList: CustomDday[]) => {
    setDdays(newList)
    if (window.api && window.api.db && window.api.db.updateSetting) {
      await window.api.db.updateSetting('custom_ddays', JSON.stringify(newList))
    }
    if (window.api && (window.api as any).mobile?.notifyChange) {
      (window.api as any).mobile.notifyChange()
    }
  }

  const handleAdd = async () => {
    if (!newTitle.trim() || !newDate) return

    // 일정 관리에 자동 등록
    let scheduleId: number | undefined
    if (window.api && window.api.db && window.api.db.addSchedule) {
      try {
        const res = await window.api.db.addSchedule({
          title: `[D-DAY] ${newTitle}`,
          start_date: newDate,
          category: 'event',
          color: '#7c3aed',
          is_completed: 0
        })
        if (res && res.id) scheduleId = res.id
      } catch (e) {
        console.error('Failed to add schedule for D-Day', e)
      }
    }

    const newList = [...ddays, { id: Date.now().toString(), title: newTitle, targetDate: newDate, scheduleId }]
    await saveDdays(newList)
    setNewTitle('')
    setNewDate('')
    if (onDdayChange) onDdayChange()
  }

  const handleEdit = (d: CustomDday) => {
    setEditingId(d.id)
    setEditTitle(d.title)
    setEditDate(d.targetDate)
  }

  const saveEdit = async () => {
    const item = ddays.find(d => d.id === editingId)
    const newList = ddays.map(d => {
      if (d.id === editingId) {
        return { ...d, title: editTitle, targetDate: editDate }
      }
      return d
    })
    // 연동 일정도 업데이트
    if (item?.scheduleId && window.api?.db?.updateSchedule) {
      try {
        await window.api.db.updateSchedule(item.scheduleId, {
          title: `[D-DAY] ${editTitle}`,
          start_date: editDate,
        })
      } catch (e) {}
    }
    await saveDdays(newList)
    setEditingId(null)
    if (onDdayChange) onDdayChange()
  }

  const handleDelete = async (id: string) => {
    const item = ddays.find(d => d.id === id)
    // 연동 일정도 삭제
    if (item?.scheduleId && window.api?.db?.deleteSchedule) {
      try { await window.api.db.deleteSchedule(item.scheduleId) } catch (e) {}
    }
    const newList = ddays.filter(d => d.id !== id)
    await saveDdays(newList)
    if (onDdayChange) onDdayChange()
  }

  const calcDday = (target: string) => {
    const t = new Date(target)
    t.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const diff = t.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'D-DAY'
    if (days < 0) return 'D+' + Math.abs(days)
    return 'D-' + days
  }

  const getDdayColor = (target: string) => {
    const t = new Date(target)
    t.setHours(0, 0, 0, 0)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const days = Math.ceil((t.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return { bg: 'bg-red-500', text: 'text-white', border: 'border-red-200' }
    if (days < 0) return { bg: 'bg-gray-200', text: 'text-gray-500', border: 'border-gray-100' }
    if (days <= 3) return { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-200' }
    if (days <= 7) return { bg: 'bg-yellow-400', text: 'text-yellow-900', border: 'border-yellow-200' }
    return { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-200' }
  }

  return (
    <div className="card flex flex-col p-4 h-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px' }}>
      <h3 className="font-bold text-sm flex items-center gap-2 mb-3" style={{ color: 'var(--text-primary)' }}>
        <Flag size={14} className="text-purple-500" /> D-DAY
      </h3>
      
      {/* 입력 폼 */}
      <div className="flex flex-col gap-1.5 mb-3">
        <input 
          type="text" 
          placeholder="일정 이름" 
          className="w-full border rounded-lg px-2.5 py-1.5 text-[11px] outline-none transition-shadow"
          style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <div className="flex gap-1.5">
          <input 
            type="date" 
            className="flex-1 border rounded-lg px-2 py-1.5 text-[11px] outline-none transition-shadow min-w-0"
            style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            value={newDate}
            onChange={e => setNewDate(e.target.value)}
          />
          <button 
            onClick={handleAdd}
            disabled={!newTitle.trim() || !newDate}
            className="w-7 h-7 flex items-center justify-center bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-lg transition-colors shrink-0"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* D-DAY 목록 */}
      <div className="flex flex-col gap-1.5 overflow-y-auto flex-1" style={{ scrollbarWidth: 'none' }}>
        {ddays.map(d => {
          const color = getDdayColor(d.targetDate)
          return (
            <div key={d.id} className={`rounded-xl p-2.5 border flex justify-between items-center ${color.border}`}
                 style={{ background: 'var(--bg-elevated)' }}>
              {editingId === d.id ? (
                <div className="flex-1 flex flex-col gap-1.5">
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="border rounded px-2 py-1 text-[11px] w-full outline-none"
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                  <div className="flex items-center gap-1">
                    <input 
                      type="date" 
                      value={editDate}
                      onChange={e => setEditDate(e.target.value)}
                      className="flex-1 border rounded px-2 py-1 text-[11px] outline-none min-w-0"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                    />
                    <button onClick={saveEdit} className="p-1 text-emerald-500 hover:bg-emerald-100 rounded"><Check size={12} /></button>
                    <button onClick={() => handleDelete(d.id)} className="p-1 text-red-500 hover:bg-red-100 rounded"><Trash2 size={12} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded"><X size={12} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="font-bold text-[11px] truncate" style={{ color: 'var(--text-primary)' }}>{d.title}</span>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{d.targetDate}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`${color.bg} ${color.text} font-bold px-2 py-0.5 rounded-full text-[10px]`}>
                      {calcDday(d.targetDate)}
                    </span>
                    <button onClick={() => handleEdit(d)} className="p-0.5 opacity-50 hover:opacity-100 transition-opacity">
                      <Edit2 size={10} style={{ color: 'var(--text-muted)' }} />
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}
        {ddays.length === 0 && (
          <div className="text-center py-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            등록된 D-Day가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}
