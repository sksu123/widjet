import React, { useState, useRef, useEffect } from 'react'
import { Bold, Italic, Underline, Type, Palette, Eraser, Copy, Pin, Trash2, Highlighter } from 'lucide-react'

export interface MemoData {
  id: number
  title: string
  content: string
  color: string
  x: number
  y: number
  width: number
  height: number
  z_index: number
  is_pinned: number
}

interface StickyNoteProps {
  memo: MemoData
  onUpdate: (id: number, data: Partial<MemoData>) => void
  onDelete: (id: number) => void
  onFocus: (id: number) => void
}

const BG_COLORS = [
  '#fef08a', // Yellow
  '#fbcfe8', // Pink
  '#bfdbfe', // Blue
  '#bbf7d0', // Green
  '#e9d5ff', // Purple
  '#fed7aa'  // Orange
]

const TEXT_COLORS = [
  '#000000', // Black
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Green
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#6b7280'  // Gray
]

const HIGHLIGHT_COLORS = [
  'transparent', // 없음
  '#fef08a',     // Yellow
  '#bbf7d0',     // Green
  '#bfdbfe',     // Blue
  '#fbcfe8',     // Pink
  '#e9d5ff',     // Purple
  '#fed7aa',     // Orange
  '#99f6e4',     // Mint
]

const FONT_SIZES = [
  { label: '아주 작게', value: '1' },
  { label: '작게',     value: '2' },
  { label: '보통',     value: '3' },
  { label: '크게',     value: '4' },
  { label: '아주 크게', value: '5' },
  { label: '최대',     value: '6' },
]

