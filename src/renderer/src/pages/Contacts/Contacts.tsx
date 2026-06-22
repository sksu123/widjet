import { useState, useEffect, useRef } from 'react'
import { Phone, Mail, Plus, Trash2, Save, X, BookUser, Search, Download, Upload, FileSpreadsheet, Printer, Star, Filter, CheckSquare, Square, ChevronUp, ChevronDown, Check, Pencil } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useSearchParams } from 'react-router-dom'

interface Contact {
  id: number
  type: 'staff' | 'company'
  name: string
  department: string
  phone: string
  mobile: string
  ceo_name: string
  email: string
  note: string
  sort_order: number
  is_favorite: number
}

export default function Contacts() {
  const [activeTab, setActiveTab] = useState<'staff' | 'company'>('staff')
  const [contacts, setContacts] = useState<Contact[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  
  // UI State
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [filterDept, setFilterDept] = useState<string>('all')
  const [sortCol, setSortCol] = useState<keyof Contact | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null)
  const [showDeptDropdown, setShowDeptDropdown] = useState(false)

  // Bulk Edit Modal State
  const [isBulkEdit, setIsBulkEdit] = useState(false)
  const [bulkData, setBulkData] = useState<Contact[]>([])
  const [bulkDeletes, setBulkDeletes] = useState<number[]>([])
  const [saving, setSaving] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => { loadContacts() }, [])

  useEffect(() => {
    setSelectedIds([])
    setFilterDept('all')
    setSortCol(null)
    setSortDir(null)
    setSearch('')
  }, [activeTab])

  async function loadContacts() {
    const res = await window.api.db.getContacts()
    if (res.success) {
      setContacts(res.data as Contact[])
    }
  }

  const handleToggleFavorite = async (id: number, currentFav: number) => {
    await window.api.db.toggleContactFavorite(id, !currentFav)
    loadContacts()
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`선택한 ${selectedIds.length}개의 연락처를 삭제하시겠습니까?`)) return
    
    for (const id of selectedIds) {
      await window.api.db.deleteContact(id)
    }
    setSelectedIds([])
    loadContacts()
  }

  const openBulkEdit = () => {
    setBulkData(contacts.filter(c => c.type === activeTab).map(c => ({...c})))
    setBulkDeletes([])
    setIsBulkEdit(true)
  }

  const closeBulkEdit = () => {
    if (confirm('저장하지 않은 변경사항이 사라집니다. 취소하시겠습니까?')) {
      setIsBulkEdit(false)
    }
  }

  const handleBulkSave = async () => {
    setSaving(true)
    try {
      await window.api.db.syncContactsBulk({
        updates: bulkData.map((c, i) => ({ ...c, sort_order: i })),
        deletes: bulkDeletes
      })
      await loadContacts()
      setIsBulkEdit(false)
    } catch (e) {
      console.error(e)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const addBulkRow = () => {
    const newId = -Date.now() - Math.random()
    setBulkData([...bulkData, {
      id: newId, type: activeTab, name: '', department: '', phone: '', mobile: '', ceo_name: '', email: '', note: '', sort_order: 0, is_favorite: 0
    }])
  }

  const removeBulkRow = (index: number) => {
    const row = bulkData[index]
    if (row.id > 0) {
      setBulkDeletes([...bulkDeletes, row.id])
    }
    const newData = [...bulkData]
    newData.splice(index, 1)
    setBulkData(newData)
  }

  const updateBulkRow = (index: number, field: keyof Contact, value: string | number) => {
    const newData = [...bulkData]
    newData[index] = { ...newData[index], [field]: value as never }
    setBulkData(newData)
  }

  const handleBulkPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text')
    if (!text) return
    e.preventDefault()
    
    const rows = text.split('\n').map(r => r.split('\t'))
    if (rows.length > 0 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
      rows.pop()
    }
    
    const newData = [...bulkData]
    for (const row of rows) {
      if (activeTab === 'staff') {
        newData.push({
          id: -Date.now() - Math.random(), type: 'staff',
          name: row[0]||'', department: row[1]||'', phone: row[2]||'', mobile: row[3]||'', ceo_name: '', email: '', note: row[4]||'', sort_order: 0, is_favorite: 0
        })
      } else {
        newData.push({
          id: -Date.now() - Math.random(), type: 'company',
          name: row[0]||'', ceo_name: row[1]||'', phone: row[2]||'', mobile: row[3]||'', email: row[4]||'', note: row[5]||'', sort_order: 0, is_favorite: 0
        })
      }
    }
    setBulkData(newData)
  }

  // 필터링 및 정렬 로직
  const getChosung = (str: string) => {
    const chosung = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
    let result = "";
    for(let i=0; i<str.length; i++) {
      const code = str.charCodeAt(i) - 44032;
      if(code > -1 && code < 11172) {
        result += chosung[Math.floor(code / 588)];
      } else {
        result += str.charAt(i);
      }
    }
    return result;
  }

  let filtered = contacts.filter(c => c.type === activeTab)
  
  const departments = Array.from(new Set(filtered.map(c => c.department).filter(Boolean)))

  if (filterDept !== 'all') {
    filtered = filtered.filter(c => c.department === filterDept)
  }

  if (search) {
    const term = search.toLowerCase()
    const termChosung = getChosung(term)
    const matchString = (str: string) => (str || '').toLowerCase().includes(term) || getChosung(str || '').includes(termChosung)
    
    filtered = filtered.filter(c => 
      matchString(c.name) || matchString(c.department) || matchString(c.phone) || 
      matchString(c.mobile) || matchString(c.ceo_name) || matchString(c.email) || matchString(c.note)
    )
  }

  if (sortCol && sortDir) {
    filtered.sort((a, b) => {
      const valA = a[sortCol] || ''
      const valB = b[sortCol] || ''
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  } else {
    filtered.sort((a, b) => {
      if (b.is_favorite !== a.is_favorite) return b.is_favorite - a.is_favorite
      return a.sort_order - b.sort_order
    })
  }

  const handleSort = (col: keyof Contact) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc')
      else if (sortDir === 'desc') { setSortCol(null); setSortDir(null); }
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  // 엑셀 내보내기/가져오기/서식/인쇄 로직
  function downloadTemplate() {
    if (activeTab === 'staff') {
      const ws = XLSX.utils.json_to_sheet([{ 이름: '홍길동', 부서: '행정실', 내선번호: '02-123-4567', 모바일: '010-1234-5678', 비고: '행정실장' }])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '교직원연락처_서식')
      XLSX.writeFile(wb, '교직원연락처_등록서식.xlsx')
    } else {
      const ws = XLSX.utils.json_to_sheet([{ 업체명: 'XX문구', 대표명: '김철수', 사무실번호: '02-987-6543', 모바일: '010-9876-5432', 이메일: 'contact@abc.com', 비고: '사무용품' }])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '업체연락처_서식')
      XLSX.writeFile(wb, '업체연락처_등록서식.xlsx')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      let added = 0
      for (const row of jsonData as any[]) {
        if (activeTab === 'staff' && row['이름']) {
          await window.api.db.addContact({
            type: 'staff', name: row['이름'], department: row['부서'] || '', phone: row['내선번호'] || '', mobile: row['모바일'] || '', note: row['비고'] || ''
          })
          added++
        } else if (activeTab === 'company' && row['업체명']) {
          await window.api.db.addContact({
            type: 'company', name: row['업체명'], ceo_name: row['대표명'] || '', phone: row['사무실번호'] || '', mobile: row['모바일'] || '', email: row['이메일'] || '', note: row['비고'] || ''
          })
          added++
        }
      }
      if (added > 0) { alert(`${added}개의 연락처가 등록되었습니다.`); loadContacts() }
    } catch (err) { alert('파일 읽기 실패') }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const getExportData = () => {
    return filtered.map(c => activeTab === 'staff' ? {
      '이름': c.name, '부서': c.department || '', '내선번호': c.phone || '', '모바일': c.mobile || '', '비고': c.note || ''
    } : {
      '업체명': c.name, '대표명': c.ceo_name || '', '사무실번호': c.phone || '', '모바일': c.mobile || '', '이메일': c.email || '', '비고': c.note || ''
    })
  }
  const exportFileName = activeTab === 'staff' ? '교직원연락처' : '업체연락처'

  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(getExportData())
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${exportFileName}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(getExportData())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Contacts")
    XLSX.writeFile(wb, `${exportFileName}.xlsx`)
  }

  const printContacts = () => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const headers = activeTab === 'staff' ? ['연번', '이름', '부서', '내선번호', '모바일', '비고'] : ['연번', '업체명', '대표명', '사무실번호', '모바일', '이메일', '비고'];
    const html = `
      <html>
      <head><title>${exportFileName}</title><style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #000;padding:8px;text-align:left;font-size:12px}th{background:#f2f2f2}</style></head>
      <body><h2>${exportFileName}</h2><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
        ${filtered.map((c, i) => activeTab === 'staff' 
          ? `<tr><td>${i+1}</td><td>${c.name||''}</td><td>${c.department||''}</td><td>${c.phone||''}</td><td>${c.mobile||''}</td><td>${c.note||''}</td></tr>`
          : `<tr><td>${i+1}</td><td>${c.name||''}</td><td>${c.ceo_name||''}</td><td>${c.phone||''}</td><td>${c.mobile||''}</td><td>${c.email||''}</td><td>${c.note||''}</td></tr>`
        ).join('')}
      </tbody></table></body></html>
    `;
    
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  }

  return (
    <div className="fade-in space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400">
              <BookUser size={16} />
            </div>
            <h1 className="page-title">연락처</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={downloadTemplate} className="btn-ghost text-xs" style={{ borderColor: 'var(--border)' }}>
              <Download size={14} /> 양식
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-ghost text-xs" style={{ borderColor: 'var(--border)' }}>
              <Upload size={14} /> 가져오기
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls, .csv" className="hidden" />
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="btn-ghost text-xs" style={{ borderColor: 'var(--border)' }}>
                <Download size={14} /> 내보내기
              </button>
              {showExportMenu && (
                <div className="absolute top-full right-0 mt-1 w-32 rounded-lg shadow-xl border z-50 overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                  <button onClick={() => { exportCSV(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-white/10 transition-colors" style={{ color: 'var(--text-primary)' }}>CSV 다운로드</button>
                  <button onClick={() => { exportExcel(); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-xs hover:bg-white/10 transition-colors" style={{ color: 'var(--text-primary)' }}>Excel 다운로드</button>
                </div>
              )}
            </div>
            <button onClick={printContacts} className="btn-ghost text-xs" style={{ borderColor: 'var(--border)' }}>
              <Printer size={14} /> 인쇄
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <button onClick={() => setActiveTab('staff')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'staff' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>교직원 연락처</button>
          <button onClick={() => setActiveTab('company')} className={`px-4 py-2 text-sm font-semibold transition-colors ${activeTab === 'company' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-500 hover:text-gray-300'}`}>업체 연락처</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              className="w-full bg-transparent outline-none pl-8 py-1 text-sm"
              style={{ color: 'var(--text-primary)' }}
              placeholder={activeTab === 'staff' ? "이름, 부서, 번호로 검색..." : "업체명, 번호로 검색..."}
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          {activeTab === 'staff' && (
            <div className="relative">
              <button onClick={() => setShowDeptDropdown(!showDeptDropdown)} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded border" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.2)' }}>
                <Filter size={12} /> {filterDept === 'all' ? '전체 부서' : filterDept} <ChevronDown size={12} />
              </button>
              {showDeptDropdown && (
                <div className="absolute top-full left-0 mt-1 w-40 rounded shadow-xl z-20" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <button onClick={() => { setFilterDept('all'); setShowDeptDropdown(false); }} className="block w-full text-left px-3 py-2 text-xs hover:bg-white/10" style={{ color: 'var(--text-primary)' }}>전체 부서</button>
                  {departments.map(d => (
                    <button key={d} onClick={() => { setFilterDept(d); setShowDeptDropdown(false); }} className="block w-full text-left px-3 py-2 text-xs hover:bg-white/10" style={{ color: 'var(--text-primary)' }}>{d}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button onClick={handleDeleteSelected} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30">
              <Trash2 size={12} /> {selectedIds.length}개 삭제
            </button>
          )}
          <button onClick={openBulkEdit} className="flex items-center gap-1 text-xs px-4 py-1.5 rounded font-semibold text-white shadow-sm transition-all hover:brightness-110" style={{ background: 'var(--accent-blue)' }}>
            <Pencil size={12} /> 연락처 편집
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.1)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
              <th className="px-4 py-3 text-left w-10">
                <button onClick={() => setSelectedIds(selectedIds.length === filtered.length && filtered.length > 0 ? [] : filtered.map(c => c.id))} className="text-gray-400 hover:text-white">
                  {filtered.length > 0 && selectedIds.length === filtered.length ? <CheckSquare size={14} /> : <Square size={14} />}
                </button>
              </th>
              <th className="px-2 py-3 text-left w-10">
                <button onClick={() => handleSort('is_favorite')} className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  <Star size={12} className={sortCol === 'is_favorite' ? 'text-yellow-400 fill-yellow-400' : ''} />
                  {sortCol === 'is_favorite' && (sortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
                </button>
              </th>
              
              {activeTab === 'staff' ? (
                <>
                  <th className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => handleSort('name')}>
                    이름 {sortCol === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => handleSort('department')}>
                    부서 {sortCol === 'department' && (sortDir === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>내선번호</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>휴대폰</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => handleSort('name')}>
                    업체명 {sortCol === 'name' && (sortDir === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none" style={{ color: 'var(--text-muted)' }} onClick={() => handleSort('ceo_name')}>
                    대표명 {sortCol === 'ceo_name' && (sortDir === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>사무실번호</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>휴대폰</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>이메일</th>
                </>
              )}
              
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>비고</th>
              <th className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>편집</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>데이터가 없습니다.</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }} className={`transition-colors hover:bg-white/[0.03] ${selectedIds.includes(c.id) ? 'bg-blue-500/10' : ''}`}>
                <td className="px-4 py-3">
                  <button onClick={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])} className="text-gray-400 hover:text-white">
                    {selectedIds.includes(c.id) ? <CheckSquare size={14} className="text-blue-400" /> : <Square size={14} />}
                  </button>
                </td>
                <td className="px-2 py-3">
                  <button onClick={() => handleToggleFavorite(c.id, c.is_favorite)} className="text-gray-400 hover:text-yellow-400 transition-colors">
                    <Star size={14} className={c.is_favorite ? 'text-yellow-400 fill-yellow-400' : ''} />
                  </button>
                </td>
                
                <td className="px-4 py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</td>
                
                {activeTab === 'staff' && <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{c.department || '-'}</td>}
                {activeTab === 'company' && <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{c.ceo_name || '-'}</td>}

                <td className="px-4 py-3">
                  {c.phone ? <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono" style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6' }}><Phone size={10} /> {c.phone}</a> : <span className="text-xs text-gray-500">-</span>}
                </td>
                <td className="px-4 py-3">
                  {c.mobile ? <a href={`tel:${c.mobile}`} className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><Phone size={10} /> {c.mobile}</a> : <span className="text-xs text-gray-500">-</span>}
                </td>
                
                {activeTab === 'company' && (
                  <td className="px-4 py-3">
                    {c.email ? <a href={`mailto:${c.email}`} className="text-xs hover:underline text-blue-400">{c.email}</a> : <span className="text-xs text-gray-500">-</span>}
                  </td>
                )}
                
                <td className="px-4 py-3 text-xs truncate max-w-[150px]" style={{ color: 'var(--text-secondary)' }}>{c.note || '-'}</td>
                
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={openBulkEdit} className="p-1 rounded hover:bg-white/10 transition-colors"><Pencil size={12} style={{ color: 'var(--text-muted)' }}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Edit Modal */}
      {isBulkEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-6xl h-[85vh] rounded-xl flex flex-col shadow-2xl overflow-hidden" style={{ background: 'var(--bg-default)', border: '1px solid var(--border)' }}>
            
            {/* Modal Header */}
            <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <Pencil size={18} style={{ color: 'var(--accent-blue)' }} /> 연락처 편집 ({activeTab === 'staff' ? '교직원' : '업체'})
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  모든 연락처를 한 곳에서 편집, 추가, 삭제하세요 ({bulkData.length}명, ⭐ {bulkData.filter(c => c.is_favorite).length}명)
                </p>
              </div>
              <button onClick={closeBulkEdit} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <X size={20} style={{ color: 'var(--text-muted)' }} />
              </button>
            </div>

            {/* Spreadsheet Area */}
            <div className="flex-1 overflow-auto mx-4 mb-4 border rounded-lg relative" style={{ borderColor: 'var(--border)' }}>
              {/* onPaste 이벤트는 상위 div 또는 table에 바인딩 */}
              <table className="w-full text-sm" onPaste={handleBulkPaste}>
                <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-elevated)' }}>
                  <tr>
                    <th className="px-2 py-2 text-center text-xs w-10" style={{ color: 'var(--text-primary)' }}>#</th>
                    <th className="px-2 py-2 text-center text-xs w-10">⭐</th>
                    {activeTab === 'staff' ? (
                      <>
                        <th className="px-2 py-2 text-left text-xs font-semibold w-32" style={{ color: 'var(--text-primary)' }}>이름 *</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold w-32" style={{ color: 'var(--text-primary)' }}>부서</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold w-32" style={{ color: 'var(--text-primary)' }}>내선번호</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold w-36" style={{ color: 'var(--text-primary)' }}>휴대폰</th>
                      </>
                    ) : (
                      <>
                        <th className="px-2 py-2 text-left text-xs font-semibold w-32" style={{ color: 'var(--text-primary)' }}>업체명 *</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold w-24" style={{ color: 'var(--text-primary)' }}>대표명</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold w-32" style={{ color: 'var(--text-primary)' }}>사무실번호</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold w-32" style={{ color: 'var(--text-primary)' }}>휴대폰</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold w-40" style={{ color: 'var(--text-primary)' }}>이메일</th>
                      </>
                    )}
                    <th className="px-2 py-2 text-left text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>비고</th>
                    <th className="px-2 py-2 text-center text-xs w-12" style={{ color: 'var(--text-primary)' }}>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkData.map((row, idx) => (
                    <tr key={row.id} style={{ borderTop: '1px solid var(--border)' }} className="hover:bg-white/[0.02]">
                      <td className="px-2 py-1 text-center text-[10px]" style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                      <td className="px-2 py-1 text-center">
                        <button onClick={() => updateBulkRow(idx, 'is_favorite', row.is_favorite ? 0 : 1)}>
                          <Star size={14} className={row.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'} />
                        </button>
                      </td>
                      
                      {activeTab === 'staff' ? (
                        <>
                          <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.name} onChange={e => updateBulkRow(idx, 'name', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.department} onChange={e => updateBulkRow(idx, 'department', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.phone} onChange={e => updateBulkRow(idx, 'phone', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.mobile} onChange={e => updateBulkRow(idx, 'mobile', e.target.value)} /></td>
                        </>
                      ) : (
                        <>
                          <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.name} onChange={e => updateBulkRow(idx, 'name', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.ceo_name} onChange={e => updateBulkRow(idx, 'ceo_name', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.phone} onChange={e => updateBulkRow(idx, 'phone', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.mobile} onChange={e => updateBulkRow(idx, 'mobile', e.target.value)} /></td>
                          <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.email} onChange={e => updateBulkRow(idx, 'email', e.target.value)} /></td>
                        </>
                      )}
                      
                      <td className="px-1 py-1"><input className="w-full border rounded px-2 py-1.5 text-xs focus:ring-2 outline-none transition-colors" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--text-primary)' }} value={row.note} onChange={e => updateBulkRow(idx, 'note', e.target.value)} /></td>
                      <td className="px-2 py-1 text-center">
                        <button onClick={() => removeBulkRow(idx)} className="p-1 rounded text-red-400 hover:bg-red-400/20"><Trash2 size={14}/></button>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={10} className="p-2">
                      <button onClick={addBulkRow} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        <Plus size={12} /> 행 추가
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t flex justify-end items-center gap-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
              <button onClick={closeBulkEdit} className="px-4 py-2 text-sm rounded-lg font-medium border hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                취소
              </button>
              <button onClick={handleBulkSave} disabled={saving} className="flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95" style={{ background: 'var(--accent-blue)' }}>
                <Check size={16} /> 모두 저장 ({bulkData.length}명)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
