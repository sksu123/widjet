import { useState } from 'react'
import { BookOpen, Sparkles, Copy, Download, ChevronRight, Search } from 'lucide-react'

export default function Edufine() {
  const [projectName, setProjectName] = useState('')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeTab, setActiveTab] = useState<'budget'>('budget')

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

      {/* 탭 및 외부 링크 */}
      <div className="flex gap-2 flex-wrap">
        <button
          className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all text-white"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}
        >
          예산과목 추천
        </button>
        <button
          onClick={() => window.open('https://spen-blue.vercel.app/', '_blank')}
          className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 hover:opacity-80"
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#ffffff'
          }}
        >
          <Search size={12} />
          지능형학교예산 집행률 분석 앱 ↗
        </button>
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

    </div>
  )
}
