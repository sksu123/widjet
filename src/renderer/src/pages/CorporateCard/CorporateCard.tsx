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
  
  const [manageForm, setManageForm] = useState({ id: 0, card_name: '', card_number: '' })
  const [showManage, setShowManage] = useState(false)

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

  async function handleSaveCard() {
    if (!manageForm.card_name) return
    if (manageForm.id === 0) {
      await window.api.db.addCard(manageForm)
    } else {
      await window.api.db.updateCard(manageForm.id, manageForm)
    }
    setShowManage(false)
    setManageForm({ id: 0, card_name: '', card_number: '' })
    loadCards()
  }

  async function handleDeleteCard(id: number) {
    if (confirm('정말로 이 법인카드를 삭제하시겠습니까? (관련 이력도 함께 삭제될 수 있습니다)')) {
      await window.api.db.deleteCard(id)
      loadCards()
    }
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
        <div className="flex gap-2">
          <button onClick={() => { setManageForm({ id: 0, card_name: '', card_number: '' }); setShowManage(true) }} className="btn-primary text-xs">
            + 카드 추가
          </button>
          <button onClick={loadHistory} className="btn-ghost text-xs">
            <History size={13} /> 이용 기록
          </button>
        </div>
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
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-medium truncate pr-2">{card.card_name}</p>
                  <p className="text-white/60 text-xs mt-1">{card.card_number}</p>
                </div>
                {card.is_available === 1 && (
                  <div className="flex gap-1">
                    <button onClick={() => { setManageForm({ id: card.id, card_name: card.card_name, card_number: card.card_number }); setShowManage(true) }} className="text-white/60 hover:text-white text-[10px] px-1">수정</button>
                    <button onClick={() => handleDeleteCard(card.id)} className="text-red-400/80 hover:text-red-400 text-[10px] px-1">삭제</button>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  card.is_available === 1 ? 'bg-green-500/30 text-green-300' : 'bg-amber-500/30 text-amber-300'
                }`}>
                  {card.is_available === 1 ? '● 이용 가능' : '● 대여 중'}
                </span>
                <CreditCard size={18} className="text-white/20" />
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

      {/* 카드 관리 모달 */}
      {showManage && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="card w-80 space-y-3" style={{ background: 'var(--bg-secondary)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{manageForm.id === 0 ? '새 법인카드 추가' : '법인카드 정보 수정'}</p>
            <div>
              <label className="label">카드 명칭</label>
              <input className="input" value={manageForm.card_name}
                onChange={e => setManageForm({ ...manageForm, card_name: e.target.value })} placeholder="예: 법인카드 1호" />
            </div>
            <div>
              <label className="label">카드 번호 (선택)</label>
              <input className="input" value={manageForm.card_number}
                onChange={e => setManageForm({ ...manageForm, card_number: e.target.value })} placeholder="**** **** **** 1234" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSaveCard} className="btn-primary flex-1 justify-center text-sm">저장</button>
              <button onClick={() => setShowManage(false)} className="btn-ghost flex-1 justify-center text-sm">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 이용기록 모달 */}
      {showHistory && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="card w-[480px] max-h-[70vh] flex flex-col" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <History size={16} /> 법인카드 이용기록
              </p>
              <button onClick={() => setShowHistory(false)}
                className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
                style={{ color: 'var(--text-muted)' }}>✕ 닫기</button>
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>이용기록이 없습니다.</p>
            ) : (
              <div className="overflow-y-auto space-y-2 pr-1">
                {(history as Array<{
                  id: number; card_name: string; borrower_name: string; borrower_dept: string;
                  purpose: string; borrowed_at: string; returned_at?: string
                }>).map((h) => (
                  <div key={h.id} className="rounded-lg p-3 text-xs space-y-1"
                    style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        📋 {h.card_name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${h.returned_at
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-amber-500/20 text-amber-400'}`}>
                        {h.returned_at ? '반납완료' : '대여중'}
                      </span>
                    </div>
                    <div className="flex gap-4" style={{ color: 'var(--text-secondary)' }}>
                      <span>👤 {h.borrower_name} ({h.borrower_dept})</span>
                      <span>📌 {h.purpose}</span>
                    </div>
                    <div className="flex gap-4" style={{ color: 'var(--text-muted)' }}>
                      <span>대여: {new Date(h.borrowed_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      {h.returned_at && (
                        <span>반납: {new Date(h.returned_at).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
