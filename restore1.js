const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

// 1. Trigger Sonner toast
const sIdx1 = code.indexOf('if (userRes.success) setUser(userRes.data as User)');
if (sIdx1 !== -1) {
  const injection1 = \
      if (userRes.success) setUser(userRes.data as User)

      // Trigger Sonner toast for D-days
      if (ddayRes && ddayRes.success) {
        const dd = ddayRes.data as Schedule[];
        const upcoming = dd.filter(d => d.days_left >= 0 && d.days_left <= 7);
        if (upcoming.length > 0 && !sessionStorage.getItem('dday_toast_shown')) {
          sessionStorage.setItem('dday_toast_shown', 'true');
          toast(
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-red-500 font-bold text-lg">!</span>
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>다가오는 D-Day 일정 ({upcoming.length}건)</span>
              </div>
              <div className="space-y-1">
                {upcoming.slice(0, 3).map((d, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="truncate" style={{ color: 'var(--text-secondary)' }}>{d.title}</span>
                    <span className="font-bold shrink-0 ml-2" style={{ color: '#ef4444' }}>
                      {d.days_left === 0 ? 'D-Day' : \D-\\}
                    </span>
                  </div>
                ))}
                {upcoming.length > 3 && <div className="text-xs text-right opacity-60 mt-1">외 {upcoming.length - 3}건...</div>}
              </div>
            </div>
          , {
            duration: 8000,
            position: 'bottom-left',
            style: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px' }
          });
        }
      }
\;
  code = code.replace('if (userRes.success) setUser(userRes.data as User)', injection1);
}

// 2. monthSchedules
code = code.replace('const daySchedules = ddays.filter(s => isSameDay(new Date(s.start_date), day))', 'const daySchedules = monthSchedules.filter(s => isSameDay(new Date(s.start_date), day))');

// 3. D-Day Badges
code = code.replace(
  '<span className="font-bold mr-1 opacity-80">({getCategoryLabel(s.category)})</span>\\n                          {s.title}',
  '<span className="font-bold mr-1 opacity-80">({getCategoryLabel(s.category)})</span>\\n                          {s.is_dday === 1 && <span className="font-bold text-red-500 mr-1">[D-Day]</span>}\\n                          {s.title}'
);

code = code.replace(
  '<span className="font-bold mr-1 opacity-80" style={{ color: s.color }}>({getCategoryLabel(s.category)})</span>\\n                        {s.title}',
  '<span className="font-bold mr-1 opacity-80" style={{ color: s.color }}>({getCategoryLabel(s.category)})</span>\\n                        {s.is_dday === 1 && <span className="font-bold text-red-500 mr-1">[D-Day]</span>}\\n                        {s.title}'
);

code = code.replace(
  '<span className="font-bold mr-1 opacity-80" style={{ color: s.color }}>({getCategoryLabel(s.category)})</span>\\n                      {s.title}',
  '<span className="font-bold mr-1 opacity-80" style={{ color: s.color }}>({getCategoryLabel(s.category)})</span>\\n                        {s.is_dday === 1 && <span className="font-bold text-red-500 mr-1">[D-Day]</span>}\\n                        {s.title}'
);

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Restored partials');
