const fs = require('fs');

const path = 'd:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add StickyNote import
if (!content.includes('StickyNote')) {
  content = content.replace(
    /import \{ RegionSelector \} from '\.\.\/\.\.\/components\/RegionSelector'/,
    "import { RegionSelector } from '../../components/RegionSelector'\nimport { StickyNote, MemoData } from '../../components/StickyNote'"
  );
}

// 2. Add memos state
if (!content.includes('const [memos, setMemos]')) {
  content = content.replace(
    /const \[isFavoritesEdit, setIsFavoritesEdit\] = useState\(false\)/,
    "const [isFavoritesEdit, setIsFavoritesEdit] = useState(false)\n  const [favoritesView, setFavoritesView] = useState<'grid' | 'list'>('grid')\n  const [memos, setMemos] = useState<MemoData[]>([])"
  );
}

// 3. Add loadMemos function in loadData
if (!content.includes('loadMemos()')) {
  content = content.replace(
    /if \(favRes && favRes.success\) {\n\s*setFavorites\(favRes.data as any\[\]\)\n\s*}/,
    "if (favRes && favRes.success) {\n        setFavorites(favRes.data as any[])\n      }\n\n      loadMemos()"
  );
}

// 4. Memo functions
const memoFunctions = `
  async function loadMemos() {
    if (!window.api.db.getMemos) return
    const res = await window.api.db.getMemos()
    if (res.success) setMemos(res.data as MemoData[])
  }

  async function handleAddMemo() {
    if (!window.api.db.addMemo) return
    const newZIndex = memos.length > 0 ? Math.max(...memos.map(m => m.z_index)) + 1 : 10
    const res = await window.api.db.addMemo({
      title: '', content: '', color: '#fef08a',
      x: 150, y: 150, width: 250, height: 250, z_index: newZIndex, is_pinned: 0
    })
    if (res.success) loadMemos()
  }

  async function handleUpdateMemo(id: number, data: Partial<MemoData>) {
    if (!window.api.db.updateMemo) return
    setMemos(prev => prev.map(m => m.id === id ? { ...m, ...data } : m))
    await window.api.db.updateMemo(id, data)
  }

  async function handleDeleteMemo(id: number) {
    if (!window.api.db.deleteMemo) return
    if (confirm('메모를 삭제하시겠습니까?')) {
      await window.api.db.deleteMemo(id)
      loadMemos()
    }
  }

  async function handleFocusMemo(id: number) {
    const target = memos.find(m => m.id === id)
    if (!target) return
    const maxZ = Math.max(...memos.map(m => m.z_index), 10)
    if (target.z_index < maxZ) {
      handleUpdateMemo(id, { z_index: maxZ + 1 })
    }
  }
`;

if (!content.includes('function handleAddMemo')) {
  content = content.replace(
    /  \/\/ 즐겨찾기 다시 로드/,
    memoFunctions + '\n  // 즐겨찾기 다시 로드'
  );
}

// 5. Replace layout wrappers
// Original Dashboard_backup.tsx has:
// <div className="flex-1 flex flex-col min-w-0 rounded-2xl border p-5 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
content = content.replace(
  /<div className="flex-1 flex flex-col min-w-0 rounded-2xl border p-5 shadow-sm"/,
  '<div className="flex-[4] flex flex-col min-w-0 rounded-2xl border p-5 shadow-sm"'
);

// Middle panel wrapper
// <div className="w-[300px] xl:w-[350px] flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
content = content.replace(
  /<div className="w-\[300px\] xl:w-\[350px\] flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1"/,
  '<div className="flex-[3] min-w-0 flex flex-col gap-4 overflow-y-auto pr-1"'
);

// Right panel wrapper
// <div className="w-[180px] xl:w-[220px] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
content = content.replace(
  /<div className="w-\[180px\] xl:w-\[220px\] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1"/,
  '<div className="flex-[3] min-w-0 flex flex-col gap-4 overflow-y-auto pr-1"'
);

