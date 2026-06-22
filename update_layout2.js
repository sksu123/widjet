const fs = require('fs');

const path = 'd:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add favoritesView state
content = content.replace(
  "const [isFavoritesEdit, setIsFavoritesEdit] = useState(false)",
  "const [isFavoritesEdit, setIsFavoritesEdit] = useState(false)\n  const [favoritesView, setFavoritesView] = useState<'grid' | 'list'>('grid')"
);

// 2. Modify container flex gap (optional, keeping gap-6 is fine, just changing widths)
// Left column
content = content.replace(
  'className="flex-1 flex flex-col min-w-[500px]"',
  'className="flex-1 flex flex-col min-w-[350px]"'
);

// Middle column
content = content.replace(
  'className="w-[380px] xl:w-[420px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1"',
  'className="w-[300px] xl:w-[350px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1"'
);

// 3. Update Favorites Header
const favHeaderTarget = `<h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <FolderHeart size={14} className="text-emerald-500" /> 즐겨찾기
            </h3>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setIsFavoritesEdit(!isFavoritesEdit)}`;

const favHeaderReplacement = `<h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <FolderHeart size={14} className="text-emerald-500" /> 즐겨찾기
            </h3>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setFavoritesView(v => v === 'grid' ? 'list' : 'grid')}
                className="p-1.5 rounded-lg border transition-colors border-transparent text-muted"
                style={{ color: 'var(--text-muted)' }}>
                {favoritesView === 'grid' ? <LayoutList size={12} /> : <LayoutGrid size={12} />}
              </button>
              <button onClick={() => setIsFavoritesEdit(!isFavoritesEdit)}`;

content = content.replace(favHeaderTarget, favHeaderReplacement);

// 4. Update Favorites Content (List/Grid switch)
const gridContentTarget = `) : (
              <div className="grid grid-cols-4 gap-2">
                {favorites.map((fav) => (
                  <div key={fav.id} onClick={() => handleOpenFavorite(fav.path)}
                    className="relative group cursor-pointer flex flex-col items-center text-center p-2 rounded-xl transition-colors border"
                    style={{ borderColor: 'rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.05)' }} title={fav.path}>
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg mb-1" 
                      style={{ background: fav.type === 'folder' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)' }}>
                      {fav.type === 'folder' 
                        ? <Folder size={20} style={{ color: '#f59e0b' }} />
                        : <File size={20} style={{ color: '#3b82f6' }} />
                      }
                    </div>
                    <p className="text-[10px] font-medium truncate w-full" style={{ color: 'var(--text-primary)' }}>{fav.name}</p>
                    
                    {isFavoritesEdit && (
                      <button onClick={(e) => handleDeleteFavorite(fav.id, e)}
                        className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors z-10">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}`;

const gridContentReplacement = `) : favoritesView === 'grid' ? (
              <div className="grid grid-cols-4 gap-2">
                {favorites.map((fav) => (
                  <div key={fav.id} onClick={() => handleOpenFavorite(fav.path)}
                    className="relative group cursor-pointer flex flex-col items-center text-center p-2 rounded-xl transition-colors border"
                    style={{ borderColor: 'rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.05)' }} title={fav.path}>
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg mb-1" 
                      style={{ background: fav.type === 'folder' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)' }}>
                      {fav.type === 'folder' 
                        ? <Folder size={20} style={{ color: '#f59e0b' }} />
                        : <File size={20} style={{ color: '#3b82f6' }} />
                      }
                    </div>
                    <p className="text-[10px] font-medium truncate w-full" style={{ color: 'var(--text-primary)' }}>{fav.name}</p>
                    
                    {isFavoritesEdit && (
                      <button onClick={(e) => handleDeleteFavorite(fav.id, e)}
                        className="absolute -top-1 -right-1 p-1 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600 transition-colors z-10">
                        <Trash2 size={10} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {favorites.map((fav) => (
                  <div key={fav.id} onClick={() => handleOpenFavorite(fav.path)}
                    className="relative group cursor-pointer flex items-center gap-2 text-left p-2 rounded-xl transition-colors border"
                    style={{ borderColor: 'rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.05)' }} title={fav.path}>
                    <div className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0" 
                      style={{ background: fav.type === 'folder' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)' }}>
                      {fav.type === 'folder' 
                        ? <Folder size={14} style={{ color: '#f59e0b' }} />
                        : <File size={14} style={{ color: '#3b82f6' }} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate w-full" style={{ color: 'var(--text-primary)' }}>{fav.name}</p>
                    </div>
                    {isFavoritesEdit && (
                      <button onClick={(e) => handleDeleteFavorite(fav.id, e)}
                        className="p-1.5 rounded-full text-red-500 hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}`;

content = content.replace(gridContentTarget, gridContentReplacement);

// 5. Insert 3rd column right before the weather modal
const thirdColumn = `
      {/* ==================================================== */}
      {/* 우측 패널 2: 빠른 실행 (화면의 맨 우측) */}
      {/* ==================================================== */}
      <div className="w-[180px] xl:w-[220px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
        <div className="card flex flex-col p-4 h-full">
          <h3 className="font-bold text-sm flex items-center gap-1.5 mb-4" style={{ color: 'var(--text-primary)' }}>
            <Zap size={14} className="text-yellow-500" /> 빠른 실행
          </h3>
          
          <div className="flex flex-col gap-2">
            {[
              { id: 'payment', title: '품의/지출 결재', icon: <CreditCard size={16} />, color: 'var(--accent-blue)', bg: 'rgba(59,130,246,0.1)' },
              { id: 'document', title: '공문 접수', icon: <File size={16} />, color: 'var(--accent-purple)', bg: 'rgba(168,85,247,0.1)' },
              { id: 'inventory', title: '물품 대장', icon: <Package size={16} />, color: 'var(--accent-orange)', bg: 'rgba(249,115,22,0.1)' },
              { id: 'contact', title: '교직원 비상연락망', icon: <Folder size={16} />, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
              { id: 'calendar', title: '학사일정 관리', icon: <CalendarIcon size={16} />, color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
              { id: 'settings', title: '환경 설정', icon: <LayoutGrid size={16} />, color: '#64748b', bg: 'rgba(100,116,139,0.1)' }
            ].map(item => (
              <button key={item.id} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] border"
                style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: item.bg, color: item.color }}>
                  {item.icon}
                </div>
                <span className="text-xs font-semibold text-left flex-1" style={{ color: 'var(--text-primary)' }}>{item.title}</span>
                <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
              </button>
            ))}
          </div>
        </div>
      </div>
`;

// Insert the thirdColumn before the final closing </div> of the layout
// Find the precise location using a regex or precise index
const targetBlock = `        </div>

      </div>

            {/* 날씨 상세 모달 */}`;

const replaceBlock = `        </div>
${thirdColumn}
      </div>

            {/* 날씨 상세 모달 */}`;

if (content.includes(targetBlock)) {
  content = content.replace(targetBlock, replaceBlock);
  fs.writeFileSync(path, content);
  console.log("update success");
} else {
  console.log("Could not find the target block to insert the third column.");
  // Let's print out what is actually around there
  const idx = content.indexOf('{/* 날씨 상세 모달 */}');
  console.log(content.substring(idx - 100, idx + 50));
}
