const fs = require('fs');
let code = fs.readFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

// 1. Remove Marquee
const marqueeRegex = /\{\/\* D-Day 전광판 마키.*?\*\/\}\s*\{ddays\.length > 0 && \([\s\S]*?<\/marquee>\s*<\/div>\s*<\/div>\s*\)\}/;
code = code.replace(marqueeRegex, '');

// 2. Wrap left panel
const startLeftPanel = '<div className="flex-1 flex flex-col min-w-0 rounded-2xl border p-5 shadow-sm" style={{ height: \'70vh\', background: \'var(--bg-card)\', borderColor: \'var(--border)\' }}>';
const replacedStart = '<div className="flex-1 flex flex-col gap-4 min-w-0 h-[70vh]">\n        <div className="flex-1 flex flex-col rounded-2xl border p-5 shadow-sm min-h-0" style={{ background: \'var(--bg-card)\', borderColor: \'var(--border)\' }}>';
code = code.replace(startLeftPanel, replacedStart);

// 3. Find end of left panel and insert D-day panel
const endHoverRegex = /\{\/\* 캘린더 날짜 hover 팝업.*?\*\/\}[\s\S]*?<\/div>\s*\)\s*\}\)\(\)\}\s*<\/div>/;
const match = code.match(endHoverRegex);
if(match) {
  const replacement = match[0].replace(/<\/div>$/, '') + `</div>
        {/* 행정실 허브 왼쪽 하단 D-Day 패널 (7일 이내) */}
        {ddays.filter(d => d.days_left >= 0 && d.days_left <= 7).length > 0 && (
          <div className="rounded-2xl border p-4 shadow-sm flex flex-col gap-2 shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', maxHeight: '180px' }}>
            <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Bell size={16} className="text-red-500" /> 다가오는 D-Day 일정 (7일 이내)
            </h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2" style={{ scrollbarWidth: 'thin' }}>
              {ddays.filter(d => d.days_left >= 0 && d.days_left <= 7).map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }}></span>
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.title}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-full shrink-0" style={{ background: d.days_left === 0 ? '#ef4444' : 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                    {d.days_left === 0 ? 'D-Day' : \`D-\${d.days_left}\`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>`;
  code = code.replace(match[0], replacement);
  fs.writeFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
  console.log('Successfully applied modifications to Dashboard.tsx');
} else {
  console.log('Failed to match end of left panel');
}
