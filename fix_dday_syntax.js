const fs = require('fs');

const ddayCode = \import { useState, useEffect } from 'react'
import { Flag, Plus, Edit2, Trash2, Check, X } from 'lucide-react'

export interface CustomDday {
  id: string
  title: string
  targetDate: string // YYYY-MM-DD
}

export default function DdayPanel() {
  const [ddays, setDdays] = useState<CustomDday[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDate, setEditDate] = useState('')

  useEffect(() => {
    loadDdays()
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
  }

  const handleAdd = () => {
    if (!newTitle.trim() || !newDate) return
    const newList = [...ddays, { id: Date.now().toString(), title: newTitle, targetDate: newDate }]
    saveDdays(newList)
    setNewTitle('')
    setNewDate('')
  }

  const handleEdit = (d: CustomDday) => {
    setEditingId(d.id)
    setEditTitle(d.title)
    setEditDate(d.targetDate)
  }

  const saveEdit = () => {
    const newList = ddays.map(d => {
      if (d.id === editingId) {
        return { ...d, title: editTitle, targetDate: editDate }
      }
      return d
    })
    saveDdays(newList)
    setEditingId(null)
  }

  const handleDelete = (id: string) => {
    const newList = ddays.filter(d => d.id !== id)
    saveDdays(newList)
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

  return (
    <div className="card flex flex-col p-4 shrink-0 h-full bg-white shadow-sm border border-gray-100 rounded-2xl">
      <h3 className="font-bold text-sm flex items-center gap-2 mb-4" style={{ color: 'var(--text-primary)' }}>
        <Flag size={16} className="text-blue-500" /> D-DAY
      </h3>
      
      <div className="flex items-center gap-2 mb-4">
        <input 
          type="text" 
          placeholder="이름/프로젝트" 
          className="flex-1 border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-shadow min-w-0"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
        />
        <input 
          type="date" 
          className="flex-1 border rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-100 transition-shadow min-w-0"
          value={newDate}
          onChange={e => setNewDate(e.target.value)}
        />
        <button 
          onClick={handleAdd}
          disabled={!newTitle.trim() || !newDate}
          className="w-8 h-8 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg transition-colors shrink-0"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-2 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {ddays.map(d => (
          <div key={d.id} className="bg-gray-50/80 rounded-xl p-3 flex justify-between items-center border border-gray-100/50">
            {editingId === d.id ? (
              <div className="flex-1 flex flex-col gap-2">
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="border rounded px-2 py-1 text-xs w-full outline-none focus:ring-1 focus:ring-blue-200"
                />
                <div className="flex items-center gap-2">
                  <input 
                    type="date" 
                    value={editDate}
                    onChange={e => setEditDate(e.target.value)}
                    className="border rounded px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-200"
                  />
                  <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded">
                    <Check size={14} />
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="p-1 text-red-500 hover:bg-red-100 rounded">
                    <Trash2 size={14} />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-gray-500 hover:bg-gray-200 rounded">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-bold text-sm text-gray-800 truncate">{d.title}</span>
                  <span className="text-xs text-gray-500">{d.targetDate}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded-full text-xs">
                    {calcDday(d.targetDate)}
                  </span>
                  <button onClick={() => handleEdit(d)} className="p-1 text-gray-400 hover:text-gray-700 transition-colors">
                    <Edit2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {ddays.length === 0 && (
          <div className="text-center py-4 text-xs text-gray-400">
            등록된 D-Day가 없습니다.
          </div>
        )}
      </div>
    </div>
  )
}\

fs.writeFileSync('src/renderer/src/components/DdayPanel/DdayPanel.tsx', ddayCode);
