const fs = require('fs');
let code = fs.readFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

const target = `            {rightTab === 'todo' && (
              todaySchedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-50 py-6">
                  <CheckCircle2 size={24} className="mb-2" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>오늘 일정이 없습니다</p>
                </div>
              ) : todaySchedules.map((s) => (`;

const replacement = `            {rightTab === 'todo' && (
              (() => {
                const upcomingDdays = ddays.filter(d => d.days_left !== undefined && d.days_left >= 0 && d.days_left <= 3);
                const hasItems = todaySchedules.length > 0 || upcomingDdays.length > 0;
                
                if (!hasItems) {
                  return (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 py-6">
                      <CheckCircle2 size={24} className="mb-2" style={{ color: 'var(--text-muted)' }} />
                      <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>오늘 일정이 없습니다</p>
                    </div>
                  );
                }

                return (
                  <>
                    {upcomingDdays.map(s => (
                      <div key={'dday-'+s.id} className="flex items-center gap-3 p-2.5 rounded-lg border transition-all" style={{ borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
                        <div className="flex-shrink-0 flex items-center justify-center w-5 h-5">
                          <span className="text-[10px] font-bold text-red-500">{s.days_left === 0 ? 'D-Day' : \`D-\${s.days_left}\`}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-red-600">
                            <span className="font-bold mr-1 opacity-80" style={{ color: s.color }}>({getCategoryLabel(s.category)})</span>
                            {s.title}
                          </p>
                        </div>
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-red-500" />
                      </div>
                    ))}
                    {todaySchedules.map((s) => (`;

code = code.replace(target, replacement);

const target2 = `              ))
            )}`;

const replacement2 = `              ))}
                  </>
                );
              })()
            )}`;

code = code.replace(target2, replacement2);

fs.writeFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', code, 'utf8');
