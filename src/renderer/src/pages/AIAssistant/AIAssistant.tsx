import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Trash2, Copy, Download, Sparkles, BookOpen, FileText, CheckSquare } from 'lucide-react'

interface Message { role: 'user' | 'assistant'; content: string; timestamp: Date }

const QUICK_PROMPTS = [
  { label: '학교운영위원회 개최', prompt: '학교운영위원회 개최 절차를 단계별로 알려줘' },
  { label: '수의계약 진행', prompt: '수의계약 진행 순서와 필요 서류를 알려줘' },
  { label: '출장여비 기준', prompt: '공무원 출장여비 지급 기준과 계산 방법을 알려줘' },
  { label: '물품구매 절차', prompt: '학교 물품구매 절차와 주의사항을 알려줘' },
  { label: '감사 대비 체크리스트', prompt: '학교회계 감사 대비 체크리스트를 작성해줘' },
  { label: '공문 작성 요령', prompt: '학교 공문서 작성 요령과 형식을 알려줘' },
]

function parseMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1" style="color:var(--accent-mint)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-semibold text-base mt-4 mb-1" style="color:var(--accent-blue)">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-bold text-base mt-4 mb-2" style="color:var(--text-primary)">$1</h1>')
    .replace(/^\d+\. (.+)$/gm, '<div class="flex gap-2 mb-1"><span style="color:var(--accent-blue)">•</span><span>$1</span></div>')
    .replace(/^- (.+)$/gm, '<div class="flex gap-2 mb-1"><span style="color:var(--text-muted)">-</span><span>$1</span></div>')
    .replace(/`(.+?)`/g, '<code class="px-1 rounded text-xs" style="background:rgba(59,130,246,0.15);color:#60a5fa">$1</code>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
}

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '안녕하세요! 학교 행정실 AI 비서입니다. 🏫\n\n학교회계, 공문 작성, 계약업무, 물품관리 등 다양한 행정 업무를 도와드립니다.\n\n아래 빠른 질문을 클릭하거나 직접 질문을 입력해주세요.',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [category, setCategory] = useState('general')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const content = text || input.trim()
    if (!content || loading) return

    const userMsg: Message = { role: 'user', content, timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }))

      const res = await window.api.ai.chat(history, category)

      if (res.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: res.text,
          timestamp: new Date()
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `오류가 발생했습니다: ${res.error}\n\n설정에서 Gemini API 키를 확인해주세요.`,
          timestamp: new Date()
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: '대화 기록이 초기화되었습니다. 새로운 질문을 해주세요.',
      timestamp: new Date()
    }])
  }

  const copyLast = () => {
    const last = messages.filter(m => m.role === 'assistant').at(-1)
    if (last) navigator.clipboard.writeText(last.content)
  }

  const categories = [
    { value: 'general', label: '일반', icon: Bot },
    { value: 'finance', label: '회계', icon: BookOpen },
    { value: 'document', label: '공문', icon: FileText },
    { value: 'audit', label: '감사', icon: CheckSquare },
  ]

  return (
    <div className="flex flex-col h-full fade-in" style={{ height: 'calc(100vh - 100px)' }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">AI 행정비서</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Gemini 2.0 기반 학교 행정 전문 AI</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyLast} className="btn-ghost text-xs py-1.5 px-3">
            <Copy size={13} /> 복사
          </button>
          <button onClick={clearChat} className="btn-ghost text-xs py-1.5 px-3">
            <Trash2 size={13} /> 초기화
          </button>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex gap-1.5 mb-3">
        {categories.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setCategory(value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              category === value
                ? 'text-white'
                : 'hover:bg-white/5'
            }`}
            style={category === value
              ? { background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }
              : { color: 'var(--text-muted)' }
            }
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* 빠른 질문 */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {QUICK_PROMPTS.map(({ label, prompt }) => (
          <button
            key={label}
            onClick={() => send(prompt)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all border"
            style={{
              borderColor: 'rgba(139,92,246,0.3)',
              color: '#a78bfa',
              background: 'rgba(139,92,246,0.08)'
            }}
          >
            <Sparkles size={10} />
            {label}
          </button>
        ))}
      </div>

      {/* 채팅 영역 */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
                <Bot size={12} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'
              }`}
              style={{
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                  : 'var(--bg-card)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none'
              }}
            >
              {msg.role === 'assistant' ? (
                <div
                  className="prose-chat"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.content) }}
                />
              ) : (
                msg.content
              )}
              <p className="text-xs mt-2 opacity-50">
                {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)' }}>
              <Bot size={12} className="text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm card">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#8b5cf6', animationDelay: `${i * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="mt-3 flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="질문을 입력하세요... (Shift+Enter: 줄바꿈)"
            rows={2}
            className="input resize-none pr-4 text-sm"
            style={{ minHeight: '60px', maxHeight: '120px' }}
          />
        </div>
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="btn-primary flex-shrink-0 px-4 self-end h-10"
          style={{ opacity: loading || !input.trim() ? 0.5 : 1 }}
        >
          {loading ? <span className="spinner" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  )
}
