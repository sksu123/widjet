import { useState } from 'react'
import { BookOpen, Sparkles, Copy, Download, ChevronRight, Search } from 'lucide-react'

export default function Edufine() {
  const [projectName, setProjectName] = useState('')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeTab, setActiveTab] = useState<'budget' | 'check' | 'draft'>('budget')

  const recommend = async () => {
    if (!projectName || !item || !amount) return
    setLoading(true)
    setResult('')
    try {
      const res = await window.api.ai.recommendBudget({
        projectName, item, amount: parseInt(amount.replace(/,/g, ''))
      })
      if (res.success) setResult(res.text)
      else setResult(`오류: ${res.error}`)
    } finally {
      setLoading(false)
    }
  }

  const BUDGET_EXAMPLES = [
    { project: '학교 교육활동 지원', item: '복사용지 A4 10박스', amount: '50,000' },
    { project: '교직원 역량강화 연수', item: '외부 강사비', amount: '300,000' },
    { project: '학교환경개선사업', item: '에어컨 필터 교체', amount: '150,000' },
    { project: '방과후학교 운영', item: '강사 수당', amount: '500,000' },
  ]

  const CHECK_ITEMS = [
    { category: '예산 편성', items: ['세출예산 편성기준 준수 여부', '목별 한도 초과 여부', '이월사업 적정성'] },
    { category: '지출 절차', items: ['지출품의서 작성', '결재 절차 이행', '증빙서류 구비', '선금·개인결제 금지'] },
    { category: '계약 사항', items: ['수의계약 한도 준수', '입찰 공고 기간', '낙찰자 결정 방법', '계약서 체결'] },
    { category: '물품 관리', items: ['물품 수불부 기록', '내용연수 관리', '불용품 처리 절차'] },
  ]

  return (
    <div className="fade-in space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
          <BookOpen size={16} className="text-white" />
        </div>
        <div>
          <h1 className="page-title">K-에듀파인 업무도우미</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>예산과목 추천 · 회계 검토 · 집행 가능 여부</p>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1.5">
        {[
          { key: 'budget', label: '예산과목 추천' },
          { key: 'check', label: '회계 체크리스트' },
          { key: 'draft', label: '품의서 예시' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === key ? 'text-white' : 'hover:bg-white/5'
            }`}
            style={activeTab === key
              ? { background: 'linear-gradient(135deg, #14b8a6, #0d9488)', color: 'white' }
              : { color: 'var(--text-muted)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'budget' && (
        <div className="space-y-4">
          {/* 입력 폼 */}
          <div className="card space-y-3">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>지출 정보 입력</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">사업명</label>
                <input className="input" value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="예: 학교 교육활동 지원" />
              </div>
              <div>
                <label className="label">품목</label>
                <input className="input" value={item}
                  onChange={e => setItem(e.target.value)}
                  placeholder="예: 복사용지 A4 10박스" />
              </div>
            </div>
            <div>
              <label className="label">금액 (원)</label>
              <input className="input" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="예: 50,000" />
            </div>
            <button onClick={recommend} disabled={loading || !projectName || !item || !amount}
              className="btn-mint w-full justify-center"
              style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? <span className="spinner" /> : <Sparkles size={14} />}
              예산과목 추천 받기
            </button>
          </div>

          {/* 예시 클릭 */}
          <div>
            <p className="section-title">빠른 예시</p>
            <div className="grid grid-cols-2 gap-2">
              {BUDGET_EXAMPLES.map(ex => (
                <button key={ex.project} onClick={() => {
                  setProjectName(ex.project); setItem(ex.item); setAmount(ex.amount)
                }}
                  className="card text-left hover:border-teal-500/30 text-xs group">
                  <p className="font-medium mb-1 truncate" style={{ color: 'var(--text-primary)' }}>{ex.project}</p>
                  <p style={{ color: 'var(--text-muted)' }}>{ex.item}</p>
                  <p style={{ color: 'var(--accent-mint)' }}>{ex.amount}원</p>
                </button>
              ))}
            </div>
          </div>

          {/* 결과 */}
          {result && (
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AI 추천 결과</p>
                <button onClick={() => navigator.clipboard.writeText(result)}
                  className="btn-ghost text-xs py-1 px-2">
                  <Copy size={12} /> 복사
                </button>
              </div>
              <div className="prose-chat text-xs leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: result
                    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent-mint)">$1</strong>')
                    .replace(/\n/g, '<br/>')
                }} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'check' && (
        <div className="space-y-3">
          {CHECK_ITEMS.map(({ category, items }) => (
            <div key={category} className="card">
              <p className="text-sm font-semibold mb-3" style={{ color: 'var(--accent-mint)' }}>{category}</p>
              <div className="space-y-2">
                {items.map(item => (
                  <label key={item} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="w-3.5 h-3.5 rounded accent-teal-500" />
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'draft' && (
        <div className="card">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>지출품의서 예시</p>
          <div className="text-xs leading-loose p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
            <p className="font-bold text-center mb-3" style={{ color: 'var(--text-primary)' }}>지 출 품 의 서</p>
            <p>○ 사업명: [사업명]</p>
            <p>○ 세출예산과목</p>
            <p className="ml-4">- 정책사업: [정책사업명]</p>
            <p className="ml-4">- 단위사업: [단위사업명]</p>
            <p className="ml-4">- 세부사업: [세부사업명]</p>
            <p className="ml-4">- 목: [목명] / 세목: [세목명]</p>
            <p>○ 지출목적: [목적]</p>
            <p>○ 지출내역</p>
            <p className="ml-4">- 품목: [품목명]</p>
            <p className="ml-4">- 수량: [수량]</p>
            <p className="ml-4">- 단가: [단가]원</p>
            <p className="ml-4">- 금액: [금액]원</p>
            <p>○ 지출금액: 일금 [금액] 원정 (₩ [숫자])</p>
            <p>○ 지출방법: [현금/계좌이체/법인카드]</p>
            <p>○ 수령인(처): [수령인명]</p>
          </div>
        </div>
      )}
    </div>
  )
}