export function StickyNote({ memo, onUpdate, onDelete, onFocus }: StickyNoteProps) {
  const [isFocused, setIsFocused] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [pos, setPos] = useState({ x: memo.x, y: memo.y })
  const [size, setSize] = useState({ w: memo.width, h: memo.height })

  const [title, setTitle] = useState(memo.title)
  const [content, setContent] = useState(memo.content)

  const [showFontSize, setShowFontSize] = useState(false)
  const [showTextColor, setShowTextColor] = useState(false)
  const [showHighlight, setShowHighlight] = useState(false)

  const dragStartPos = useRef({ x: 0, y: 0 })
  const initialPos = useRef({ x: 0, y: 0 })
  const initialSize = useRef({ w: 0, h: 0 })
  const contentRef = useRef<HTMLDivElement>(null)
  const saveTimeout = useRef<NodeJS.Timeout | null>(null)

  const debouncedUpdate = (data: Partial<MemoData>) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      onUpdate(memo.id, data)
    }, 500)
  }

  // contentEditable 포커스를 유지하면서 서식 명령 실행
  const execCmd = (command: string, value?: string) => {
    contentRef.current?.focus()
    document.execCommand(command, false, value ?? undefined)
    if (contentRef.current) {
      const html = contentRef.current.innerHTML
      setContent(html)
      debouncedUpdate({ content: html })
    }
  }

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, input, [contenteditable="true"]')) return
    setIsDragging(true)
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    initialPos.current = { ...pos }
    onFocus(memo.id)
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    dragStartPos.current = { x: e.clientX, y: e.clientY }
    initialSize.current = { ...size }
    onFocus(memo.id)
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartPos.current.x
        const dy = e.clientY - dragStartPos.current.y
        const newX = Math.max(0, initialPos.current.x + dx)
        const newY = Math.max(0, initialPos.current.y + dy)
        setPos({ x: newX, y: newY })
      } else if (isResizing) {
        const dx = e.clientX - dragStartPos.current.x
        const dy = e.clientY - dragStartPos.current.y
        const newW = Math.max(200, initialSize.current.w + dx)
        const newH = Math.max(200, initialSize.current.h + dy)
        setSize({ w: newW, h: newH })
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false)
        debouncedUpdate({ x: pos.x, y: pos.y })
      }
      if (isResizing) {
        setIsResizing(false)
        debouncedUpdate({ width: size.w, height: size.h })
      }
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, pos, size])

  const handleCopy = () => {
    const plainText = contentRef.current?.innerText || content
    navigator.clipboard.writeText(`${title}\n${plainText}`)
  }

  const closeAllPopovers = () => {
    setShowFontSize(false)
    setShowTextColor(false)
    setShowHighlight(false)
  }

  return (
    <>
      <style>{`
        .empty-placeholder:empty:before {
          content: attr(data-placeholder);
          color: rgba(0,0,0,0.3);
          pointer-events: none;
          display: block;
        }
      `}</style>
      <div
        tabIndex={0}
        onFocus={() => setIsFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsFocused(false)
            closeAllPopovers()
          }
        }}
        className={`absolute flex flex-col shadow-lg overflow-visible transition-shadow ${isFocused ? 'ring-2 ring-blue-400' : 'hover:shadow-xl'}`}
        style={{
          left: pos.x,
          top: pos.y,
          width: size.w,
          height: size.h,
          zIndex: isFocused ? 9999 : memo.z_index,
          backgroundColor: memo.color,
          border: `1px solid rgba(0,0,0,0.05)`,
          boxShadow: isDragging ? '0 10px 25px rgba(0,0,0,0.2)' : '0 4px 15px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          overflow: 'visible',
        }}
        onMouseDown={() => onFocus(memo.id)}
      >
        {/* ── 상단 툴바 (포커스 시) ── */}
        {isFocused && (
          <div
            className="flex items-center gap-0.5 px-2 py-1.5 shrink-0 cursor-move"
            style={{
              background: 'rgba(0,0,0,0.07)',
              borderBottom: '1px dashed rgba(0,0,0,0.1)',
              borderRadius: '8px 8px 0 0',
            }}
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-0.5 flex-1 overflow-visible">
              {/* 1. Bold */}
              <button
                onMouseDown={e => { e.preventDefault(); execCmd('bold') }}
                className="p-1 rounded hover:bg-black/10 transition-colors"
                title="굵게"
              >
                <Bold size={12} />
              </button>

              {/* 2. Italic */}
              <button
                onMouseDown={e => { e.preventDefault(); execCmd('italic') }}
                className="p-1 rounded hover:bg-black/10 transition-colors"
                title="기울임"
              >
                <Italic size={12} />
              </button>

              {/* 3. Underline */}
              <button
                onMouseDown={e => { e.preventDefault(); execCmd('underline') }}
                className="p-1 rounded hover:bg-black/10 transition-colors"
                title="밑줄"
              >
                <Underline size={12} />
              </button>

              <div className="w-px h-3 bg-black/20 mx-1 shrink-0" />

              {/* 4. 글자 크기 (T) */}
              <div className="relative">
                <button
                  onMouseDown={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowFontSize(v => !v)
                    setShowTextColor(false)
                    setShowHighlight(false)
                  }}
                  className={`p-1 rounded transition-colors ${showFontSize ? 'bg-black/15' : 'hover:bg-black/10'}`}
                  title="글자 크기"
                >
                  <Type size={12} />
                </button>
                {showFontSize && (
                  <div
                    className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
                    style={{ zIndex: 99999, minWidth: '110px' }}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    {FONT_SIZES.map(s => (
                      <button
                        key={s.value}
                        onMouseDown={e => {
                          e.preventDefault()
                          execCmd('fontSize', s.value)
                          setShowFontSize(false)
                        }}
                        className="w-full flex items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-100 transition-colors"
                        style={{ color: '#374151' }}
                      >
                        <span>{s.label}</span>
                        <span
                          className="font-bold"
                          style={{ fontSize: `${8 + parseInt(s.value) * 2}px`, lineHeight: 1 }}
                        >
                          가
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. 글씨 색 (Palette) */}
              <div className="relative">
                <button
                  onMouseDown={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowTextColor(v => !v)
                    setShowFontSize(false)
                    setShowHighlight(false)
                  }}
                  className={`p-1 rounded transition-colors ${showTextColor ? 'bg-black/15' : 'hover:bg-black/10'}`}
                  title="글씨 색"
                >
                  <Palette size={12} />
                </button>
                {showTextColor && (
                  <div
                    className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-gray-200"
                    style={{ zIndex: 99999, minWidth: '120px' }}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <p className="text-[10px] font-semibold text-gray-400 mb-1.5 px-0.5">글씨 색</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TEXT_COLORS.map(c => (
                        <button
                          key={c}
                          onMouseDown={e => {
                            e.preventDefault()
                            execCmd('foreColor', c)
                            setShowTextColor(false)
                          }}
                          className="w-6 h-6 rounded-full border-2 border-white hover:scale-110 transition-transform shadow-sm"
                          style={{ background: c, outline: '1px solid rgba(0,0,0,0.15)' }}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 6. 음영색 형광펜 (Highlighter) */}
              <div className="relative">
                <button
                  onMouseDown={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowHighlight(v => !v)
                    setShowFontSize(false)
                    setShowTextColor(false)
                  }}
                  className={`p-1 rounded transition-colors ${showHighlight ? 'bg-black/15' : 'hover:bg-black/10'}`}
                  title="형광펜 (음영 색)"
                >
                  <Highlighter size={12} />
                </button>
                {showHighlight && (
                  <div
                    className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-gray-200"
                    style={{ zIndex: 99999, minWidth: '130px' }}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <p className="text-[10px] font-semibold text-gray-400 mb-1.5 px-0.5">형광펜 색</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {HIGHLIGHT_COLORS.map((c, i) => (
                        <button
                          key={c + i}
                          onMouseDown={e => {
                            e.preventDefault()
                            execCmd('hiliteColor', c === 'transparent' ? 'transparent' : c)
                            setShowHighlight(false)
                          }}
                          className="w-6 h-6 rounded border-2 border-white flex items-center justify-center hover:scale-110 transition-transform shadow-sm"
                          style={{
                            background: c === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, white 0% 50%) 0 0 / 8px 8px' : c,
                            outline: '1px solid rgba(0,0,0,0.15)',
                          }}
                          title={c === 'transparent' ? '없음' : c}
                        >
                          {c === 'transparent' && (
                            <Eraser size={10} className="text-gray-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 서식 지우기 */}
              <button
                onMouseDown={e => { e.preventDefault(); execCmd('removeFormat') }}
                className="p-1 rounded hover:bg-black/10 transition-colors"
                title="서식 지우기"
              >
                <Eraser size={12} />
              </button>
            </div>

            {/* 복사 버튼 */}
            <button
              onMouseDown={e => { e.preventDefault(); handleCopy() }}
              className="p-1 rounded hover:bg-black/10 ml-1 transition-colors"
              title="내용 복사"
            >
              <Copy size={12} />
            </button>
          </div>
        )}

        {/* ── 본문 영역 ── */}
        <div
          className="flex-1 flex flex-col p-3 overflow-hidden"
          style={{ borderRadius: isFocused ? '0' : '8px' }}
          onClick={() => {
            if (!isFocused) {
              setIsFocused(true)
              onFocus(memo.id)
            }
          }}
        >
          <input
            value={title}
            onChange={e => {
              setTitle(e.target.value)
              debouncedUpdate({ title: e.target.value })
            }}
            placeholder="새 메모"
            className="font-bold text-sm bg-transparent border-none outline-none w-full mb-2 placeholder-black/30"
            style={{ color: 'rgba(0,0,0,0.8)' }}
          />
          <div className="w-full h-px mb-2" style={{ borderBottom: '1px dashed rgba(0,0,0,0.1)' }} />

          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={e => {
              const html = e.currentTarget.innerHTML
              setContent(html)
              debouncedUpdate({ content: html })
            }}
            onInput={e => {
              setContent(e.currentTarget.innerHTML)
              debouncedUpdate({ content: e.currentTarget.innerHTML })
            }}
            className="empty-placeholder flex-1 bg-transparent border-none outline-none text-[13px] leading-relaxed whitespace-pre-wrap break-words overflow-y-auto"
            style={{ color: 'rgba(0,0,0,0.7)', scrollbarWidth: 'thin' }}
            data-placeholder="메모 내용을 입력하세요..."
            dangerouslySetInnerHTML={{ __html: memo.content }}
          />
        </div>

        {/* ── 하단 바 (포커스 시): 배경색 + 핀/삭제 ── */}
        {isFocused && (
          <div
            className="flex items-center justify-between px-2 py-1.5 shrink-0"
            style={{
              background: 'rgba(0,0,0,0.04)',
              borderTop: '1px dashed rgba(0,0,0,0.08)',
              borderRadius: '0 0 8px 8px',
            }}
          >
            <div className="flex items-center gap-1">
              {BG_COLORS.map(c => (
                <button
                  key={c}
                  onMouseDown={e => { e.preventDefault(); debouncedUpdate({ color: c }) }}
                  className={`w-4 h-4 rounded-full border transition-all ${memo.color === c ? 'border-gray-500 scale-125 shadow' : 'border-black/10 hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                onMouseDown={e => { e.preventDefault(); debouncedUpdate({ is_pinned: memo.is_pinned ? 0 : 1 }) }}
                className={`p-1.5 rounded transition-colors ${memo.is_pinned ? 'text-black bg-black/10' : 'text-black/40 hover:bg-black/5 hover:text-black'}`}
              >
                <Pin size={12} className={memo.is_pinned ? 'fill-current' : ''} />
              </button>
              <button
                onMouseDown={e => { e.preventDefault(); onDelete(memo.id) }}
                className="p-1.5 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        )}

        {/* ── 크기 조절 핸들 ── */}
        {isFocused && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-50 hover:opacity-100 transition-opacity"
            style={{ background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.25) 50%)', borderRadius: '0 0 8px 0' }}
            onMouseDown={handleResizeStart}
          />
        )}
      </div>
    </>
  )
}
