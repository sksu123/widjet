const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

const targetLoc = "              </div>\\r\\n\\r\\n            \\r\\n      {/* ============================================================ */}";
const targetLocLinux = "              </div>\\n\\n            \\n      {/* ============================================================ */}";

const newWidget = \              </div>

        {/* 4. D-Day 위젯 */}
        {widgetsConfig.dday && (
          <div className="card flex flex-col p-4 shrink-0 mt-4 border-2" style={{ borderColor: 'rgba(239,68,68,0.4)', background: 'var(--bg-card)' }}>
            <h3 className="font-bold text-sm flex items-center gap-1.5 mb-2" style={{ color: 'var(--text-primary)' }}>
              <Bell size={14} className="text-red-500" /> 다가오는 D-Day
            </h3>
            <div className="bg-[#111111] rounded-lg overflow-hidden flex items-center h-10 px-2 mt-1 relative" style={{ boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }}>
              <style>
                {\\\
                  @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                  }
                  .marquee-content {
                    display: flex;
                    white-space: nowrap;
                    animation: marquee 15s linear infinite;
                    min-width: 100%;
                  }
                  .marquee-item {
                    display: flex;
                    align-items: center;
                  }
                \\\}
              </style>
              <div className="marquee-content text-sm font-bold">
                {(() => {
                  const validDdays = ddays.filter(d => typeof d.days_left === 'number' && d.days_left >= 0 && d.days_left <= 5);
                  if (validDdays.length === 0) {
                    return <span className="text-gray-500 text-xs w-full text-center block font-normal">다가오는 5일 이내의 D-Day가 없습니다.</span>
                  }
                  return validDdays.map((d, idx) => {
                    const daysLabel = d.days_left === 0 ? 'D-DAY' : \\\D-\\\\\\;
                    let timePart = '';
                    if (d.start_date && d.start_date.length > 10) {
                       const timeStr = d.start_date.substring(11, 16);
                       if (timeStr !== '00:00') timePart = timeStr;
                    }
                    const descPart = d.description ? \\\ \\\\\\ : '';
                    
                    return (
                      <div key={d.id} className="marquee-item tracking-wide text-white">
                        <span className="text-red-500 mr-2">{daysLabel}</span>
                        <span>{d.title}{timePart ? \\\ \\\\\\ : ''}{descPart}</span>
                        {idx < validDdays.length - 1 && <span className="text-emerald-500 mx-4 text-xs">▶</span>}
                      </div>
                    )
                  });
                })()}
              </div>
            </div>
          </div>
        )}
            
      {/* ============================================================ */}\;

code = code.replace(/              <\/div>\r?\n\r?\n\s+\r?\n\s+{\/\* ===+/g, newWidget.replace('      {/* ===', '      {/* ==='));

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Fixed D-Day injection');
