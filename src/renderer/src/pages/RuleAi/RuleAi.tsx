import { useState, useEffect, useRef, useCallback } from 'react'
import { History, FileText, Upload, Trash2, CheckCircle, RefreshCcw, AlertTriangle, Send, Search, ExternalLink, Power, PowerOff, Zap, X, BookOpen } from 'lucide-react'
import { format } from 'date-fns'

// ─── 커스텀 Confirm 모달 (confirm() 대체 – 키보드 먹통 방지) ─────────────────
interface ConfirmState {
  open: boolean
  message: string
  onConfirm: () => void
}

function useConfirmModal() {
  const [state, setState] = useState<ConfirmState>({ open: false, message: '', onConfirm: () => {} })

  const confirm = useCallback((message: string, onConfirm: () => void) => {
    setState({ open: true, message, onConfirm })
  }, [])

  const close = useCallback(() => {
    setState({ open: false, message: '', onConfirm: () => {} })
  }, [])

  const handleOk = useCallback(() => {
    state.onConfirm()
    close()
  }, [state, close])

  return { state, confirm, close, handleOk }
}

function ConfirmModal({ state, close, handleOk }: { state: ConfirmState; close: () => void; handleOk: () => void }) {
  if (!state.open) return null
  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 99999, background: 'rgba(0,0,0,0.45)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        className="rounded-2xl shadow-2xl p-6 flex flex-col gap-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minWidth: 280, maxWidth: 380 }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>
          {state.message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            autoFocus
            onClick={close}
            className="px-4 py-1.5 rounded-lg text-sm transition-colors"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
          >
            취소
          </button>
          <button
            onClick={handleOk}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors bg-red-500 hover:bg-red-600 text-white"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

export default function RuleAi() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [chats, setChats] = useState<any[]>([])
  const [currentChatId, setCurrentChatId] = useState<number | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [inputValue, setInputValue] = useState('')
  const [followUpValue, setFollowUpValue] = useState('')
  const [isAnswering, setIsAnswering] = useState(false)
  const [evidenceCount, setEvidenceCount] = useState<3|5|8>(3)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalContent, setModalContent] = useState('')
  const [modalTitle, setModalTitle] = useState('')
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({})

  const scrollRef = useRef<HTMLDivElement>(null)
  const { state: confirmState, confirm, close: closeConfirm, handleOk: handleConfirmOk } = useConfirmModal()

  useEffect(() => {
    loadDocuments()
    loadChats()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isAnswering])

  const loadDocuments = async () => {
    setLoadingDocs(true)
    const res = await window.api.ruleAi.getDocuments()
    if (res.success) setDocuments(res.data)
    setLoadingDocs(false)
  }

  const loadChats = async () => {
    const res = await window.api.ruleAi.getChats()
    if (res.success) setChats(res.data)
  }

  const loadMessages = async (chatId: number) => {
    const res = await window.api.ruleAi.getMessages(chatId)
    if (res.success) {
      setMessages(res.data.map((m: any) => ({
        ...m,
        sources: m.sources ? JSON.parse(m.sources) : null
      })))
      setCurrentChatId(chatId)
    }
  }

  const handleFileUpload = async () => {
    const res = await window.api.file.openDialog({
      filters: [{ name: '지원 문서', extensions: ['pdf', 'txt', 'hwp', 'hwpx', 'docx'] }],
      properties: ['openFile', 'multiSelections']
    })
    if (res.success && res.paths && res.paths.length > 0) {
      for (const p of res.paths) {
        await window.api.ruleAi.uploadDocument(p)
      }
      loadDocuments()
    }
    // 파일 다이얼로그 닫힌 후 포커스 복원 (취소/선택 무관)
    setTimeout(() => { window.focus() }, 100)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    for (const file of Array.from(e.dataTransfer.files)) {
      const filePath = (file as any).path
      if (filePath && /\.(pdf|txt|hwp|hwpx|docx)$/i.test(filePath)) {
        await window.api.ruleAi.uploadDocument(filePath)
      }
    }
    loadDocuments()
  }

  const toggleDocument = async (id: number, isActive: boolean) => {
    await window.api.ruleAi.toggleDocument(id, !isActive)
    loadDocuments()
  }

  const deleteDocument = (id: number) => {
    confirm('문서를 삭제하시겠습니까?', async () => {
      await window.api.ruleAi.deleteDocument(id)
      loadDocuments()
    })
  }

  const handleSendPrimary = () => {
    if (!inputValue.trim()) return
    let extra = '';
    if (evidenceCount === 3) extra = ' (근거 조항은 핵심적인 3개 위주로 제시해주세요)';
    else if (evidenceCount === 5) extra = ' (근거 조항은 5개 내외로 제시해주세요)';
    else extra = ' (근거 조항을 폭넓게 여러 개 제시해주세요)';
    handleSendMessage(inputValue + extra, true)
  }

  const handleSendFollowUp = () => {
    if (!followUpValue.trim()) return
    handleSendMessage(followUpValue, false)
  }

  const handleSendMessage = async (question: string, isNewQuery: boolean) => {
    if (isAnswering) return

    let activeChatId = currentChatId

    if (isNewQuery) {
      setCurrentChatId(null)
      activeChatId = null
      setMessages([])
      setInputValue('')
    } else {
      setFollowUpValue('')
    }

    const displayQ = question.replace(/\s*\(근거 조항은.*?\)$/, '')
    const newMsg = { role: 'user', content: displayQ, id: Date.now() }
    setMessages(prev => (isNewQuery ? [newMsg] : [...prev, newMsg]))
    setIsAnswering(true)

    // 추가 질문 시: 직전 대화 컨텍스트를 함께 전달하여 연속성 있는 답변 생성
    let questionWithContext = question
    if (!isNewQuery && messages.length > 0) {
      // 마지막 사용자 질문과 AI 답변을 컨텍스트로 포함
      const prevPairs: string[] = []
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i]
        if (m.role === 'user') {
          const nextAi = messages[i + 1]
          if (nextAi && nextAi.role === 'ai') {
            prevPairs.push(`[이전 질문] ${m.content}\n[이전 답변 요약] ${nextAi.content.substring(0, 300)}${nextAi.content.length > 300 ? '...' : ''}`)
          }
        }
      }
      if (prevPairs.length > 0) {
        const contextSummary = prevPairs.slice(-2).join('\n\n') // 최근 2턴만
        questionWithContext = `[이전 대화 참고]\n${contextSummary}\n\n[추가 질문] ${question}`
      }
    }

    const res = await window.api.ruleAi.askQuestion(isNewQuery ? null : activeChatId, questionWithContext)
    if (res.success) {
      if (isNewQuery || !activeChatId) {
        setCurrentChatId(res.data.chat_id)
        loadChats()
      } else {
        loadChats()
      }
      const aiMsg = {
        role: 'ai',
        content: res.data.response,
        sources: res.data.sources,
        id: Date.now() + 1
      }
      setMessages(prev => [...prev, aiMsg])
    } else {
      setMessages(prev => [...prev, { role: 'ai', content: '오류가 발생했습니다: ' + res.error, id: Date.now() + 1 }])
    }
    setIsAnswering(false)
  }

  const startNewChat = () => {
    setCurrentChatId(null)
    setMessages([])
    setInputValue('')
    setFollowUpValue('')
  }

  const deleteChat = (id: number) => {
    confirm('이 기록을 삭제하시겠습니까?', async () => {
      await window.api.ruleAi.deleteChat(id)
      loadChats()
      if (currentChatId === id) startNewChat()
    })
  }

  const deleteAllChats = () => {
    confirm('모든 질문 기록을 삭제하시겠습니까?', async () => {
      await window.api.ruleAi.deleteAllChats()
      await loadChats()
      startNewChat()
    })
  }

  const regenerate = async (msgId: number) => {
    const userMsg = [...messages].reverse().find(m => m.role === 'user')
    if (userMsg) {
      setMessages(prev => prev.filter(m => m.id !== msgId))
      handleSendMessage(userMsg.content, false)
    }
  }

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const copySources = (sources: any[]) => {
    const text = sources.map((s, i) => `[근거 ${i+1}] ${s.doc_name} p.${s.page_number}\n${s.content}`).join('\n\n')
    navigator.clipboard.writeText(text)
  }

  const openPageSource = async (docId: number, pageNumber: number, docName: string) => {
    const res = await window.api.ruleAi.getPageContent(docId, pageNumber)
    if (res.success) {
      setModalTitle(`${docName} - ${pageNumber}쪽`)
      setModalContent(res.data)
      setModalOpen(true)
    }
  }

  const toggleSource = (id: string) => {
    setExpandedSources(prev => ({...prev, [id]: !prev[id]}))
  }

  const renderMessageContent = (text: string) => {
    const blocks = text.split(/(###.*?)(?=\n|$)/g)
    return blocks.map((b, i) => {
      if (b.startsWith('### 핵심 답변')) return <h4 key={i} className="font-bold text-blue-600 mt-2 mb-1">💡 핵심 답변</h4>
      if (b.startsWith('### 📖 근거') || b.startsWith('### 규정과의 대조')) return <h4 key={i} className="font-bold text-green-600 mt-4 mb-1">📖 규정과의 대조</h4>
      if (b.startsWith('### 🔎 상세 설명') || b.startsWith('### 필요한 절차 및 유의사항')) return <h4 key={i} className="font-bold text-purple-600 mt-4 mb-1">🔎 필요한 절차 및 유의사항</h4>
      if (b.startsWith('###')) return <h4 key={i} className="font-bold mt-4 mb-1">{b.replace('### ', '')}</h4>

      return <p key={i} className="whitespace-pre-wrap leading-relaxed text-sm mb-2">{b.trim()}</p>
    })
  }

  const insertPrompt = (text: string) => {
    setInputValue(prev => prev + (prev ? '\n' : '') + text)
  }

  const activeDocuments = documents.filter(d => d.is_active)

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-4" style={{ background: 'var(--bg-primary)' }}>
      {/* ── 상단 헤더 ── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
          <BookOpen size={16} className="text-white" />
        </div>
        <div>
          <h1 className="page-title">규정/지침 AI</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>등록된 규정과 매뉴얼을 바탕으로 정확하고 근거 있는 답변을 제공합니다.</p>
        </div>
      </div>

      <div className="flex h-full gap-6 overflow-hidden">
        {/* 커스텀 Confirm 모달 */}
        <ConfirmModal state={confirmState} close={closeConfirm} handleOk={handleConfirmOk} />

        {/* 왼쪽 화면 */}
        <div className="w-[40%] flex flex-col gap-4 overflow-y-auto pr-2 scrollbar-hide">

        {/* 1. 규정·매뉴얼 등록 */}
        <div className="card shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className=" text-[color:var(--text-secondary)] font-bold px-2 py-0.5 rounded text-xs">1</span>
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>규정·매뉴얼 등록</h2>
          </div>


          <div
            className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors hover:/50"
            style={{ borderColor: 'var(--border)' }}
            onClick={handleFileUpload}
            onDragOver={(e)=>e.preventDefault()}
            onDrop={handleDrop}
          >
            <Upload className="w-6 h-6 mb-2 text-[color:var(--text-muted)]" />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>파일 끌어다 놓기 · 클릭해서 선택</span>
            <span className="text-xs text-[color:var(--text-muted)] mt-1">PDF · DOCX · HWPX · TXT · 여러 개 가능</span>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>등록된 문서</span>
              <span className="text-[10px] text-[color:var(--text-muted)]">체크한 문서에서만 답변합니다</span>
            </div>
            {documents.length === 0 ? (
              <p className="text-xs text-[color:var(--text-muted)]">아직 등록된 문서가 없습니다. 위에서 파일을 올려주세요.</p>
            ) : (
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between  p-2 rounded text-xs border" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 overflow-hidden">
                      <input type="checkbox" checked={doc.is_active === 1} onChange={() => toggleDocument(doc.id, doc.is_active === 1)} />
                      <span className="truncate max-w-[150px]">{doc.name}</span>
                      {doc.status === '분석 완료' ? <CheckCircle className="w-3 h-3 text-green-500" /> : <></>}
                    </div>
                    <button onClick={() => deleteDocument(doc.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 2. 질문하기 */}
        <div className="card shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className=" text-[color:var(--text-secondary)] font-bold px-2 py-0.5 rounded text-xs">2</span>
            <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>질문하기</h2>
          </div>
          <p className="text-xs text-[color:var(--text-muted)]">사례나 상황을 적으면, 관련 조항을 찾아 근거와 함께 답변합니다.</p>

          <textarea
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            className="w-full h-28 p-3 rounded-lg text-sm border focus:outline-none resize-none"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="예) 출장 신청 절차와 지급 기준은 어떻게 되나요? 규정 근거와 함께 알려주세요."
          />



          <div className="flex gap-2 flex-wrap text-xs">
            <button onClick={() => insertPrompt('위반 소지가 있는 부분은?')} className=" text-[color:var(--text-secondary)] px-3 py-1.5 rounded-full hover:bg-slate-200">위반 소지가 있는 부분은?</button>
            <button onClick={() => insertPrompt('처리 절차를 알려줘')} className=" text-[color:var(--text-secondary)] px-3 py-1.5 rounded-full hover:bg-slate-200">처리 절차를 알려줘</button>
            <button onClick={() => insertPrompt('관련 규정의 핵심 요약')} className=" text-[color:var(--text-secondary)] px-3 py-1.5 rounded-full hover:bg-slate-200">관련 규정의 핵심 요약</button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSendPrimary}
              disabled={isAnswering || !inputValue.trim() || activeDocuments.length === 0}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg font-bold text-sm shadow-md"
            >
              {isAnswering ? '분석 중...' : '질문'}
            </button>
          </div>
        </div>

        {/* 3. 질문 기록 */}
        <div className="card shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[color:var(--text-secondary)]" />
              <h2 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>질문 기록</h2>
            </div>
            <div className="flex gap-2">
              <button onClick={startNewChat} className="text-[10px] border px-2 py-1 rounded text-[color:var(--text-secondary)] hover:bg-slate-500/20">새로운 질문</button>
              <button onClick={deleteAllChats} className="text-[10px] border px-2 py-1 rounded text-red-500 hover:bg-red-50">전체 삭제</button>
            </div>
          </div>
          <p className="text-[11px] text-[color:var(--text-muted)]">
            이 브라우저에 저장된 지난 질문입니다. 클릭하면 답변·근거·추가 채팅까지 다시 불러옵니다.
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={() => loadMessages(chat.id)}
                className={`flex items-center justify-between border p-3 rounded-lg text-xs cursor-pointer transition-colors ${currentChatId === chat.id ? ' border-blue-200' : 'hover:bg-slate-500/20'}`}
                style={{ borderColor: currentChatId === chat.id ? '#bfdbfe' : 'var(--border)' }}
              >
                <div className="flex-1 overflow-hidden pr-2">
                  <span className="truncate block font-medium" style={{ color: 'var(--text-primary)' }}>{chat.title}</span>
                  <span className="text-[10px] text-[color:var(--text-muted)] whitespace-nowrap">{format(new Date(chat.updated_at), 'M.d HH:mm')}</span>
                </div>
                <X className="w-4 h-4 text-[color:var(--text-muted)] hover:text-red-500 flex-shrink-0" onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 오른쪽 화면 */}
      <div className="w-[60%] flex flex-col h-full  rounded-xl shadow-sm border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b flex items-center" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>규정·매뉴얼 AI의 답변</h2>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.length === 0 && !isAnswering ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Zap className="w-12 h-12 mb-4" style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
              <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)', opacity: 0.9 }}>질문 결과가 여기에 표시됩니다</h2>
              <p className="text-sm" style={{ color: 'var(--text-primary)', opacity: 0.7 }}>왼쪽에서 규정 문서를 등록하고 질문을 입력하면,<br/>관련 조항을 찾아 근거와 함께 답변을 정리해 드립니다.</p>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className=" text-[color:var(--text-primary)] px-4 py-3 rounded-2xl text-sm max-w-[80%] shadow-sm whitespace-pre-wrap" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                        {msg.content}
                      </div>
                    </div>
                  )
                } else {
                  return (
                    <div key={msg.id} className="border p-6 rounded-2xl space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                      <div className="prose prose-sm max-w-none" style={{ color: 'var(--text-primary)' }}>
                        {renderMessageContent(msg.content)}
                      </div>

                      <div className="flex justify-end gap-2 mt-4">
                        <button onClick={() => regenerate(msg.id)} className="px-3 py-1.5 border rounded-lg text-xs font-medium  hover:bg-slate-500/20 text-[color:var(--text-secondary)] transition-colors">다시 생성</button>
                        <button onClick={() => copyText(msg.content)} className="px-3 py-1.5 border rounded-lg text-xs font-medium  hover:bg-slate-500/20 text-[color:var(--text-secondary)] transition-colors">답변 복사</button>
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-[color:var(--text-secondary)]">근거 조항</h3>
                            <button onClick={() => copySources(msg.sources)} className="text-[10px] border px-2 py-1 rounded text-[color:var(--text-secondary)] hover:bg-slate-500/20 transition-colors">근거 복사</button>
                          </div>
                          <div className="space-y-3">
                            {msg.sources.map((s: any, idx: number) => (
                                <div key={idx} className="border-l-4 p-4 rounded-r-lg text-xs space-y-2 relative" style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--accent-blue)' }}>
                                  <div className="font-bold" style={{ color: 'var(--text-primary)' }}>근거 {idx+1} · {s.doc_name} p.{s.page_number} · 관련도 {Math.round(s.score * 100) || 50}%</div>
                                  <p className="whitespace-pre-wrap leading-relaxed line-clamp-3" style={{ color: 'var(--text-secondary)' }}>{s.content || '관련 조항의 내용이 요약되어 표시됩니다.'}</p>
                                  <div className="flex gap-2 mt-2 items-center">
                                    <button onClick={() => openPageSource(s.document_id, s.page_number, s.doc_name)} className="hover:underline transition-colors font-medium" style={{ color: 'var(--accent-blue)' }}>
                                      원문 전체 보기
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }
              })}

              {isAnswering && (
                <div className="flex justify-start">
                  <div className=" border p-4 rounded-2xl flex items-center text-sm text-[color:var(--text-secondary)] max-w-[80%] shadow-sm">
                    <RefreshCcw className="w-4 h-4 animate-spin mr-3 text-[color:var(--text-muted)]" />
                    문서를 분석하고 답변을 작성 중입니다...
                  </div>
                </div>
              )}
            </>
          )}

          {messages.length > 0 && !isAnswering && (
            <div className="mt-8 p-5  rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className=" border text-[color:var(--text-secondary)] px-1.5 py-0.5 rounded text-xs font-bold">+</span>
                <h3 className="font-bold text-sm text-[color:var(--text-primary)]">추가 질문</h3>
              </div>
              <p className="text-xs text-[color:var(--text-muted)] mb-3">위 답변에 대해 더 궁금한 점을 이어서 물어보세요. 이전 질문과 답변 내용을 기억하여 연속성 있게 답합니다.</p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={followUpValue}
                  onChange={e => setFollowUpValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendFollowUp()}
                  disabled={isAnswering}
                  placeholder="예) 그 기한을 넘기면 어떻게 되나요?"
                  className="flex-1 border p-3 rounded-xl text-sm  focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-sm"
                />
                <button
                  onClick={handleSendFollowUp}
                  disabled={!followUpValue.trim() || isAnswering}
                  className="px-6 py-2 bg-[#2d3748] hover:bg-[#1a202c] disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-colors"
                >
                  보내기
                </button>
              </div>
              <p className="text-[10px] text-[color:var(--text-muted)] mt-2">Enter 전송 · 왼쪽에서 새 질문을 작성하면 채팅이 초기화됩니다.</p>
            </div>
          )}
        </div>
      </div>

      {/* Source Modal */}
      {modalOpen && (
        <div className="absolute inset-0 bg-black/40 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{modalTitle}</h2>
              <button onClick={() => setModalOpen(false)} style={{ color: 'var(--text-muted)' }}>닫기</button>
            </div>
            <div className="p-6 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {modalContent}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
