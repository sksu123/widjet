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

// 2. Add state for memos
if (!content.includes('const [memos, setMemos]')) {
  content = content.replace(
    /const \[favoritesView, setFavoritesView\] = useState\('list'\)/,
    "const [favoritesView, setFavoritesView] = useState('list')\n  const [memos, setMemos] = useState<MemoData[]>([])"
  );
}

// 3. Add loadMemos function in loadData
if (!content.includes('loadMemos()')) {
  content = content.replace(
    /loadFavorites\(\)/,
    "loadFavorites()\n      loadMemos()"
  );
}

// 4. Implement loadMemos and other memo functions
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
    
    // 로컬 상태 즉시 업데이트 (디바운스 문제 해결 위함)
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
    /\/\/ 즐겨찾기 다시 로드/,
    memoFunctions + '\n  // 즐겨찾기 다시 로드'
  );
}

// 5. Add Memo Board widget in the 3rd layout (Right panel)
// Find the major contact search widget
const memoWidget = `
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
`;

if (!content.includes('메모 보드 위젯')) {
  content = content.replace(
    /\{\/\* 연락처 검색 위젯 \*\/\}/,
    memoWidget + '\n        {/* 연락처 검색 위젯 */}'
  );
}

// 6. Render memos absolutely in the Dashboard wrapper
if (!content.includes('<StickyNote')) {
  content = content.replace(
    /\{\/\* 날씨 상세 모달 \*\/\}/,
    `{/* 메모 (포스트잇) 렌더링 */}
    {memos.map(memo => (
      <StickyNote
        key={memo.id}
        memo={memo}
        onUpdate={handleUpdateMemo}
        onDelete={handleDeleteMemo}
        onFocus={handleFocusMemo}
      />
    ))}

    {/* 날씨 상세 모달 */}`
  );
}

// Also need to add lucide-react icons if missed, maybe Pin, Edit2, etc. (They are usually imported or we don't need new ones in Dashboard)

fs.writeFileSync(path, content, 'utf8');
