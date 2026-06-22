const fs = require('fs');
const file = 'd:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx';
const lines = fs.readFileSync(file, 'utf8').split('\n');

const startIdx = lines.findIndex(l => l.includes('// 즐겨찾기 다시 로드'));
const endIdx = lines.findIndex(l => l.includes('const toggleSchedule = async (id: number, currentCompleted: number) => {'));

if (startIdx !== -1 && endIdx !== -1) {
  lines.splice(startIdx, endIdx - startIdx);
}

const widgetStart = lines.findIndex(l => l.includes('        {/* 파일/폴더 즐겨찾기 */}'));
const widgetEnd = lines.findIndex(l => l.includes('        {/* 메모 보드 (포스트잇) */}'));

if (widgetStart !== -1 && widgetEnd !== -1) {
  const replacement = [
    '        {/* 파일/폴더 즐겨찾기 */}',
    '        <div className="card flex flex-col flex-1 min-h-0" style={{ padding: 0, overflow: \'hidden\' }}>',
    '          <FavoritesWidget isWidget={true} />',
    '        </div>',
    ''
  ];
  lines.splice(widgetStart, widgetEnd - widgetStart, ...replacement);
}

fs.writeFileSync(file, lines.join('\n'));