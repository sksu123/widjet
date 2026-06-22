const fs = require('fs');
const path = require('path');
const file = 'd:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove memos.map from the end
const endMemosIdx = content.indexOf('{/* 자유 배치 포스트잇 메모 */}');
if (endMemosIdx !== -1) {
  const endMemosEnd = content.indexOf('</div>', endMemosIdx);
  // delete from endMemosIdx to endMemosEnd
  const strToRemove = content.substring(endMemosIdx, endMemosEnd);
  // Find the exact memos.map block to remove it cleanly, let's just do a string replace
  content = content.replace(
    `      {/* 자유 배치 포스트잇 메모 */}
      {memos.map(memo => (
        <StickyNote
          key={memo.id}
          memo={memo}
          onUpdate={handleUpdateMemo}
          onDelete={handleDeleteMemo}
          onFocus={handleFocusMemo}
        />
      ))}
`, '');
}

// 2. Replace Memo Board
const memoBoardStart = `        {/* 메모 보드 (포스트잇) */}
        <div className="card flex flex-col p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <LayoutGrid size={14} className="text-yellow-500" /> 메모 보드
            </h3>
            <button
              onClick={handleAddMemo}
              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
              style={{ background: 'rgba(234,179,8,0.1)', color: '#ca8a04' }}
            >
              <Plus size={10} /> 메모 추가
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {memos.length === 0 ? '메모가 없습니다. 메모 추가 버튼을 눌러 포스트잇을 만들어보세요!' : \`포스트잇 \${memos.length}개가 활성 상태입니다. 메모를 자유롭게 이동할 수 있습니다.\`}
          </p>
        </div>`;

const memoBoardReplacement = `        {/* 메모 보드 (포스트잇) */}
        <div className="card flex flex-col p-4 flex-1 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
              <LayoutGrid size={14} className="text-yellow-500" /> 메모 보드
            </h3>
            <button
              onClick={handleAddMemo}
              className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-colors"
              style={{ background: 'rgba(234,179,8,0.1)', color: '#ca8a04' }}
            >
              <Plus size={10} /> 메모 추가
            </button>
          </div>
          <p className="text-[11px] shrink-0" style={{ color: 'var(--text-muted)' }}>
            {memos.length === 0 ? '메모가 없습니다. 메모 추가 버튼을 눌러 포스트잇을 만들어보세요!' : \`포스트잇 \${memos.length}개가 활성 상태입니다. 메모를 자유롭게 이동할 수 있습니다.\`}
          </p>
          {memos.map(memo => (
            <StickyNote
              key={memo.id}
              memo={memo}
              onUpdate={handleUpdateMemo}
              onDelete={handleDeleteMemo}
              onFocus={handleFocusMemo}
            />
          ))}
        </div>`;

content = content.replace(memoBoardStart, memoBoardReplacement);

// 3. Replace Contacts Search
const contactsStart = `        {/* 주요 연락처 검색 */}
        <div className="card flex flex-col p-4 flex-1">
          <h3 className="font-bold text-sm flex items-center gap-1.5 mb-3" style={{ color: 'var(--text-primary)' }}>
            <Bot size={14} className="text-purple-500" /> 주요 연락처 검색
          </h3>
          <div className="relative mb-3">
            <input
              type="text"
              placeholder="이름, 직위, 부서 검색..."
              className="w-full rounded-lg px-3 py-2 text-xs border"
              style={{ background: 'var(--bg-background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ scrollbarWidth: 'none' }}>
            {contacts
              .filter(c => !contactSearch.trim() || c.name?.includes(contactSearch) || c.position?.includes(contactSearch) || c.department?.includes(contactSearch))
              .slice(0, 10)
              .map(c => (
                <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.03)' }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.15)', color: '#7c3aed' }}>
                    {c.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{c.position} {c.department ? \`· \${c.department}\` : ''}</p>
                  </div>
                  {c.phone && (
                    <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{c.phone}</span>
                  )}
                </div>
              ))}
            {contacts.filter(c => !contactSearch.trim() || c.name?.includes(contactSearch) || c.position?.includes(contactSearch) || c.department?.includes(contactSearch)).length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 opacity-50">
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>검색 결과가 없습니다.</p>
              </div>
            )}
          </div>
        </div>`;

const contactsReplacement = `        {/* 주요 연락처 검색 */}
        <div className="card flex flex-col p-4 shrink-0">
          <h3 className="font-bold text-sm flex items-center gap-1.5 mb-3" style={{ color: 'var(--text-primary)' }}>
            <Bot size={14} className="text-purple-500" /> 주요 연락처 검색
          </h3>
          <div className={contactSearch.trim() ? "relative mb-3" : "relative"}>
            <input
              type="text"
              placeholder="이름, 직위, 부서 검색..."
              className="w-full rounded-lg px-3 py-2 text-xs border"
              style={{ background: 'var(--bg-background)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              value={contactSearch}
              onChange={e => setContactSearch(e.target.value)}
            />
          </div>
          {!!contactSearch.trim() && (
            <div className="overflow-y-auto space-y-2 pr-1 max-h-48" style={{ scrollbarWidth: 'none' }}>
              {contacts
                .filter(c => c.name?.includes(contactSearch) || c.position?.includes(contactSearch) || c.department?.includes(contactSearch))
                .slice(0, 10)
                .map(c => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'rgba(0,0,0,0.03)' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: 'rgba(139,92,246,0.15)', color: '#7c3aed' }}>
                      {c.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{c.position} {c.department ? \`· \${c.department}\` : ''}</p>
                    </div>
                    {c.phone && (
                      <span className="text-[10px] font-mono flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{c.phone}</span>
                    )}
                  </div>
                ))}
              {contacts.filter(c => c.name?.includes(contactSearch) || c.position?.includes(contactSearch) || c.department?.includes(contactSearch)).length === 0 && (
                <div className="flex flex-col items-center justify-center py-6 opacity-50">
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>검색 결과가 없습니다.</p>
                </div>
              )}
            </div>
          )}
        </div>`;

content = content.replace(contactsStart, contactsReplacement);

fs.writeFileSync(file, content, 'utf8');
