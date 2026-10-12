import { useState, useRef, useEffect } from 'react'
import { Layers, Plus, X, RotateCw, Scissors, ChevronLeft, ChevronRight, Download, GripVertical } from 'lucide-react'
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
// @ts-ignore - vite worker url import
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url'

;(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl

interface PdfFile { id: string; name: string; size: number; arrayBuffer: ArrayBuffer }
interface Stamp { xRatio: number; yRatio: number; widthMm: number }
interface PageItem {
  id: string; fileId: string; fileName: string; pageIndex: number; pageNumber: number
  pdfjsPage: any; rotation: number; cropPercent: number; selected: boolean; stamps: Stamp[]
}

const ACCENT = '#3b82f6'

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-5 rounded-full transition-colors relative shrink-0"
      style={{ background: on ? ACCENT : 'rgba(100,116,139,0.4)' }}
    >
      <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all" style={{ left: on ? '18px' : '2px' }} />
    </button>
  )
}

function SectionNum({ n }: { n: number }) {
  return (
    <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ background: ACCENT }}>{n}</span>
  )
}

// 페이지 썸네일 캔버스
function PageThumb({ page, rotation, cropPercent }: { page: any; rotation: number; cropPercent: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const viewport = page.getViewport({ scale: 0.45, rotation })
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    const task = page.render({ canvasContext: ctx, viewport })
    task.promise.then(() => {
      if (cropPercent > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
        const trimW = canvas.width * (cropPercent / 100)
        const trimH = canvas.height * (cropPercent / 100)
        ctx.fillRect(0, 0, canvas.width, trimH)
        ctx.fillRect(0, canvas.height - trimH, canvas.width, trimH)
        ctx.fillRect(0, trimH, trimW, canvas.height - trimH * 2)
        ctx.fillRect(canvas.width - trimW, trimH, trimW, canvas.height - trimH * 2)
        ctx.strokeStyle = ACCENT
        ctx.setLineDash([6, 6])
        ctx.lineWidth = 2.5
        ctx.strokeRect(trimW, trimH, canvas.width - trimW * 2, canvas.height - trimH * 2)
        ctx.setLineDash([])
      }
    }).catch(() => {})
    return () => { try { task.cancel() } catch (e) {} }
  }, [page, rotation, cropPercent])
  return <canvas ref={ref} className="w-full h-auto block" />
}

