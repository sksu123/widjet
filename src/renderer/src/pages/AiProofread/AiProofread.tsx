import { useState } from 'react'
import { Bot, AlertCircle, Copy, FileEdit } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function AiProofread() {
  const [inputText, setInputText] = useState('')
  const [resultText, setResultText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [includeTable, setIncludeTable] = useState(false)

  const handleProofread = async () => {
    if (!inputText.trim()) return
    setLoading(true)
    setError(null)
    setResultText('')
    
    try {
      const res = await window.api.ai.proofreadDocument(inputText, includeTable)
      if (res.success) {
        setResultText(res.data)
      } else {
        setError(res.error || '교정 중 오류가 발생했습니다.')
      }
    } catch (err: any) {
      setError(err.message || '알 수 없는 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resultText)
  }

  return (
    <div className="fade-in space-y-4 pb-8 h-full flex flex-col">
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
          <FileEdit size={16} className="text-white" />
        </div>
        <div>
          <h1 className="page-title">공문서 AI 교정기</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>AI가 문장을 다듬고 교정 이유를 상세히 설명해 줍니다.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        {(() => {
          let correctedText = resultText;
          let explanationText = '';
          if (resultText) {
            const splitKeywords = ['[교정 내용 상세 설명]', '교정 내용 상세 설명:', '교정 내용 상세 설명'];
            for (const kw of splitKeywords) {
              const lastIdx = resultText.lastIndexOf(kw);
              if (lastIdx !== -1) {
                let textPart = resultText.substring(0, lastIdx);
                let expPart = resultText.substring(lastIdx + kw.length);
                
                const textKw = '[교정된 텍스트]';
                const textLastIdx = textPart.lastIndexOf(textKw);
                if (textLastIdx !== -1) {
                  textPart = textPart.substring(textLastIdx + textKw.length);
                } else {
                  const altKw = '교정된 텍스트:';
                  const altIdx = textPart.lastIndexOf(altKw);
                  if (altIdx !== -1) {
                    textPart = textPart.substring(altIdx + altKw.length);
                  }
                }
                
                correctedText = textPart.replace(/^[\]:\s]*/, '').trim();
                correctedText = correctedText.replace(/^#+\s*/, '').trim();
                correctedText = correctedText.replace(/[ \t\r\n\-#]+$/, '');
                
                explanationText = expPart.trim();
                explanationText = explanationText.replace(/^[\]:\s]*/, '').replace(/^#+\s*/, '').trim();
                break;
              }
            }
          }
          
          return (
            <>
              {/* 상단 좌우 배치: 원본 텍스트 & 교정 결과 */}
              <div className="flex gap-4 items-stretch">
                {/* 좌측: 원본 텍스트 */}
                <div className="card flex flex-col space-y-2 flex-1 min-w-0 min-h-[250px]">
                  <p className="text-sm font-semibold flex items-center gap-2 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                    원본 텍스트
                  </p>
                  <textarea 
                    className="input flex-1 resize-none" 
                    placeholder="교정할 공문서 내용을 입력하세요..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>

                {/* 우측: 교정 결과 */}
                <div className="card flex flex-col space-y-2 flex-1 min-w-0 min-h-[250px]">
                  <div className="flex items-center justify-between mb-2 flex-shrink-0">
                    <p className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                      교정 결과
                    </p>
                    {correctedText && (
                      <button onClick={() => navigator.clipboard.writeText(correctedText)}
                        className="p-1.5 rounded hover:bg-white/10 transition-colors flex items-center gap-1 text-xs"
                        style={{ color: 'var(--accent-blue, #3b82f6)' }}
                        title="교정 결과만 복사">
                        <Copy size={13} /> 결과 복사
                      </button>
                    )}
                  </div>
                  <div className="flex-grow rounded-lg border p-3 text-sm overflow-auto" 
                       style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {error && (
                      <div className="flex items-center gap-2 text-red-500 mb-2">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}
                    {!resultText && !error && !loading && (
                      <div className="h-full flex items-center justify-center opacity-50 text-sm" style={{ color: 'var(--text-muted)' }}>
                        결과가 이곳에 표시됩니다.
                      </div>
                    )}
                    {correctedText && (
                      <div className="prose prose-sm max-w-none dark:prose-invert" style={{ color: 'var(--text-primary)' }}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{correctedText}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <label className="flex items-center gap-2 text-sm cursor-pointer mb-3" style={{ color: 'var(--text-primary)' }}>
                  <input type="checkbox" checked={includeTable} onChange={(e) => setIncludeTable(e.target.checked)} className="rounded" style={{ accentColor: 'var(--accent-blue)' }} />
                  <span>표 포함 (AI가 정리하기 좋은 내용을 표로 변환합니다)</span>
                </label>
                <button 
                  onClick={handleProofread}
                  disabled={loading || !inputText.trim()}
                  className={`py-3 rounded-xl text-sm font-bold text-white transition-all w-full flex justify-center items-center gap-2 flex-shrink-0 shadow-sm ${loading || !inputText.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90 active:scale-[0.99]'}`}
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                  {loading ? <><span className="spinner" /> AI가 분석 중입니다...</> : <><Bot size={18} /> 문장 교정하기</>}
                </button>
              </div>

              {/* 하단: 상세 설명 */}
              {(explanationText || error) && (
                <div className="card flex flex-col">
                  <p className="text-sm font-semibold mb-2 flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                    {error ? '오류 안내' : '상세 설명'}
                  </p>
                  <div className="flex-grow rounded-lg border p-3 text-sm overflow-auto prose prose-sm max-w-none dark:prose-invert"
                       style={{ background: 'var(--bg-background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {error ? (
                      <div className="flex flex-col items-center justify-center h-full gap-3 text-red-500">
                        <div className="flex items-center gap-2">
                          <AlertCircle size={18} />
                          <span>{error}</span>
                        </div>
                        <button onClick={handleProofread} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                          재시도
                        </button>
                      </div>
                    ) : (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{explanationText}</ReactMarkdown>
                    )}
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