// 6. Move Favorites to 3rd panel, add Memo Board, remove Quick Actions.
// Favorites block:
const favRegex = /\{\/\* 4\. 파일\/폴더 즐겨찾기 \*\/\}.*?(?=\{\/\* ====================================================\s*\*\}\s*\{\/\* 우측 패널 2)/s;
const favMatch = content.match(favRegex);
if (favMatch) {
  content = content.replace(favRegex, '');
}

// 3rd panel contents replacement:
const rightPanelRegex = /\{\/\* ====================================================\s*\*\}\s*\{\/\* 우측 패널 2: 빠른 실행 \(화면의 맨 우측\) \*\/\}\s*\{\/\* ====================================================\s*\*\}\s*<div className="flex-\[3\] min-w-0 flex flex-col gap-4 overflow-y-auto pr-1" style=\{\{ scrollbarWidth: 'none' \}\}>.*?<\/div>\s*<\/div>\s*\{\/\* 날씨 상세 모달 \*\/\}/s;

const newRightPanel = `
      {/* ==================================================== */}
      {/* 우측 패널 (3단): 즐겨찾기, 메모 보드, 연락처 검색 */}
      {/* ==================================================== */}
      <div className="flex-[3] min-w-0 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
        
        {/* 파일/폴더 즐겨찾기 */}
        ${favMatch ? favMatch[0].trim() : ''}

        {/* 메모 보드 위젯 */}
        <div className="card flex flex-col p-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <span className="text-yellow-500">📝</span> 메모 보드
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(234,179,8,0.1)', color: '#ca8a04' }}>
              {memos.length}개의 메모
            </span>
          </div>
          <button onClick={handleAddMemo} className="w-full py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all hover:-translate-y-0.5"
            style={{ background: '#fef08a', color: '#854d0e', border: '1px solid #fde047' }}>
            + 새 메모 추가
          </button>
        </div>

        {/* 연락처 검색 위젯 */}
        <div className="card flex flex-col p-4 flex-shrink-0">
          <h3 className="font-bold text-sm flex items-center gap-1.5 mb-3" style={{ color: 'var(--text-primary)' }}>
            <Phone size={14} style={{ color: 'var(--text-primary)' }} /> 주요 연락처
          </h3>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search size={12} style={{ color: 'var(--text-muted)' }} />
            </div>
            <input 
              type="text"
              placeholder="검색 후 Enter"
              className="w-full pl-7 pr-3 py-1.5 rounded-lg text-xs border focus:outline-none transition-colors"
              style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  navigate(\`/contacts?search=\${encodeURIComponent(e.currentTarget.value.trim())}\`)
                }
              }}
            />
          </div>
        </div>

      </div>
    </div>

    {/* 메모 (포스트잇) 렌더링 */}
    {memos.map(memo => (
      <StickyNote
        key={memo.id}
        memo={memo}
        onUpdate={handleUpdateMemo}
        onDelete={handleDeleteMemo}
        onFocus={handleFocusMemo}
      />
    ))}

    {/* 날씨 상세 모달 */}
`;

content = content.replace(rightPanelRegex, newRightPanel);

// 7. Add AI weather summary in main weather widget
const weatherMainRegex = /(<div className="text-right space-y-1">\s*<p.*?미세 \{weather.pm10 \|\| '-'\}\s*<\/p>\s*<p.*?초미세 \{weather.pm25 \|\| '-'\}\s*<\/p>\s*<\/div>\s*<\/div>)/;

if (!content.includes('✨ AI')) {
  content = content.replace(weatherMainRegex, `$1
            
            {/* AI 날씨 요약 배너 (메인 화면용 소형) */}
            <div className="mt-2 rounded-lg p-2.5 flex items-start gap-2" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex-shrink-0 mt-0.5">
                <span className="text-blue-500 text-[10px]">✨ AI</span>
              </div>
              <p className="text-[10px] leading-tight flex-1" style={{ color: 'var(--text-secondary)' }}>
                {weatherSummaryLoading ? '날씨 정보를 기반으로 행정 업무 요약을 생성 중입니다...' : (weatherSummary || '날씨 정보가 업데이트되었습니다.')}
              </p>
            </div>`);
}

// Ensure the weather wrapper is a fragment because we added a sibling div inside {widgetsConfig.weather && weather && ( ... )}
const weatherConditionRegex = /\{widgetsConfig\.weather && weather && \(\s*(<div className="mt-2 flex items-center justify-between rounded-xl p-3)/;
content = content.replace(weatherConditionRegex, '{widgetsConfig.weather && weather && (\n            <>\n            $1');

const weatherEndRegex = /(<\/div>\s*)\)\}/;
content = content.replace(weatherEndRegex, '$1            </>\n          )}');

fs.writeFileSync(path, content, 'utf8');
console.log('Update Complete');
