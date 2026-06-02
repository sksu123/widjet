import { useState, useEffect } from 'react'
import { Package, Plus, QrCode, Check, Search, Archive } from 'lucide-react'

interface LostItem {
  id: number; item_name: string; description: string; found_date: string
  found_location: string; image_path?: string; qr_code: string
  status: 'holding' | 'claimed'; finder_name: string; owner_name?: string
  storage_location: string; created_at: string
}

export default function LostItemsPage() {
  const [items, setItems] = useState<LostItem[]>([])
  const [filter, setFilter] = useState<'all' | 'holding' | 'claimed'>('all')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    item_name: '', description: '', found_date: new Date().toISOString().split('T')[0],
    found_location: '', finder_name: '', storage_location: ''
  })

  useEffect(() => { loadItems() }, [filter])

  async function loadItems() {
    const status = filter === 'all' ? undefined : filter
    const res = await window.api.db.getLostItems(status)
    if (res.success) setItems(res.data as LostItem[])
  }

  async function addItem() {
    if (!form.item_name || !form.found_date) return
    const res = await window.api.db.addLostItem(form)
    if (res.success) {
      setShowForm(false)
      setForm({ item_name: '', description: '', found_date: new Date().toISOString().split('T')[0], found_location: '', finder_name: '', storage_location: '' })
      loadItems()
    }
  }

  async function claimItem(id: number) {
    const ownerName = prompt('수령자 이름을 입력하세요:')
    if (!ownerName) return
    await window.api.db.claimLostItem(id, ownerName)
    loadItems()
  }

  const filtered = items.filter(i =>
    i.item_name.includes(search) || i.found_location?.includes(search) || i.qr_code?.includes(search)
  )

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
            <Package size={16} className="text-white" />
          </div>
          <h1 className="page-title">분실물 관리</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs">
          <Plus size={14} /> 분실물 등록
        </button>
      </div>

      {/* 현황 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '전체', value: items.length, color: '#94a3b8' },
          { label: '보관 중', value: items.filter(i => i.status === 'holding').length, color: '#f97316' },
          { label: '수령 완료', value: items.filter(i => i.status === 'claimed').length, color: '#10b981' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* 검색 & 필터 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input className="input pl-8 text-xs" value={search}
            onChange={e => setSearch(e.target.value)} placeholder="물품명, 위치, QR코드 검색" />
        </div>
        {(['all', 'holding', 'claimed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filter === f
              ? { background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white' }
              : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }>
            {f === 'all' ? '전체' : f === 'holding' ? '보관 중' : '수령 완료'}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="card text-center py-8">
            <Archive size={24} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>등록된 분실물이 없습니다</p>
          </div>
        ) : filtered.map(item => (
          <div key={item.id} className="card flex items-center gap-3"
            style={item.status === 'claimed' ? { opacity: 0.6 } : {}}>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: item.status === 'holding' ? 'rgba(249,115,22,0.15)' : 'rgba(16,185,129,0.15)' }}>
              <Package size={20} style={{ color: item.status === 'holding' ? '#f97316' : '#10b981' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.item_name}</p>
                <span className={item.status === 'holding' ? 'tag-orange' : 'tag-green'}>
                  {item.status === 'holding' ? '보관 중' : '수령 완료'}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {item.found_date} · {item.found_location}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                발견자: {item.finder_name} · QR: {item.qr_code}
              </p>
              {item.description && (
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{item.description}</p>
              )}
            </div>
            {item.status === 'holding' && (
              <button onClick={() => claimItem(item.id)}
                className="btn-mint flex-shrink-0 text-xs px-3">
                <Check size={13} /> 수령
              </button>
            )}
          </div>
        ))}
      </div>

      {/* 등록 모달 */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="card w-96 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>분실물 등록</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">물품명</label>
                <input className="input" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} placeholder="예: 검정 우산" />
              </div>
              <div>
                <label className="label">발견 날짜</label>
                <input className="input" type="date" value={form.found_date} onChange={e => setForm({ ...form, found_date: e.target.value })} />
              </div>
              <div>
                <label className="label">발견 위치</label>
                <input className="input" value={form.found_location} onChange={e => setForm({ ...form, found_location: e.target.value })} placeholder="예: 3층 화장실" />
              </div>
              <div>
                <label className="label">보관 위치</label>
                <input className="input" value={form.storage_location} onChange={e => setForm({ ...form, storage_location: e.target.value })} placeholder="예: 행정실 캐비닛" />
              </div>
              <div>
                <label className="label">발견자</label>
                <input className="input" value={form.finder_name} onChange={e => setForm({ ...form, finder_name: e.target.value })} placeholder="예: 홍길동" />
              </div>
            </div>
            <div>
              <label className="label">설명</label>
              <textarea className="input resize-none" rows={2} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} placeholder="물품 특징 등" />
            </div>
            <div className="flex gap-2">
              <button onClick={addItem} className="btn-primary flex-1 justify-center text-sm">등록</button>
              <button onClick={() => setShowForm(false)} className="btn-ghost flex-1 justify-center text-sm">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
