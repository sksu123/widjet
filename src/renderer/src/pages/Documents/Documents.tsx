import { useState, useEffect } from 'react'
import { FileText, Search, Copy, Download, Star } from 'lucide-react'

interface Document { id: number; title: string; category: string; tags: string; use_count: number }

const CATEGORIES = ['전체', '회계', '출장', '물품', '계약', '회의', '보고서']

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('전체')
  const [generating, setGenerating] = useState<number | null>(null)
  const [draftResult, setDraftResult] = useState<{ id: number; text: string } | null>(null)
  const [docInputs, setDocInputs] = useState<Record<number, string>>({})
  
  const [showFastReport, setShowFastReport] = useState(false)
  const [fastReportForm, setFastReportForm] = useState({ subject: '', deadline: '', keywords: '' })
  const [fastReportResult, setFastReportResult] = useState('')

  useEffect(() => { loadDocs() }, [activeCategory])

  async function loadDocs() {
    const cat = activeCategory === '전체' ? undefined : activeCategory
    const res = await window.api.db.getDocuments(cat)
    if (res.success) setDocs(res.data as Document[])
  }

  async function handleSearch() {
    if (!search.trim()) { loadDocs(); return }
    const res = await window.api.db.searchDocuments(search)
    if (res.success) setDocs(res.data as Document[])
  }

  async function generateDraft(doc: Document) {
    setGenerating(doc.id)
    await window.api.db.incrementDocUse(doc.id)
    const userContext = docInputs[doc.id] || ''
    const contextStr = userContext ? `${doc.category} 관련 ${doc.title}. 세부상황: ${userContext}` : `${doc.category} 관련 ${doc.title}`
    const res = await window.api.ai.draftDocument({ type: doc.title, context: contextStr })
    if (res.success) setDraftResult({ id: doc.id, text: res.text })
    setGenerating(null)
  }

  async function generateFastReport() {
    if (!fastReportForm.subject) return
    setGenerating(9999) // 임시 ID
    const contextStr = `주제: ${fastReportForm.subject}\n기한: ${fastReportForm.deadline}\n핵심키워드: ${fastReportForm.keywords}\n이 내용을 바탕으로 보고서 초안을 작성해주세요.`
    const res = await window.api.ai.draftDocument({ type: '간편 보고서', context: contextStr })
    if (res.success) setFastReportResult(res.text)
    setGenerating(null)
  }

  return (
    <div className="fade-in space-y-4 relative">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <FileText size={16} className="text-white" />
          </div>
          <h1 className="page-title">공문 및 문서 관리</h1>
        </div>
        <button onClick={() => setShowFastReport(true)} className="btn-primary text-xs">
          + 간편 보고서 작성
        </button>
      </div>

      {/* 검색 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input className="input pl-8" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="문서명, 태그 검색..." />
        </div>
        <button onClick={handleSearch} className="btn-mint text-xs px-4">검색</button>
      </div>

      {/* 카테고리 필터 */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all`}
            style={activeCategory === cat
              ? { background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white' }
              : { background: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border)' }
            }>
            {cat}
          </button>
        ))}
      </div>

      {/* 문서 목록 */}
      <div className="grid grid-cols-2 gap-3">
        {docs.map(doc => (
          <div key={doc.id} className="card hover:border-emerald-500/20 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{doc.title}</p>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <span className="tag-green">{doc.category}</span>
                  {doc.tags?.split(',').slice(0, 2).map(t => (
                    <span key={t} className="badge" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                      {t.trim()}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <Star size={10} /> {doc.use_count}
              </div>
            </div>

            <div className="space-y-2">
              <input 
                className="input text-xs w-full" 
                placeholder={doc.category === '보고서' ? "예: 주간업무보고, 주요내용: 보안점검 결과 및 계획..." : "상황이나 세부 내용을 입력하세요 (선택)"}
                value={docInputs[doc.id] || ''}
                onChange={e => setDocInputs(prev => ({ ...prev, [doc.id]: e.target.value }))}
              />
              <div className="flex gap-2">
                <button onClick={() => generateDraft(doc)}
                  disabled={generating === doc.id}
                  className="btn-mint flex-1 justify-center text-xs"
                  style={{ opacity: generating === doc.id ? 0.6 : 1 }}>
                  {generating === doc.id ? <span className="spinner" /> : null}
                  AI 초안 생성
                </button>
              </div>
            </div>

            {draftResult?.id === doc.id && (
              <div className="mt-2 p-3 rounded-lg text-xs leading-relaxed overflow-y-auto max-h-40"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                <div className="flex justify-end mb-1">
                  <button onClick={() => navigator.clipboard.writeText(draftResult.text)}
                    className="btn-ghost text-xs py-0.5 px-2">
                    <Copy size={10} /> 복사
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans">{draftResult.text}</pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 간편 보고서 작성 모달 */}
      {showFastReport && (
        <div className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="card w-96 max-h-[90vh] overflow-y-auto space-y-4" style={{ background: 'var(--bg-secondary)' }}>
            <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>간편 보고서 작성</p>
            <div>
              <label className="label">보고서 주제 (필수)</label>
              <input className="input" value={fastReportForm.subject}
                onChange={e => setFastReportForm({ ...fastReportForm, subject: e.target.value })} placeholder="예: 상반기 소방시설 점검 결과" />
            </div>
            <div>
              <label className="label">제출 기한</label>
              <input className="input" value={fastReportForm.deadline}
                onChange={e => setFastReportForm({ ...fastReportForm, deadline: e.target.value })} placeholder="예: 2026.06.15 까지" />
            </div>
            <div>
              <label className="label">핵심 키워드 및 주요 내용</label>
              <textarea className="input min-h-[60px]" value={fastReportForm.keywords}
                onChange={e => setFastReportForm({ ...fastReportForm, keywords: e.target.value })} placeholder="예: 소화기 교체 10개, 피난유도등 정상 작동 확인..." />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={generateFastReport} disabled={generating === 9999 || !fastReportForm.subject} 
                className="btn-primary flex-1 justify-center text-sm" style={{ opacity: generating === 9999 ? 0.6 : 1 }}>
                {generating === 9999 ? <span className="spinner" /> : null} AI 초안 생성
              </button>
              <button onClick={() => { setShowFastReport(false); setFastReportResult(''); }} className="btn-ghost flex-1 justify-center text-sm">닫기</button>
            </div>
            {fastReportResult && (
              <div className="mt-3 p-3 rounded-lg text-xs leading-relaxed" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                <div className="flex justify-end mb-1">
                  <button onClick={() => navigator.clipboard.writeText(fastReportResult)} className="btn-ghost text-xs py-0.5 px-2">
                    <Copy size={10} /> 복사
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-sans">{fastReportResult}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
