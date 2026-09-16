const fs = require('fs');

let code = fs.readFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

// 1. Add sonner toast import
if (!code.includes("import { toast } from 'sonner'")) {
  const routerIdx = code.indexOf("import { useNavigate }");
  const insertPos = code.indexOf('\\n', routerIdx) + 1;
  code = code.slice(0, insertPos) + "import { toast } from 'sonner'\\n" + code.slice(insertPos);
}

// 2. Add monthSchedules state
if (!code.includes("const [monthSchedules")) {
  code = code.replace(
    "const [ddays, setDdays] = useState<Schedule[]>([])",
    "const [ddays, setDdays] = useState<Schedule[]>([])\\n  const [monthSchedules, setMonthSchedules] = useState<Schedule[]>([])"
  );
}

// 3. Update loadData Promise.all array and assignments
code = code.replace(
  /const \[weatherRes, todayRes, ddayRes, userRes, settingsRes, mealRes, contactsRes\] = await Promise\.all\(\[\s*window\.api\.calendar\.getWeather\(\),\s*window\.api\.calendar\.getToday\(\),\s*window\.api\.calendar\.getDday\(\),\s*window\.api\.db\.getUser\(\),\s*window\.api\.db\.getSettings\(\),\s*(.*?)\s*\]\)/s,
  `const [weatherRes, todayRes, ddayRes, monthRes, userRes, settingsRes, mealRes, contactsRes] = await Promise.all([
        window.api.calendar.getWeather(),
        window.api.calendar.getToday(),
        window.api.calendar.getDday(),
        window.api.db.getSchedules(),
        window.api.db.getUser(),
        window.api.db.getSettings(),
        $1
      ])`
);

code = code.replace(
  "if (ddayRes.success) setDdays(ddayRes.data as Schedule[])\\n      if (userRes.success) setUser(userRes.data as User)",
  "if (ddayRes.success) setDdays(ddayRes.data as Schedule[])\\n      if (monthRes && monthRes.success) setMonthSchedules(monthRes.data as Schedule[])\\n      if (userRes.success) setUser(userRes.data as User)"
);

// 4. Update the Sonner Toast
const settingsBlockEnd = code.indexOf("if (mealRes) {");
const toastLogic = `
      // Trigger Sonner toast for D-days
      if (ddayRes.success) {
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
                      {d.days_left === 0 ? 'D-Day' : \`D-\${d.days_left}\`}
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

      `;

if (!code.includes("dday_toast_shown")) {
  code = code.slice(0, settingsBlockEnd) + toastLogic + code.slice(settingsBlockEnd);
}

// 5. Update calendar dot rendering
code = code.replace(
  "const daySchedules = ddays.filter(s => isSameDay(new Date(s.start_date), day))",
  "const daySchedules = monthSchedules.filter(s => isSameDay(new Date(s.start_date), day))"
);

fs.writeFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', code, 'utf8');
console.log("Dashboard rebuilt successfully");
