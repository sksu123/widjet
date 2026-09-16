const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

const clockComponent = \unction RealtimeClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="text-right">
      <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
        {format(now, 'HH:mm:ss')}
      </p>
      <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
        {format(now, 'yyyy. MM. dd. (EEE)', { locale: ko })}
      </p>
    </div>
  )
}

\;

// Insert RealtimeClock component before default export
code = code.replace('export default function Dashboard() {', clockComponent + 'export default function Dashboard() {');

// Remove global state and effect
code = code.replace('const [now, setNow] = useState(new Date())\\n', '');
code = code.replace(/\\s*useEffect\\(\\(\\) => \\{\\s*const timer = setInterval\\(\\(\\) => setNow\\(new Date\\(\\)\\), 1000\\)\\s*return \\(\\) => clearInterval\\(timer\\)\\s*\\}, \\[\\]\\)/, '');

// Replace old JSX block with <RealtimeClock />
const oldJsx = \<div className="text-right">
              <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--text-primary)' }}>
                {format(now, 'HH:mm:ss')}
              </p>
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                {format(now, 'yyyy. MM. dd. (EEE)', { locale: ko })}
              </p>
            </div>\;
            
if (code.includes(oldJsx)) {
    code = code.replace(oldJsx, '<RealtimeClock />');
} else {
    // try regex
    code = code.replace(/<div className="text-right">\\s*<p className="text-2xl font-bold tabular-nums tracking-tight"[\\s\\S]*?<\\/div>/, '<RealtimeClock />');
}

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Fixed real-time clock');
