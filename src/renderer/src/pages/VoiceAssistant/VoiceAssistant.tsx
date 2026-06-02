import { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, Bot, Send } from 'lucide-react'

interface VoiceResult { text: string; response: string; timestamp: Date }

const VOICE_EXAMPLES = [
  '오늘 일정 보여줘',
  '출장여비 계산해줘',
  '회의록 작성 도와줘',
  '수의계약 절차 알려줘',
  '법인카드 대여 방법',
]

export default function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [results, setResults] = useState<VoiceResult[]>([])
  const [processing, setProcessing] = useState(false)
  const [supported, setSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false)
      return
    }

    const SpeechRecognition = (window as Window & typeof globalThis & { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition || 
                              (window as Window & typeof globalThis & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognition) { setSupported(false); return }

    const recognition = new SpeechRecognition()
    recognition.lang = 'ko-KR'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onresult = (e) => {
      const current = Array.from(e.results).map(r => r[0].transcript).join('')
      setTranscript(current)
      if (e.results[e.results.length - 1].isFinal) {
        processVoice(current)
      }
    }

    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => { setIsListening(false); }

    recognitionRef.current = recognition
  }, [])

  const toggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      setTranscript('')
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

  const processVoice = async (text: string) => {
    if (!text.trim()) return
    setProcessing(true)
    try {
      const res = await window.api.ai.processVoice(text)
      if (res.success) {
        setResults(prev => [{
          text,
          response: res.text,
          timestamp: new Date()
        }, ...prev].slice(0, 10))

        // TTS
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(res.text.slice(0, 200))
          utterance.lang = 'ko-KR'
          utterance.rate = 1.0
          window.speechSynthesis.speak(utterance)
        }
      }
    } finally {
      setProcessing(false)
      setTranscript('')
    }
  }

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>
          <Mic size={16} className="text-white" />
        </div>
        <div>
          <h1 className="page-title">AI 음성 비서</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>음성으로 업무 지원을 받으세요</p>
        </div>
      </div>

      {!supported ? (
        <div className="card text-center py-8">
          <MicOff size={32} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-2" />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            이 브라우저/환경에서는 음성 인식이 지원되지 않습니다
          </p>
        </div>
      ) : (
        <>
          {/* 마이크 버튼 */}
          <div className="card text-center py-8">
            <button
              onClick={toggleListening}
              className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 transition-all ${
                isListening ? 'animate-pulse' : 'hover:scale-105'
              }`}
              style={{
                background: isListening
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : 'linear-gradient(135deg, #a78bfa, #7c3aed)',
                boxShadow: isListening ? '0 0 30px rgba(239,68,68,0.4)' : '0 0 20px rgba(167,139,250,0.3)'
              }}>
              {isListening ? <MicOff size={32} className="text-white" /> : <Mic size={32} className="text-white" />}
            </button>

            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {processing ? '처리 중...' : isListening ? '음성 인식 중...' : '마이크 버튼을 눌러 시작'}
            </p>

            {transcript && (
              <div className="mt-3 px-4 py-2 rounded-lg mx-auto max-w-xs"
                style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)' }}>
                <p className="text-sm italic" style={{ color: '#a78bfa' }}>"{transcript}"</p>
              </div>
            )}
          </div>

          {/* 빠른 명령 */}
          <div>
            <p className="section-title">빠른 명령 예시</p>
            <div className="flex flex-wrap gap-2">
              {VOICE_EXAMPLES.map(ex => (
                <button key={ex} onClick={() => processVoice(ex)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all"
                  style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }}>
                  <Send size={10} /> {ex}
                </button>
              ))}
            </div>
          </div>

          {/* 응답 기록 */}
          {results.length > 0 && (
            <div className="space-y-3">
              <p className="section-title">응답 기록</p>
              {results.map((r, idx) => (
                <div key={idx} className="card space-y-2">
                  <div className="flex items-center gap-2">
                    <Mic size={12} style={{ color: '#a78bfa' }} />
                    <p className="text-xs font-medium" style={{ color: '#a78bfa' }}>"{r.text}"</p>
                    <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                      {r.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Bot size={12} style={{ color: 'var(--accent-mint)' }} className="mt-0.5 flex-shrink-0" />
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {r.response.slice(0, 300)}{r.response.length > 300 ? '...' : ''}
                    </p>
                  </div>
                  {r.response.length > 0 && (
                    <button onClick={() => {
                      const u = new SpeechSynthesisUtterance(r.response.slice(0, 200))
                      u.lang = 'ko-KR'
                      window.speechSynthesis.speak(u)
                    }} className="btn-ghost text-xs py-1 px-2">
                      <Volume2 size={11} /> 다시 듣기
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
