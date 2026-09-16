const fs = require('fs');

let code = fs.readFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

// Import toast
if (!code.includes("import { toast } from 'sonner'")) {
  code = code.replace("import { useNavigate } from 'react-router-dom'", "import { useNavigate } from 'react-router-dom'\nimport { toast } from 'sonner'");
}

// Remove ddayPopupClosed state
code = code.replace(/const \[ddayPopupClosed, setDdayPopupClosed\] = useState\(false\)\n/, '');

// Add useEffect for toast
const loadDataEnd = `      if (settingsRes.success) {
        const s = settingsRes.data as Record<string, string>
        if (s.dashboard_widgets) {
          try { setWidgetsConfig(JSON.parse(s.dashboard_widgets)) } catch(e) {}
        }
      }`;

const toastLogic = `      if (settingsRes.success) {
        const s = settingsRes.data as Record<string, string>
        if (s.dashboard_widgets) {
          try { setWidgetsConfig(JSON.parse(s.dashboard_widgets)) } catch(e) {}
        }
      }
      
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
      }`;

code = code.replace(loadDataEnd, toastLogic);

// Remove the modal
const modalRegex = /\{\/\* D-Day 팝업 \*\/\}\s*\{!ddayPopupClosed[\s\S]*?<\/div>\s*<\/div>\s*\)\}/;
code = code.replace(modalRegex, '');

fs.writeFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Modified Dashboard to use sonner');