export default function PdfWorkshop() {
  const [files, setFiles] = useState<PdfFile[]>([])
  const [pages, setPages] = useState<PageItem[]>([])
  const [stampBytes, setStampBytes] = useState<ArrayBuffer | null>(null)
  const [stampUrl, setStampUrl] = useState<string | null>(null)
  const [stampSize, setStampSize] = useState(25)

  const [compress, setCompress] = useState(true)
  const [compressMode, setCompressMode] = useState<'standard' | 'maximum'>('standard')
  const [pageNum, setPageNum] = useState(true)
  const [pageNumFormat, setPageNumFormat] = useState<'simple' | 'hyphen' | 'fraction' | 'full-hyphen'>('fraction')
  const [watermark, setWatermark] = useState(false)
  const [watermarkText, setWatermarkText] = useState('CONFIDENTIAL')

  const [loading, setLoading] = useState(false)
  const [buildMsg, setBuildMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [result, setResult] = useState<{ orig: number; comp: number; pct: number; url: string; name: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (list: File[]) => {
    const valid = list.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf') || f.type.startsWith('image/'))
    if (valid.length === 0) return
    setLoading(true)
    try {
      const newFiles: PdfFile[] = []
      const newPages: PageItem[] = []
      for (const file of valid) {
        const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)
        let arrayBuffer = await file.arrayBuffer()

        if (file.type.startsWith('image/')) {
          const buf = await convertImageToPdf(file, arrayBuffer)
          if (!buf) continue
          arrayBuffer = buf
        }

        const pdfjsDoc = await (pdfjsLib as any).getDocument({ data: arrayBuffer.slice(0) }).promise
        newFiles.push({ id: fileId, name: file.name, size: file.size || arrayBuffer.byteLength, arrayBuffer })

        for (let i = 1; i <= pdfjsDoc.numPages; i++) {
          const page = await pdfjsDoc.getPage(i)
          newPages.push({
            id: `${fileId}_p${i}`, fileId, fileName: file.name, pageIndex: i - 1, pageNumber: i,
            pdfjsPage: page, rotation: 0, cropPercent: 0, selected: true, stamps: []
          })
        }
      }
      setFiles(prev => [...prev, ...newFiles])
      setPages(prev => [...prev, ...newPages])
    } catch (err: any) {
      alert('파일을 불러오는 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function convertImageToPdf(file: File, arrayBuffer: ArrayBuffer): Promise<ArrayBuffer | null> {
    const tempPdf = await PDFDocument.create()
    const page = tempPdf.addPage([595.28, 841.89])
    let img
    if (file.type === 'image/jpeg' || file.type === 'image/jpg') img = await tempPdf.embedJpg(arrayBuffer)
    else if (file.type === 'image/png') img = await tempPdf.embedPng(arrayBuffer)
    if (!img) return null
    const { width, height } = page.getSize()
    const dims = img.scaleToFit(width - 40, height - 40)
    page.drawImage(img, { x: (width - dims.width) / 2, y: (height - dims.height) / 2, width: dims.width, height: dims.height })
    const bytes = await tempPdf.save()
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  }

  const handleStampFile = async (file?: File) => {
    if (!file) return
    setStampBytes(await file.arrayBuffer())
    const reader = new FileReader()
    reader.onload = ev => setStampUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const removeFile = (fileId: string) => {
    if (!confirm('이 파일을 목록에서 삭제하시겠습니까?')) return
    setFiles(prev => prev.filter(f => f.id !== fileId))
    setPages(prev => prev.filter(p => p.fileId !== fileId))
  }

  const updatePage = (id: string, patch: Partial<PageItem>) =>
    setPages(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)))

  const moveItem = (from: number, to: number) => {
    setPages(prev => {
      if (to < 0 || to >= prev.length) return prev
      const arr = [...prev]
      const [target] = arr.splice(from, 1)
      arr.splice(to, 0, target)
      return arr
    })
  }

  const addStamp = (id: string, e: React.MouseEvent<HTMLDivElement>) => {
    if (!stampBytes) return
    const canvas = e.currentTarget.querySelector('canvas')
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    setPages(prev => prev.map(p => p.id === id ? {
      ...p,
      stamps: [...p.stamps, { xRatio: (e.clientX - rect.left) / rect.width, yRatio: (e.clientY - rect.top) / rect.height, widthMm: stampSize }]
    } : p))
  }

  const removeStamp = (id: string, idx: number) =>
    setPages(prev => prev.map(p => p.id === id ? { ...p, stamps: p.stamps.filter((_, i) => i !== idx) } : p))

  const selectedItems = pages.filter(p => p.selected)
  const totalSize = files.reduce((a, c) => a + c.size, 0)

  const buildPdf = async () => {
    const items = pages.filter(p => p.selected)
    if (items.length === 0) return
    setLoading(true)
    setBuildMsg('PDF 빌드 중...')
    try {
      const merged = await PDFDocument.create()
      const font = await merged.embedFont(StandardFonts.HelveticaBold)
      let embeddedStamp: any = null
      if (stampBytes) embeddedStamp = await merged.embedPng(stampBytes)

      const targetScale = compressMode === 'maximum' ? 1.0 : 1.25
      const targetQuality = compressMode === 'maximum' ? 0.55 : 0.72
      const wmStr = watermarkText.trim() || 'CONFIDENTIAL'
      const total = items.length

      const drawExtras = (added: any, w: number, h: number, i: number, item: PageItem) => {
        if (watermark) {
          const wmSize = 48
          const tw = font.widthOfTextAtSize(wmStr, wmSize)
          added.drawText(wmStr, { x: (w - tw) / 2, y: h / 2, size: wmSize, font, color: rgb(0.31, 0.27, 0.9), opacity: 0.2, rotate: degrees(45) })
        }
        if (pageNum) {
          const cur = i + 1
          let t = ''
          if (pageNumFormat === 'simple') t = `${cur}`
          else if (pageNumFormat === 'hyphen') t = `- ${cur} -`
          else if (pageNumFormat === 'fraction') t = `${cur}/${total}`
          else t = `- ${cur} / ${total} -`
          const nw = font.widthOfTextAtSize(t, 10)
          added.drawText(t, { x: (w - nw) / 2, y: 20, size: 10, font, color: rgb(0.3, 0.35, 0.45) })
        }
        if (item.stamps.length > 0 && embeddedStamp) {
          for (const s of item.stamps) {
            const sw = s.widthMm * 2.83465
            const sh = (sw / embeddedStamp.width) * embeddedStamp.height
            added.drawImage(embeddedStamp, { x: s.xRatio * w - sw / 2, y: h - s.yRatio * h - sh / 2, width: sw, height: sh })
          }
        }
      }

      if (compress) {
        for (let i = 0; i < total; i++) {
          const item = items[i]
          setBuildMsg(`용량 다이어트 중 (${i + 1}/${total})...`)
          const viewport = item.pdfjsPage.getViewport({ scale: targetScale, rotation: item.rotation })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const ctx = canvas.getContext('2d')
          await item.pdfjsPage.render({ canvasContext: ctx!, viewport }).promise

          const base64 = canvas.toDataURL('image/jpeg', targetQuality).split(',')[1]
          const bin = atob(base64)
          const bytes = new Uint8Array(bin.length)
          for (let b = 0; b < bin.length; b++) bytes[b] = bin.charCodeAt(b)

          const jpg = await merged.embedJpg(bytes)
          const stdW = 595.28
          const stdH = (viewport.height / viewport.width) * stdW
          const added = merged.addPage([stdW, stdH])
          if (item.cropPercent > 0) {
            const tW = stdW * (item.cropPercent / 100)
            const tH = stdH * (item.cropPercent / 100)
            added.setCropBox(tW, tH, stdW - tW * 2, stdH - tH * 2)
          }
          added.drawImage(jpg, { x: 0, y: 0, width: stdW, height: stdH })
          drawExtras(added, stdW, stdH, i, item)
        }
      } else {
        const loaded = new Map<string, PDFDocument>()
        for (let i = 0; i < total; i++) {
          const item = items[i]
          if (!loaded.has(item.fileId)) {
            const raw = files.find(f => f.id === item.fileId)!
            loaded.set(item.fileId, await PDFDocument.load(raw.arrayBuffer))
          }
          const src = loaded.get(item.fileId)!
          const [copied] = await merged.copyPages(src, [item.pageIndex])
          const added = merged.addPage(copied)
          if (item.rotation !== 0) added.setRotation(degrees(added.getRotation().angle + item.rotation))
          const { width, height } = added.getSize()
          if (item.cropPercent > 0) {
            const tW = width * (item.cropPercent / 100)
            const tH = height * (item.cropPercent / 100)
            added.setCropBox(tW, tH, width - tW * 2, height - tH * 2)
          }
          drawExtras(added, width, height, i, item)
        }
      }

      const out = await merged.save()
      const blob = new Blob([out], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const name = `PDF_공작소_${compress ? '에듀파인최적화_' : ''}${new Date().toISOString().slice(0, 10)}.pdf`
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()

      const orig = files.reduce((a2, c) => a2 + c.size, 0) || out.byteLength * 2
      const pct = Math.max(0, Math.round(((orig - out.byteLength) / orig) * 100))
      setResult({ orig, comp: out.byteLength, pct, url, name })
    } catch (err: any) {
      alert('PDF 처리 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setLoading(false)
      setBuildMsg('')
    }
  }

  const cardStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)' } as const
  const insetStyle = { background: 'var(--bg-secondary)', border: '1px solid var(--border)' } as const
  const muted = { color: 'var(--text-muted)' } as const
  const primary = { color: 'var(--text-primary)' } as const

  const badge = result
    ? result.comp <= 10 * 1024 * 1024
      ? { text: '✅ 에듀파인 10MB 기준 통과! 안심하고 첨부하세요.', color: '#10b981' }
      : result.comp <= 20 * 1024 * 1024
        ? { text: '⚠️ 10MB는 초과하지만 20MB 한도 내 첨부 가능합니다.', color: '#f59e0b' }
        : { text: '⚠️ 20MB를 초과했습니다. 초강력 다이어트로 재시도해보세요.', color: '#ef4444' }
    : null

  return (
    <div className="fade-in space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            <Layers size={16} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">PDF 공작소</h1>
            <p className="text-xs" style={muted}>분할·회전·자르기·합치기와 에듀파인 용량 다이어트를 한 번에 처리합니다. (모든 작업은 내 PC에서만 처리됩니다)</p>
          </div>
        </div>
        <button
          onClick={buildPdf}
          disabled={loading || selectedItems.length === 0}
          className="btn-primary text-xs"
          style={{ opacity: loading || selectedItems.length === 0 ? 0.5 : 1 }}
        >
          <Download size={13} /> {loading && buildMsg ? buildMsg : '선택 페이지 새 PDF로 저장'}
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl p-3" style={cardStyle}>
          <span className="text-xs font-semibold" style={muted}>등록 문서 & 원본 용량</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold" style={primary}>{files.length}</span>
            <span className="text-xs" style={muted}>개 파일 ({formatBytes(totalSize)})</span>
          </div>
        </div>
        <div className="rounded-xl p-3" style={cardStyle}>
          <span className="text-xs font-semibold" style={muted}>추출 대기 페이지</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold" style={primary}>{selectedItems.length}</span>
            <span className="text-xs" style={muted}>개 페이지</span>
          </div>
        </div>
        <div className="rounded-xl p-3" style={cardStyle}>
          <span className="text-xs font-semibold" style={muted}>에듀파인 용량 다이어트</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-bold" style={primary}>{compress ? '다이어트 ON' : '원본 유지'}</span>
            <span className="text-[11px] font-semibold" style={{ color: '#8b5cf6' }}>
              {compress ? (compressMode === 'maximum' ? '초강력 (~90%↓)' : '표준 (~70%↓)') : ''}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 items-start flex-col xl:flex-row">
        {/* 좌측 설정 패널 */}
        <div className="w-full xl:w-[320px] xl:flex-shrink-0 space-y-3">
          {/* 1. 문서 추가 */}
          <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center gap-2" style={primary}><SectionNum n={1} /> 문서 및 이미지 추가</h2>
              <span className="text-[11px] font-semibold" style={{ color: ACCENT }}>{files.length}개 파일</span>
            </div>
            <div
              className="rounded-xl p-5 text-center cursor-pointer transition-colors"
              style={{ ...insetStyle, borderStyle: 'dashed', background: dragOver ? 'rgba(59,130,246,0.1)' : 'var(--bg-secondary)' }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) handleFiles(Array.from(e.dataTransfer.files)) }}
            >
              <div className="w-10 h-10 mx-auto rounded-full flex items-center justify-center text-white" style={{ background: ACCENT }}>
                <Plus size={20} />
              </div>
              <p className="mt-2 text-xs font-bold" style={primary}>PDF 및 이미지(JPG, PNG)</p>
              <p className="text-[11px] mt-0.5" style={muted}>파일을 끌어다 놓거나 클릭하세요</p>
              <input ref={fileInputRef} type="file" className="hidden" accept="application/pdf, image/jpeg, image/png" multiple
                onChange={e => { if (e.target.files?.length) handleFiles(Array.from(e.target.files)); e.target.value = '' }} />
            </div>
            <ul className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {files.map((f, idx) => (
                <li key={f.id} className="p-2 rounded-lg flex justify-between items-center" style={insetStyle}>
                  <div className="truncate flex-1 mr-2 text-[11px]" title={f.name}>
                    <p className="font-bold truncate" style={primary}>{f.name}</p>
                    <p className="text-[10px]" style={muted}>{formatBytes(f.size)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ color: ACCENT, background: 'rgba(59,130,246,0.12)' }}>#{idx + 1}</span>
                    <button onClick={() => removeFile(f.id)} className="p-1" style={{ color: '#f87171' }} title="파일 삭제"><X size={13} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* 2. 용량 다이어트 */}
          <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center gap-2" style={primary}><SectionNum n={2} /> 에듀파인 용량 다이어트</h2>
              <Toggle on={compress} onClick={() => setCompress(!compress)} />
            </div>
            <p className="text-[11px] leading-relaxed" style={muted}>
              에듀파인 첨부 시 <strong style={{ color: ACCENT }}>10MB 용량 초과</strong>를 방지하기 위해 스마트 리샘플링 압축을 적용합니다.
            </p>
            {compress && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  {([['standard', '표준 (~70%↓)'], ['maximum', '초강력 (~90%↓)']] as const).map(([v, label]) => (
                    <label key={v} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg" style={{ ...insetStyle, color: 'var(--text-primary)' }}>
                      <input type="radio" name="compress-mode" checked={compressMode === v} onChange={() => setCompressMode(v)} className="accent-blue-500" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] font-semibold" style={{ color: '#8b5cf6' }}>* 스캔 배경 비트맵만 경량화되며, 도장 및 쪽번호는 또렷하게 유지됩니다.</p>
              </div>
            )}
          </div>

          {/* 3. 직인 */}
          <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
            <h2 className="font-bold text-sm flex items-center gap-2" style={primary}><SectionNum n={3} /> 투명 직인 / 서명</h2>
            <p className="text-[11px] leading-relaxed" style={muted}>배경이 투명한 PNG 도장을 등록하고 우측 페이지 썸네일을 클릭하면 도장이 찍힙니다.</p>
            <input type="file" accept="image/png" className="block w-full text-xs cursor-pointer" style={muted}
              onChange={e => handleStampFile(e.target.files?.[0])} />
            {stampUrl && (
              <div className="flex items-center gap-3 p-2 rounded-lg" style={insetStyle}>
                <div className="w-11 h-11 rounded-lg flex items-center justify-center p-1 shrink-0 overflow-hidden" style={cardStyle}>
                  <img src={stampUrl} className="max-w-full max-h-full object-contain" alt="직인 미리보기" />
                </div>
                <div className="text-xs">
                  <span className="font-bold block" style={primary}>직인 준비 완료</span>
                  <span className="text-[10px]" style={muted}>우측 썸네일 클릭 시 날인</span>
                </div>
              </div>
            )}
            <div className="pt-2 space-y-1.5" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span style={muted}>날인 직경</span>
                <span style={{ color: ACCENT }} className="font-bold">{stampSize}mm</span>
              </div>
              <input type="range" min={10} max={60} value={stampSize} onChange={e => setStampSize(parseInt(e.target.value))} className="w-full cursor-pointer accent-blue-500" />
            </div>
          </div>

          {/* 4. 워터마크 */}
          <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center gap-2" style={primary}><SectionNum n={4} /> 보안 워터마크</h2>
              <Toggle on={watermark} onClick={() => setWatermark(!watermark)} />
            </div>
            {watermark && (
              <div className="space-y-1.5">
                <input type="text" value={watermarkText} onChange={e => setWatermarkText(e.target.value)} className="input w-full text-xs font-bold" />
                <p className="text-[10px]" style={muted}>* 대각선 45도 반투명 텍스트(영문/숫자)가 자동 삽입됩니다.</p>
              </div>
            )}
          </div>

          {/* 5. 쪽번호 */}
          <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm flex items-center gap-2" style={primary}><SectionNum n={5} /> 쪽번호 인쇄</h2>
              <Toggle on={pageNum} onClick={() => setPageNum(!pageNum)} />
            </div>
            {pageNum && (
              <div className="space-y-1.5 text-xs">
                <label className="text-xs font-semibold block" style={muted}>인쇄 서식 선택</label>
                {([
                  ['simple', '1, 2, 3... (단순 숫자)'],
                  ['hyphen', '- 1 -, - 2 -, - 3 - (하이픈)'],
                  ['fraction', '1/3, 2/3, 3/3 (전체 페이지)'],
                  ['full-hyphen', '- 1 / 3 - (공문서 표준)']
                ] as const).map(([v, label]) => (
                  <label key={v} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg" style={insetStyle}>
                    <input type="radio" name="page-num-format" checked={pageNumFormat === v} onChange={() => setPageNumFormat(v)} className="accent-blue-500" />
                    <span className="font-semibold" style={primary}>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우측 페이지 조작 보드 */}
        <div className="flex-1 min-w-0 w-full">
          <div className="rounded-xl p-4 min-h-[480px] flex flex-col" style={cardStyle}>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm flex items-center gap-2" style={primary}><SectionNum n={6} /> 페이지 조작 보드</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ color: ACCENT, background: 'rgba(59,130,246,0.12)' }}>
                  마우스 드래그로 순서 변경 가능
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button className="btn-ghost text-xs" onClick={() => setPages(p => p.map(x => ({ ...x, selected: true })))}>전체 선택</button>
                <button className="btn-ghost text-xs" onClick={() => setPages(p => p.map(x => ({ ...x, selected: false })))}>전체 해제</button>
                <button className="btn-danger text-xs" onClick={() => { if (confirm('모두 삭제하시겠습니까?')) { setFiles([]); setPages([]) } }}>모두 비우기</button>
              </div>
            </div>

            {pages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-2" style={muted}>
                <Layers size={36} />
                <p className="text-sm font-bold" style={primary}>등록된 문서 페이지가 없습니다.</p>
                <p className="text-xs">좌측에서 PDF 및 이미지 파일을 끌어다 놓으세요.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 pt-4">
                {pages.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={e => { setDragIdx(index); e.dataTransfer.setData('text/plain', String(index)) }}
                    onDragOver={e => { e.preventDefault(); setOverIdx(index) }}
                    onDragLeave={() => setOverIdx(null)}
                    onDrop={e => { e.preventDefault(); setOverIdx(null); if (dragIdx !== null && dragIdx !== index) moveItem(dragIdx, index); setDragIdx(null) }}
                    onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
                    className="relative rounded-xl p-2 flex flex-col items-center space-y-2 transition-all select-none"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: overIdx === index ? `2px solid ${ACCENT}` : item.selected ? `2px solid ${ACCENT}` : '2px solid var(--border)',
                      opacity: dragIdx === index ? 0.4 : item.selected ? 1 : 0.55,
                      transform: overIdx === index ? 'scale(1.03)' : undefined
                    }}
                  >
                    <div className="w-full flex items-center justify-between px-1 cursor-grab active:cursor-grabbing" title="끌어서 순서를 변경하세요" style={muted}>
                      <div className="flex items-center gap-1">
                        <GripVertical size={12} />
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ color: ACCENT, background: 'rgba(59,130,246,0.12)' }}>#{index + 1}</span>
                      </div>
                      <span className="text-[9px] font-semibold">끌어서 이동</span>
                    </div>

                    <div
                      className="relative w-full rounded-lg overflow-hidden bg-white"
                      style={{ cursor: stampBytes ? 'crosshair' : 'default', border: '1px solid var(--border)' }}
                      onClick={e => addStamp(item.id, e)}
                    >
                      <PageThumb page={item.pdfjsPage} rotation={item.rotation} cropPercent={item.cropPercent} />
                      <div className="absolute inset-0 pointer-events-none">
                        {stampUrl && item.stamps.map((s, sIdx) => (
                          <img
                            key={sIdx}
                            src={stampUrl}
                            className="absolute pointer-events-auto cursor-pointer drop-shadow-md"
                            style={{ left: `${s.xRatio * 100}%`, top: `${s.yRatio * 100}%`, width: `${(s.widthMm / 210) * 100}%`, transform: 'translate(-50%, -50%)' }}
                            title="클릭하여 도장 삭제"
                            onClick={e => { e.stopPropagation(); removeStamp(item.id, sIdx) }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="w-full flex flex-wrap items-center justify-between gap-1 text-xs pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                      <label className="flex items-center gap-1.5 cursor-pointer min-w-0">
                        <input type="checkbox" checked={item.selected} onChange={e => updatePage(item.id, { selected: e.target.checked })} className="w-4 h-4 accent-blue-500 shrink-0" />
                        <span className="font-bold truncate max-w-[55px]" style={primary} title={item.fileName}>{item.fileName.substring(0, 5)}..</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ color: ACCENT, background: 'rgba(59,130,246,0.12)' }}>p.{item.pageNumber}</span>
                      </label>
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        <button className="btn-ghost w-6 h-6 !p-0 flex items-center justify-center" title="여백 자르기 (클릭할 때마다 5%씩)"
                          onClick={() => updatePage(item.id, { cropPercent: (item.cropPercent + 5) % 25 })}><Scissors size={11} /></button>
                        <button className="btn-ghost w-6 h-6 !p-0 flex items-center justify-center" title="90° 회전"
                          onClick={() => updatePage(item.id, { rotation: (item.rotation + 90) % 360 })}><RotateCw size={11} /></button>
                        <button className="btn-ghost w-6 h-6 !p-0 flex items-center justify-center" title="앞으로" disabled={index === 0}
                          onClick={() => moveItem(index, index - 1)}><ChevronLeft size={12} /></button>
                        <button className="btn-ghost w-6 h-6 !p-0 flex items-center justify-center" title="뒤로" disabled={index === pages.length - 1}
                          onClick={() => moveItem(index, index + 1)}><ChevronRight size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 결과 모달 */}
      {result && badge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl" style={{ background: 'var(--bg-card, #1e293b)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base" style={primary}>PDF 저장 완료</h3>
                <p className="text-[11px]" style={muted}>새 PDF 파일 다운로드가 시작되었습니다</p>
              </div>
              <button onClick={() => setResult(null)} className="p-1" style={muted}><X size={16} /></button>
            </div>
            <div className="p-3 rounded-xl space-y-2" style={insetStyle}>
              <div className="flex justify-between text-xs"><span style={muted}>원본 선택 용량</span><span className="font-bold" style={primary}>{formatBytes(result.orig)}</span></div>
              <div className="flex justify-between text-xs"><span style={muted}>생성 용량</span><span className="font-bold" style={{ color: ACCENT }}>{formatBytes(result.comp)}</span></div>
              <div className="flex justify-between text-xs pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                <span className="font-semibold" style={{ color: '#10b981' }}>용량 절감율</span>
                <span className="font-bold" style={{ color: '#10b981' }}>{result.pct > 0 ? `-${result.pct}% 절감` : '최적화 완료'}</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl text-xs font-semibold" style={{ color: badge.color, background: `${badge.color}18` }}>{badge.text}</div>
            <div className="flex gap-2">
              <a href={result.url} download={result.name} className="btn-primary text-xs flex-1 justify-center">다시 다운로드</a>
              <button onClick={() => setResult(null)} className="btn-ghost text-xs">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

