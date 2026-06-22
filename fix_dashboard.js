const fs = require('fs');
const file = 'd:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Strip out the old Favorites block from Col 2.
const favStart = content.indexOf('{/* 4. 파일/폴더 즐겨찾기 */}');
const favEnd = content.indexOf('{/* 날씨 상세 모달 */}');
if (favStart !== -1 && favEnd !== -1) {
  const endCol2 = content.lastIndexOf('      </div>', favEnd);
  content = content.substring(0, favStart) + content.substring(endCol2);
}

// 2. Adjust root layout to 1:1:1
content = content.replace('className="flex gap-5 h-full fade-in pb-4"', 'className="flex gap-4 h-full fade-in pb-4"');
content = content.replace('className="flex-[1.5] flex flex-col min-w-0 rounded-2xl border p-5 shadow-sm"', 'className="flex-1 flex flex-col min-w-0 rounded-2xl border p-5 shadow-sm"');
content = content.replace("style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}", "style={{ height: '70vh', background: 'var(--bg-card)', borderColor: 'var(--border)' }}");

// 3. Add Col 3 right before `{/* 날씨 상세 모달 */}`
const col3Html = `
      {/* ============================================================ */}
      {/* [3단] 우측 패널: 즐겨찾기, 메모 보드, 연락처 검색 (30%) */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

        {/* 파일/폴더 즐겨찾기 */}
        {widgetsConfig.favorites && (
          <div className="card flex flex-col flex-1 min-h-0" style={{ padding: 0, overflow: 'hidden' }}>
            <FavoritesWidget isWidget={true} />
          </div>
        )}

        {/* 메모 보드 */}
        {widgetsConfig.memo && (
          <div className="flex-1 relative min-h-[300px]">
            <StickyNote />
          </div>
        )}

        {/* 주요 연락처 검색 */}
        {widgetsConfig.contacts && (
          <div className="card flex flex-col p-4 h-full max-h-[35vh]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <span style={{ fontSize: '1.2em' }}>📞</span> 주요 연락처 검색
              </h3>
            </div>
            
            <div className="relative mb-3">
              <input type="text" placeholder="이름, 부서, 직급 검색..." 
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none transition-colors"
                style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-2" style={{ scrollbarWidth: 'none' }}>
              {contacts.filter(c => contactSearch && (c.name.includes(contactSearch) || c.department.includes(contactSearch) || c.position.includes(contactSearch))).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-60">
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{contactSearch ? '검색 결과가 없습니다.' : '검색어를 입력하세요.'}</p>
                </div>
              ) : (
                contacts.filter(c => contactSearch && (c.name.includes(contactSearch) || c.department.includes(contactSearch) || c.position.includes(contactSearch))).map(c => (
                  <div key={c.id} className="p-2 rounded-lg border" style={{ borderColor: 'var(--border)', background: 'var(--bg-elevated)' }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{c.name} <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>{c.department}</span></span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>{c.phone}</span>
                    </div>
                    <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{c.position}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
`;

content = content.replace('{/* 날씨 상세 모달 */}', col3Html + '\n\n      {/* 날씨 상세 모달 */}');

fs.writeFileSync(file, content);
console.log('Fixed Dashboard.tsx!');
