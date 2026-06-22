import { useState, useEffect } from 'react'
import { FolderHeart, Plus, Folder, File, Trash2, Edit2, Check, LayoutGrid, Menu, Globe, X } from 'lucide-react'

export default function FavoritesWidget({ isWidget = false }: { isWidget?: boolean }) {
  const [favorites, setFavorites] = useState<{id: number; name: string; path: string; type: string}[]>([])
  const [favoritesView, setFavoritesView] = useState<'grid' | 'list'>('grid')
  const [isFavoritesEdit, setIsFavoritesEdit] = useState(false)
  const [activeTab, setActiveTab] = useState<'website' | 'file'>(isWidget ? 'file' : 'website')
  const [columns, setColumns] = useState<2|3|4|5|6|8>(isWidget ? 4 : 8)
  
  const [showWebsiteDialog, setShowWebsiteDialog] = useState(false)
  const [webName, setWebName] = useState('')
  const [webUrl, setWebUrl] = useState('')

  useEffect(() => {
    loadFavorites()
  }, [])

  async function loadFavorites() {
    if (!window.api.file.getFavorites) return
    const res = await window.api.file.getFavorites()
    if (res.success) setFavorites(res.data as any[])
  }

  async function handleOpenFavorite(path: string, type: string) {
    if (isFavoritesEdit) return
    if (type === 'website') {
      window.open(path, '_blank')
    } else {
      if (!window.api.file.openPath) return
      await window.api.file.openPath(path)
    }
  }

  async function handleDeleteFavorite(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.api.file.removeFavorite) return
    if (confirm('이 항목을 즐겨찾기에서 제거하시겠습니까?')) {
      await window.api.file.removeFavorite(id)
      loadFavorites()
    }
  }

  async function handleAddFavoriteDialog(type: 'file' | 'folder') {
    if (!window.api.file.openDialog || !window.api.file.addFavorite) return
    const options: any = { properties: type === 'folder' ? ['openDirectory'] : ['openFile'] }
    const res = await window.api.file.openDialog(options)
    if (res.success && res.paths && res.paths.length > 0) {
      const path = res.paths[0]
      const name = path.split('\\').pop() || path.split('/').pop() || 'Unknown'
      await window.api.file.addFavorite(name, path, type)
      loadFavorites()
    }
  }

  async function handleAddWebsite() {
    if (!webName || !webUrl) return
    let finalUrl = webUrl
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl
    
    if (window.api.file.addFavorite) {
      await window.api.file.addFavorite(webName, finalUrl, 'website')
      loadFavorites()
    }
    setShowWebsiteDialog(false)
    setWebName('')
    setWebUrl('')
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (!window.api.file.addFavorite) return
    const files = Array.from(e.dataTransfer.files)
    for (const f of files) {
      const path = (f as any).path
      if (path) {
        const isFolder = !f.name.includes('.') && f.size % 4096 === 0
        await window.api.file.addFavorite(f.name, path, isFolder ? 'folder' : 'file')
      }
    }
    loadFavorites()
  }

  const filteredFavorites = favorites.filter(f => 
    activeTab === 'website' ? f.type === 'website' : (f.type === 'file' || f.type === 'folder')
  )

  const colClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    8: 'grid-cols-8'
  }

  return (
    <div 
      className={`flex flex-col h-full relative ${!isWidget ? 'fade-in pb-4' : 'flex-1 min-h-0'}`} 
      style={!isWidget ? { background: 'var(--bg-primary)' } : {}}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 타이틀 영역 */}
      {!isWidget && (
        <div className="px-6 pt-6 pb-2 shrink-0">
          <h1 className="text-xl font-bold flex items-center gap-2 mb-1" style={{ color: 'var(--text-primary)' }}>
            <FolderHeart size={20} className="text-pink-500" />
            즐겨찾기
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>자주 쓰는 사이트와 파일을 빠르게 열 수 있어요.</p>
        </div>
      )}
      {isWidget && (
        <div className="flex items-center justify-between mb-3 shrink-0 px-1 pt-1">
          <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <FolderHeart size={14} className="text-emerald-500" /> 즐겨찾기
          </h3>
        </div>
      )}

      {/* 탭 영역 */}
      <div className={`${isWidget ? 'mb-3' : 'px-6 mt-4'} shrink-0`}>
        <div className="flex rounded-xl p-1" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
          <button 
            onClick={() => setActiveTab('website')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-bold transition-all ${isWidget ? 'py-2 text-xs' : 'py-3 text-sm'}`}
            style={activeTab === 'website' ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' } : { color: 'var(--text-muted)' }}>
            <Globe size={14} className={activeTab === 'website' ? 'text-pink-500' : ''} /> 웹사이트 <span className="text-[9px] bg-white/10 px-1.5 rounded-full">{favorites.filter(f => f.type === 'website').length}</span>
          </button>
          <button 
            onClick={() => setActiveTab('file')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-bold transition-all ${isWidget ? 'py-2 text-xs' : 'py-3 text-sm'}`}
            style={activeTab === 'file' ? { background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' } : { color: 'var(--text-muted)' }}>
            <FolderHeart size={14} className={activeTab === 'file' ? 'text-pink-500' : ''} /> 파일/폴더 <span className="text-[9px] bg-white/10 px-1.5 rounded-full">{favorites.filter(f => f.type !== 'website').length}</span>
          </button>
        </div>
      </div>

      {/* 툴바 영역 */}
      <div className={`${isWidget ? 'mb-3' : 'px-6 mt-4 mb-4'} flex flex-wrap gap-2 items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          {/* 뷰 전환 */}
          <div className="flex items-center rounded-lg p-0.5 shrink-0" style={{ border: '1px solid var(--border)' }}>
            <button onClick={() => setFavoritesView('list')}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
              style={favoritesView === 'list' ? { color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' } : { color: 'var(--text-muted)' }}>
              <Menu size={12} /> {!isWidget && '리스트'}
            </button>
            <button onClick={() => setFavoritesView('grid')}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
              style={favoritesView === 'grid' ? { color: '#ec4899', background: 'rgba(236, 72, 153, 0.1)' } : { color: 'var(--text-muted)' }}>
              <LayoutGrid size={12} /> {!isWidget && '그리드'}
            </button>
          </div>

          {/* 열 개수 조절 */}
          {favoritesView === 'grid' && !isWidget && (
            <div className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium shrink-0" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
              <span className="mr-1">열</span>
              {[2,3,4,5,6,8].map(col => (
                <button key={col} onClick={() => setColumns(col as any)}
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${columns === col ? 'text-pink-500 font-bold bg-pink-500/10' : 'hover:bg-white/5'}`}>
                  {col}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 우측 도구 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{filteredFavorites.length}개</span>
          <button onClick={() => setIsFavoritesEdit(!isFavoritesEdit)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors"
            style={{ border: '1px solid var(--border)', color: isFavoritesEdit ? '#ec4899' : 'var(--text-primary)', background: isFavoritesEdit ? 'rgba(236, 72, 153, 0.1)' : 'transparent' }}>
            <Edit2 size={10} /> {isFavoritesEdit ? '완료' : '편집'}
          </button>
        </div>
      </div>

      {/* 추가 버튼 영역 */}
      {isFavoritesEdit && (
        <div className={`${isWidget ? 'mb-3' : 'px-6 mb-4'} flex gap-2 shrink-0`}>
          {activeTab === 'website' ? (
            <button onClick={() => setShowWebsiteDialog(true)} className={`flex-1 ${isWidget ? 'py-2' : 'py-3'} rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-white/5`} style={{ color: 'var(--text-primary)', border: '1px dashed var(--border)' }}>
              <Plus size={14} /> 새 사이트
            </button>
          ) : (
            <>
              <button onClick={() => handleAddFavoriteDialog('file')} className={`flex-1 ${isWidget ? 'py-2' : 'py-3'} rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-white/5`} style={{ color: 'var(--text-primary)', border: '1px dashed var(--border)' }}>
                <Plus size={14} /> 파일
              </button>
              <button onClick={() => handleAddFavoriteDialog('folder')} className={`flex-1 ${isWidget ? 'py-2' : 'py-3'} rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors hover:bg-white/5`} style={{ color: 'var(--text-primary)', border: '1px dashed var(--border)' }}>
                <Plus size={14} /> 폴더
              </button>
            </>
          )}
        </div>
      )}

      {/* 컨텐츠 영역 */}
      <div className={`flex-1 min-h-0 overflow-y-auto ${!isWidget ? 'px-6 pb-6' : 'pr-1'}`} style={{ scrollbarWidth: 'thin' }}>
        {filteredFavorites.length === 0 && !isFavoritesEdit ? (
          <div className={`h-full ${isWidget ? 'min-h-[150px]' : 'min-h-[200px]'} flex flex-col items-center justify-center rounded-2xl opacity-60`} style={{ border: '1px dashed var(--border)', background: 'transparent' }}>
            {activeTab === 'website' ? <Globe size={isWidget ? 24 : 32} className="mb-2 text-pink-500 opacity-50" /> : <Folder size={isWidget ? 24 : 32} className="mb-2 text-pink-500 opacity-50" />}
            <p className="text-[11px] font-medium mb-1" style={{ color: 'var(--text-primary)' }}>없음</p>
          </div>
        ) : favoritesView === 'grid' ? (
          <div className={`grid ${isWidget ? 'grid-cols-5 sm:grid-cols-6 md:grid-cols-8' : colClasses[columns]} gap-2`}>
            {filteredFavorites.map((fav) => (
              <div key={fav.id} onClick={() => handleOpenFavorite(fav.path, fav.type)}
                className="relative group flex flex-col rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden cursor-pointer"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                
                <div className={`flex-1 flex flex-col items-center justify-center text-center ${isWidget ? 'p-2' : 'p-4'}`}>
                  <div className={isWidget ? 'mb-1.5' : 'mb-2'}>
                    {fav.type === 'website' ? <Globe size={isWidget ? 16 : 28} className="text-pink-500" /> :
                     fav.type === 'folder' ? <Folder size={isWidget ? 16 : 28} className="text-amber-500" /> : 
                     <File size={isWidget ? 16 : 28} className="text-blue-500" />}
                  </div>
                  <p className="text-[10px] font-bold truncate w-full mb-0.5" style={{ color: 'var(--text-primary)' }}>{fav.name}</p>
                  <p className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                    {fav.type === 'website' ? '웹사이트' : fav.type === 'folder' ? '폴더' : '파일'}
                  </p>
                </div>

                {isFavoritesEdit && (
                  <button onClick={(e) => handleDeleteFavorite(fav.id, e)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors z-10">
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredFavorites.map((fav) => (
              <div key={fav.id} onClick={() => handleOpenFavorite(fav.path, fav.type)}
                className="relative group cursor-pointer flex items-center justify-between p-2.5 rounded-xl transition-all border hover:shadow-sm"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg" 
                    style={{ background: fav.type === 'website' ? 'rgba(236,72,153,0.1)' : fav.type === 'folder' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)' }}>
                    {fav.type === 'website' ? <Globe size={16} className="text-pink-500" /> : 
                     fav.type === 'folder' ? <Folder size={16} className="text-amber-500" /> : 
                     <File size={16} className="text-blue-500" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>{fav.name}</p>
                    <p className="text-[10px] opacity-60 truncate" style={{ color: 'var(--text-muted)' }}>{fav.path}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <button className="px-3 py-1 rounded-md bg-pink-500 text-white text-[10px] font-bold hover:bg-pink-600 transition-colors">
                    열기
                  </button>
                  {isFavoritesEdit && (
                    <button onClick={(e) => handleDeleteFavorite(fav.id, e)}
                      className="p-1.5 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 웹사이트 추가 모달 */}
      {showWebsiteDialog && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl p-5 shadow-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Globe size={18} className="text-pink-500" />
                새 웹사이트
              </h3>
              <button onClick={() => setShowWebsiteDialog(false)} style={{ color: 'var(--text-muted)' }} className="hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>사이트 이름</label>
                <input type="text" value={webName} onChange={e => setWebName(e.target.value)} placeholder="예: 구글" 
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-1 focus:ring-pink-500"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              </div>
              <div>
                <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--text-muted)' }}>URL 주소</label>
                <input type="text" value={webUrl} onChange={e => setWebUrl(e.target.value)} placeholder="예: google.com" 
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-1 focus:ring-pink-500"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} />
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowWebsiteDialog(false)} className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>취소</button>
              <button onClick={handleAddWebsite} disabled={!webName || !webUrl} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-pink-500 text-white transition-colors disabled:opacity-50 hover:bg-pink-600">추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
