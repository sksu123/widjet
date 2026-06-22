const fs = require('fs');

const path = 'd:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// The layout consists of:
// 1. Calendar (Left panel)
// 2. Middle panel (w-[300px])
// 3. Right panel (w-[180px])

// Replace the container: `<div className="flex-1 overflow-hidden p-6 flex gap-6"` ...

// Let's rewrite the layout structure:
// <div className="flex-1 overflow-hidden p-6 flex gap-6" ...>
//   {/* 1단 (40%) 캘린더 */}
//   <div className="flex-[4] min-w-0 ..."> ... </div>
//   {/* 2단 (30%) 사용자/급식/일정 */}
//   <div className="flex-[3] min-w-0 ..."> ... </div>
//   {/* 3단 (30%) 즐겨찾기/연락처 */}
//   <div className="flex-[3] min-w-0 ..."> ... </div>
// </div>

// First, fix the panel wrappers.
content = content.replace(
  /<div className="w-\[300px\] xl:w-\[350px\] flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>/,
  '<div className="flex-[3] min-w-0 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: \'none\' }}>'
);

content = content.replace(
  /<div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border p-4 flex flex-col min-w-0"/,
  '<div className="flex-[4] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border p-4 flex flex-col min-w-0"'
);

// We need to move the "즐겨찾기" block from the 2nd panel to the 3rd panel.
// The "즐겨찾기" block starts at:
// {/* 4. 파일/폴더 즐겨찾기 */}
// <div className="card flex flex-col p-4 min-h-[160px]" ... > ... </div>
const favRegex = /\{\/\* 4\. 파일\/폴더 즐겨찾기 \*\/\}.*?(?=\{\/\* ====================================================\s*\*\}\s*\{\/\* 우측 패널 2)/s;
const favMatch = content.match(favRegex);
if (favMatch) {
  content = content.replace(favRegex, '');
}

// Now replace the 3rd panel.
const rightPanelRegex = /\{\/\* ====================================================\s*\*\}\s*\{\/\* 우측 패널 2: 빠른 실행 \(화면의 맨 우측\) \*\/\}\s*\{\/\* ====================================================\s*\*\}\s*<div className="w-\[180px\] xl:w-\[220px\] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1" style=\{\{ scrollbarWidth: 'none' \}\}>.*?<\/div>\s*<\/div>\s*\{\/\* 날씨 상세 모달 \*\/\}/s;

const newRightPanel = `
      {/* ==================================================== */}
      {/* 우측 패널 (3단): 즐겨찾기, 연락처 검색 */}
      {/* ==================================================== */}
      <div className="flex-[3] min-w-0 flex flex-col gap-4 overflow-y-auto pr-1" style={{ scrollbarWidth: 'none' }}>
        
        {/* 파일/폴더 즐겨찾기 */}
        ${favMatch ? favMatch[0].trim() : ''}

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
              placeholder="이름/직위 검색 후 Enter"
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

    {/* 날씨 상세 모달 */}
`;

content = content.replace(rightPanelRegex, newRightPanel);

fs.writeFileSync(path, content, 'utf8');
