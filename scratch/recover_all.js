const fs = require('fs');

// 1. Recover Dashboard from temp
let content = fs.readFileSync('d:/widget/temp_dashboard.tsx', 'utf16le');

// 2. Fix the broken string literal
const brokenString = "const [user, setUser] = useState<User>({ name: '愿€由ъ옄', school_name: '?뗢뿃珥덈벑?숆탳', department: '?됱젙?? })";
const fixedString = "const [user, setUser] = useState<User>({ name: '관리자', school_name: '땡땡초등학교', department: '행정실' })";

if (content.includes(brokenString)) {
  content = content.replace(brokenString, fixedString);
} else {
  // Try regex if spacing differs
  content = content.replace(/const \[user, setUser\] = useState<User>\(\{ name: '[^']+', school_name: '[^']+', department: '[^']?' \}\)/, fixedString);
  // Just manual fix if it has unterminated literal
  content = content.replace(/department: '\?됱젙\?\? \}\)/g, "department: '행정실' })");
}

fs.writeFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', content, 'utf8');

// 3. Re-apply the sonner toast
let lines = fs.readFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8').split('\n');

if (!lines.find(l => l.includes("import { toast } from 'sonner'"))) {
  const routerIdx = lines.findIndex(l => l.includes("import { useNavigate }"));
  lines.splice(routerIdx + 1, 0, "import { toast } from 'sonner'");
}

const targetIdx = lines.findIndex(l => l.includes("if (settingsRes.success) {"));
let openBraces = 0;
let endIdx = -1;
for (let i = targetIdx; i < lines.length; i++) {
  openBraces += (lines[i].match(/\{/g) || []).length;
  openBraces -= (lines[i].match(/\}/g) || []).length;
  if (openBraces === 0) {
    endIdx = i;
    break;
  }
}

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

if (endIdx !== -1) {
  lines.splice(endIdx + 1, 0, toastLogic);
  fs.writeFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', lines.join('\n'), 'utf8');
  console.log('Successfully added sonner to Dashboard');
} else {
  console.log('Could not find end of settingsRes block');
}
