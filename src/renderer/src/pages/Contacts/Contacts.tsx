import { useState, useEffect } from 'react'
import { Phone, Mail, Plus, Pencil, Trash2, Save, X, BookUser, Search } from 'lucide-react'

interface Contact {
  id: number
  name: string
  phone: string
  email: string
  note: string
  sort_order: number
}

const EMPTY_FORM = { name: '', phone: '', email: '', note: '' }

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)

  useEffect(() => { loadContacts() }, [])

  async function loadContacts() {
    const res = await window.api.db.getContacts()
    if (res.success) setContacts(res.data as Contact[])
  }

  function openAdd() {
    setEditId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(c: Contact) {
    setEditId(c.id)
    setForm({ name: c.name, phone: c.phone, email: c.email, note: c.note })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editId !== null) {
        await window.api.db.updateContact(editId, form as Record<string, unknown>)
      } else {
        await window.api.db.addContact(form as Record<string, unknown>)
      }
      await loadContacts()
      closeForm()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: number) {
    await window.api.db.deleteContact(id)
    setDeleteConfirmId(null)
    await loadContacts()
  }

  const filtered = contacts.filter(c =>
    c.name.includes(search) ||
    c.phone.includes(search) ||
    c.email.includes(search) ||
    c.note.includes(search)
  )

  return (
    <div className="fade-in space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
            <BookUser size={16} className="text-white" />
          </div>
          <h1 className="page-title">주요 연락처</h1>
        </div>
        <button onClick={openAdd} className="btn-mint text-xs">
          <Plus size={14} /> 연락처 추가
        </button>
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input
          className="input pl-8"
          placeholder="이름, 연락처, 이메일, 비고 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* 연락처 테이블 */}
      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
              {['연번', '상호명', '연락처', '이메일', '비고', '관리'].map(h => (
                <th key={h}
                  className="px-4 py-3 text-left text-xs font-semibold"
                  style={{ color: 'var(--text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {search ? '검색 결과가 없습니다.' : '등록된 연락처가 없습니다. [연락처 추가] 버튼으로 추가해 주세요.'}
                </td>
              </tr>
            ) : filtered.map((c, idx) => (
              <tr key={c.id}
                style={{ borderBottom: '1px solid var(--border)' }}
                className="transition-colors hover:bg-white/[0.03]">
                <td className="px-4 py-3 text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {idx + 1}
                </td>
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>
                  {c.name}
                </td>
                <td className="px-4 py-3">
                  {c.phone ? (
                    <a href={`tel:${c.phone}`} className="flex items-center gap-1.5 text-xs hover:underline"
                      style={{ color: 'var(--accent-mint)' }}>
                      <Phone size={12} /> {c.phone}
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-xs hover:underline"
                      style={{ color: 'var(--accent-blue)' }}>
                      <Mail size={12} /> {c.email}
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs max-w-[160px] truncate" style={{ color: 'var(--text-secondary)' }}>
                  {c.note || '-'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(c)}
                      className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                      title="수정">
                      <Pencil size={13} style={{ color: 'var(--accent-blue)' }} />
                    </button>
                    {deleteConfirmId === c.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(c.id)}
                          className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
                          삭제
                        </button>
                        <button onClick={() => setDeleteConfirmId(null)}
                          className="text-[10px] px-2 py-1 rounded hover:bg-white/10"
                          style={{ color: 'var(--text-muted)' }}>
                          취소
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirmId(c.id)}
                        className="p-1.5 rounded-md transition-colors hover:bg-white/10"
                        title="삭제">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
        총 {filtered.length}건
      </p>

      {/* 등록/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="card w-full max-w-md mx-4 space-y-4 slide-up"
            style={{ background: 'var(--bg-secondary)', boxShadow: 'var(--shadow)' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editId !== null ? '연락처 수정' : '연락처 추가'}
              </h2>
              <button onClick={closeForm} className="p-1 rounded hover:bg-white/10">
                <X size={16} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label">상호명 <span className="text-red-400">*</span></label>
                <input className="input" placeholder="예) ○○교육청 행정팀"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">연락처</label>
                <input className="input" placeholder="예) 062-000-0000"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">이메일</label>
                <input className="input" type="email" placeholder="예) office@edu.go.kr"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">비고</label>
                <textarea className="input resize-none" rows={2} placeholder="메모..."
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={closeForm} className="btn-ghost text-xs">취소</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()} className="btn-mint text-xs">
                <Save size={13} /> {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
