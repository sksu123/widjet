const fs = require('fs');
let code = fs.readFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

const target = `                      {/* 내 일정 */}
                      {daySchedules.map((s, i) => (
                        <div key={\`my-\${i}\`} className="text-[10px] truncate px-1.5 py-0.5 rounded"
                          style={{ background: \`\${s.color}20\`, color: s.color || 'var(--text-primary)' }}>
                          <span className="w-1 h-1 inline-block rounded-full mr-1 align-middle" style={{ background: s.color }}/>
                          <span className="font-bold mr-1 opacity-80">({getCategoryLabel(s.category)})</span>
                          {s.title}
                        </div>
                      ))}`;

const replacement = `                      {/* 내 일정 */}
                      {daySchedules.map((s, i) => (
                        <div key={\`my-\${i}\`} className="text-[10px] truncate px-1.5 py-0.5 rounded flex items-center"
                          style={{ 
                            background: s.is_dday ? 'rgba(239,68,68,0.1)' : \`\${s.color}20\`, 
                            color: s.is_dday ? '#ef4444' : (s.color || 'var(--text-primary)'),
                            fontWeight: s.is_dday ? 'bold' : 'normal',
                            border: s.is_dday ? '1px solid rgba(239,68,68,0.3)' : 'none'
                          }}>
                          <span className="w-1.5 h-1.5 inline-block rounded-full mr-1 shrink-0" style={{ background: s.is_dday ? '#ef4444' : s.color }}/>
                          <span className="font-bold mr-1 opacity-80 shrink-0">({getCategoryLabel(s.category)})</span>
                          <span className="truncate flex-1">{s.title}</span>
                          {s.is_dday === 1 && <span className="ml-1 text-[9px] bg-red-500 text-white px-1 rounded shrink-0">D-DAY</span>}
                        </div>
                      ))}`;

code = code.replace(target, replacement);

fs.writeFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', code, 'utf8');
