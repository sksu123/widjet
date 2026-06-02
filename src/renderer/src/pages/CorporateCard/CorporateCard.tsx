import { useState, useEffect } from 'react'
import { CreditCard, ArrowDownCircle, ArrowUpCircle, History, AlertTriangle } from 'lucide-react'

interface Card {
  id: number; card_name: string; card_number: string; is_available: number
  borrower_name?: string; borrower_dept?: string; purpose?: string
  borrowed_at?: string; due_date?: string
}

export default function CorporateCardPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [borrowForm, setBorrowForm] = useState({ borrower_name: '', borrower_dept: '', purpose: '', due_date: '' })
  const [showBorrow, setShowBorrow] = useState(false)
  const [history, setHistory] = useState<unknown[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => { loadCards() }, [])

  async function loadCards() {
    const res = await window.api.db.getCards()
    if (res.success) setCards(res.data as Card[])
  }

  async function handleBorrow() {
    if (!selectedCard || !borrowForm.borrower_name || !borrowForm.purpose) return
    await window.api.db.borrowCard(selectedCard.id, borrowForm)
    setShowBorrow(false)
    setBorrowForm({ borrower_name: '', borrower_dept: '', purpose: '', due_date: '' })
    setSelectedCard(null)
    loadCards()
  }

  async function handleReturn(cardId: number) {
    await window.api.db.returnCard(cardId)
    loadCards()
  }

  async function loadHistory() {
    const res = await window.api.db.getCardHistory()
    if (res.success) setHistory(res.data as unknown[])
    setShowHistory(true)
  }

  const available = cards.filter(c => c.is_available === 1).length
  const borrowed = cards.filter(c => c.is_available === 0).length

  // 연체 카드 (반납일 초과)
  const overdue = cards.filter(c => c.is_available === 0 && c.due_date && new Date(c.due_date) < new Date())

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)' }}>
            <CreditCard size={16} className="text-white" />
          </div>
          <h1 className="page-title">법인카드 관리</h1>
        </div>
        <button onClick={loadHistory} className="btn-ghost text-xs">
          <History size={13} /> 이용 기록
        </button>
      </div>

      {/* 현황 요약 */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '전체', value: cards.length, color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
          { label: '이용 가능', value: available, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { label: '대여 중', value: borrowed, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="card flex items-center gap-3" style={{ borderColor: `${color}33` }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: bg }}>
              <span className="text-lg font-bold" style={{ color }}>{value}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* 연체 경고 */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg text-sm"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
          <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">
            연체 카드 {overdue.length}건 - {overdue.map(c => c.borrower_name).join(', ')}
          </p>
        </div>
      )}

      {/* 카드 목록 */}
      <div className="grid grid-cols-2 gap-3">
        {cards.map(card => (
          <div key={card.id} className="card"
            style={card.is_available === 0 ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}>
            {/* 카드 비주얼 */}
            <div className="rounded-xl p-4 mb-3"
              style={{
                background: card.is_available === 1
                  ? 'linear-gradient(135deg, #1e40af, #1e3a8a)'
                  : 'linear-gradient(135deg, #374151, #1f2937)',
                height: '80px'
              }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white text-xs font-medium">{card.card_name}</p>
                  <p className="text-white/60 text-xs mt-1">{card.card_number}</p>
                </div>
                <CreditCard size={20} className="text-white/40" />
              </div>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  card.is_available === 1 ? 'bg-green-500/30 text-green-300' : 'bg-amber-500/30 text-amber-300'
                }`}>
                  {card.is_available === 1 ? '● 이용 가능' : '● 대여 중'}
                </span>
              </div>
            </div>

            {card.is_available === 0 && (
              <div className="text-xs space-y-1 mb-3" style={{ color: 'var(--text-secondary)' }}>
                <p>대여자: <span style={{ color: 'var(--text-primary)' }}>{card.borrower_name} ({card.borrower_dept})</span></p>
                <p>목적: {card.purpose}</p>
                {card.due_date && (
                  <p>반납 예정: <span style={{ color: new Date(card.due_date) < new Date() ? '#ef4444' : '#f59e0b' }}>
                    {new Date(card.due_date).toLocaleDateString('ko-KR')}
                  </span></p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {card.is_available === 1 ? (
                <button
                  onClick={() => { setSelectedCard(card); setShowBorrow(true) }}
                  className="btn-primary flex-1 justify-center text-xs">
                  <ArrowDownCircle size={13} /> 대여
                </button>
              ) : (
                <button
                  onClick={() => handleReturn(card.id)}
                  className="btn-mint flex-1 justify-center text-xs">
                  <ArrowUpCircle size={13} /> 반납
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 대여 모달 */}
      {showBorrow && selectedCard && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="card w-80 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selectedCard.card_name} 대여</p>
            <div>
              <label className="label">대여자 이름</label>
              <input className="input" value={borrowForm.borrower_name}
                onChange={e => setBorrowForm({ ...borrowForm, borrower_name: e.target.value })} placeholder="홍길동" />
            </div>
            <div>
              <label className="label">부서</label>
              <input className="input" value={borrowForm.borrower_dept}
                onChange={e => setBorrowForm({ ...borrowForm, borrower_dept: e.target.value })} placeholder="행정실" />
            </div>
            <div>
              <label className="label">사용 목적</label>
              <input className="input" value={borrowForm.purpose}
                onChange={e => setBorrowForm({ ...borrowForm, purpose: e.target.value })} placeholder="소모품 구매" />
            </div>
            <div>
              <label className="label">반납 예정일</label>
              <input className="input" type="date" value={borrowForm.due_date}
                onChange={e => setBorrowForm({ ...borrowForm, due_date: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleBorrow} className="btn-primary flex-1 justify-center text-sm">대여 등록</button>
              <button onClick={() => setShowBorrow(false)} className="btn-ghost flex-1 justify-center text-sm">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
