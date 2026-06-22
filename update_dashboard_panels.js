const fs = require('fs');

const path = 'd:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Change Left panel to flex-[4]
content = content.replace(
  /<div className="flex-1 flex flex-col min-w-0 rounded-2xl border p-5 shadow-sm"/,
  '<div className="flex-[4] flex flex-col min-w-0 rounded-2xl border p-5 shadow-sm"'
);

// 2. Change Right panel from fixed width to flex-[3]
content = content.replace(
  /<div className="w-\[180px\] xl:w-\[220px\] flex-shrink-0 flex flex-col gap-3 overflow-y-auto pr-1"/,
  '<div className="flex-[3] min-w-0 flex flex-col gap-4 overflow-y-auto pr-1"'
);

// 3. Extract Favorites block
const favStartMarker = '{/* 4. 즐겨찾기 */}';
const favEndIdx = content.indexOf('{/* ==================================================== */}\n      {/* 우측 패널 2: 빠른 실행 (화면의 맨 우측) */}');
let favBlock = '';
if (content.includes(favStartMarker) && favEndIdx !== -1) {
  const startIdx = content.indexOf(favStartMarker);
  favBlock = content.slice(startIdx, favEndIdx).trim();
  // Remove favBlock from its original position
  content = content.slice(0, startIdx) + content.slice(favEndIdx);
}

// 4. Extract Quick Actions block to remove it
const qaStartMarker = '{/* 빠른 실행 */}';
const qaEndMarker = '</div>\n\n      </div>\n\n            {/* 메모 (포스트잇) 렌더링 */}';
if (content.includes('<h3 className="font-bold text-sm flex items-center gap-1.5 mb-4" style={{ color: \'var(--text-primary)\' }}>\n            <Zap size={14} className="text-yellow-500" /> 빠른 실행\n          </h3>')) {
  // Quick Actions starts at: <div className="card flex flex-col p-4 h-full"> ... Zap size={14} ... </div>
  const qaRegex = /<div className="card flex flex-col p-4 h-full">[\s\S]*?<Zap size=\{14\} className="text-yellow-500" \/> 빠른 실행[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
  content = content.replace(qaRegex, '</div>\n\n      </div>');
}

// 5. Insert Favorites block into the new Right panel
// Right panel has: Memo Board, Contacts
const contactsEndRegex = /(<h3 className="font-bold text-sm flex items-center gap-1.5 mb-3" style=\{\{ color: 'var\(--text-primary\)' \}\}>\n\s*<Phone size=\{14\} style=\{\{ color: 'var\(--text-primary\)' \}\} \/> 주요 연락처\n\s*<\/h3>[\s\S]*?<\/div>\n\s*<\/div>)/;

if (favBlock) {
  content = content.replace(contactsEndRegex, `$1\n\n        ${favBlock}`);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
