import React from 'react'
import { Sparkles, ArrowRight, Download, X, AlertCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface UpdateModalProps {
  isOpen: boolean
  currentVersion: string
  newVersion: string
  releaseNotes?: string
  onConfirm: () => void
  onClose: () => void
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  currentVersion,
  newVersion,
  releaseNotes,
  onConfirm,
  onClose
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)'
        }}
      >
        {/* 모달 헤더 */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-500 flex items-center justify-center">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                교행 보드 새 버전 업데이트 안내
              </h3>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                새로운 기능과 성능 개선 사항이 포함된 새 버전이 준비되었습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-black/10 dark:hover:bg-white/10"
            style={{ color: 'var(--text-muted)' }}
            title="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 모달 본문 */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* 버전 비교 뱃지 영역 */}
          <div
            className="p-3.5 rounded-xl border flex items-center justify-between"
            style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>현재 버전:</span>
              <span
                className="px-2.5 py-1 rounded-md text-xs font-bold border"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)'
                }}
              >
                v{currentVersion || '2.0.58'}
              </span>
            </div>

            <ArrowRight size={16} className="text-blue-500 shrink-0 mx-2" />

            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>새 버전:</span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                v{newVersion || '최신'}
              </span>
            </div>
          </div>

          {/* 릴리스 노트 영역 */}
          <div className="space-y-2">
            <label className="text-xs font-bold block" style={{ color: 'var(--text-secondary)' }}>
              업데이트 상세 내역 (Release Notes)
            </label>
            <div
              className="max-h-56 overflow-y-auto rounded-xl p-4 text-sm leading-relaxed border select-text space-y-2"
              style={{
                background: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              {releaseNotes ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ ...props }: any) => <h1 className="text-base font-bold mt-3 mb-1.5 pb-1 border-b" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }} {...props} />,
                    h2: ({ ...props }: any) => <h2 className="text-sm font-bold mt-2.5 mb-1" style={{ color: 'var(--text-primary)' }} {...props} />,
                    h3: ({ ...props }: any) => <h3 className="text-xs font-bold mt-2 mb-0.5 text-blue-500 dark:text-blue-400" {...props} />,
                    p: ({ ...props }: any) => <p className="text-xs sm:text-sm leading-relaxed mb-2 font-normal" style={{ color: 'var(--text-primary)' }} {...props} />,
                    ul: ({ ...props }: any) => <ul className="list-disc list-inside space-y-1 my-1.5 pl-1.5" style={{ color: 'var(--text-primary)' }} {...props} />,
                    ol: ({ ...props }: any) => <ol className="list-decimal list-inside space-y-1 my-1.5 pl-1.5" style={{ color: 'var(--text-primary)' }} {...props} />,
                    li: ({ ...props }: any) => <li className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }} {...props} />,
                    strong: ({ ...props }: any) => <strong className="font-bold text-amber-500 dark:text-amber-300" {...props} />,
                    code: ({ inline, ...props }: any) => inline ? (
                      <code className="px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/20" {...props} />
                    ) : (
                      <code className="block p-2.5 rounded-lg text-xs font-mono bg-black/40 text-emerald-400 overflow-x-auto border border-white/10 my-1.5" {...props} />
                    ),
                    a: ({ ...props }: any) => <a className="text-blue-500 dark:text-blue-400 underline font-medium hover:opacity-80" target="_blank" rel="noreferrer" {...props} />
                  }}
                >
                  {releaseNotes}
                </ReactMarkdown>
              ) : (
                <div className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                  상세 릴리스 노트가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* 안내 배너 */}
          <div
            className="flex items-start gap-2.5 p-3 rounded-xl border text-xs"
            style={{
              background: 'rgba(59, 130, 246, 0.08)',
              borderColor: 'rgba(59, 130, 246, 0.25)',
              color: 'var(--text-secondary)'
            }}
          >
            <AlertCircle size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <strong className="font-semibold text-blue-600 dark:text-blue-400 block mb-0.5">
                안전한 업데이트 진행
              </strong>
              [지금 업데이트 및 재시작]을 누르면 열려 있는 교행 보드를 완전히 종료하고 새 버전을 자동으로 설치한 뒤 다시 시작합니다.
            </div>
          </div>
        </div>

        {/* 모달 하단 버튼 */}
        <div
          className="px-6 py-4 border-t flex items-center justify-end gap-2.5"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--bg-card)',
              color: 'var(--text-secondary)'
            }}
          >
            나중에 하기
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/25 active:scale-95"
          >
            <Download size={15} />
            지금 업데이트 및 재시작
          </button>
        </div>
      </div>
    </div>
  )
}

export default UpdateModal
