const fs = require('fs');

const tsxPath = 'd:/widget/src/renderer/src/pages/Settings/Settings.tsx';
let content = fs.readFileSync(tsxPath, 'utf8');

const startPattern = '          {/* ===== 테마 ===== */}';
const endPattern = '          {/* ===== 레이아웃 ===== */}';

const startIndex = content.indexOf(startPattern);
const endIndex = content.indexOf(endPattern);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `          {/* ===== 테마 갤러리 ===== */}
          <div>
            <label className="label">테마 디자인</label>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>20가지의 다채로운 테마 중 마음에 드는 디자인을 선택하세요.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: 'theme-light', label: '클래식 라이트', bg: '#f8fafc', accent: '#2563eb' },
                { value: 'theme-dark', label: '클래식 다크', bg: '#0f172a', accent: '#3b82f6' },
                { value: 'theme-ocean', label: '오션 딥 블루', bg: '#082f49', accent: '#38bdf8' },
                { value: 'theme-forest', label: '포레스트 그린', bg: '#064e3b', accent: '#34d399' },
                { value: 'theme-sunset', label: '선셋 글로우', bg: '#fff7ed', accent: '#ea580c' },
                { value: 'theme-lavender', label: '라벤더 미스트', bg: '#faf5ff', accent: '#9333ea' },
                { value: 'theme-monochrome', label: '모노크롬 시크', bg: '#18181b', accent: '#fafafa' },
                { value: 'theme-retro', label: '레트로 바이브', bg: '#fef3c7', accent: '#b45309' },
                { value: 'theme-neon', label: '네온 시티', bg: '#020617', accent: '#d946ef' },
                { value: 'theme-mint', label: '프레시 민트', bg: '#f0fdfa', accent: '#0d9488' },
                { value: 'theme-rose', label: '로즈 골드', bg: '#fff1f2', accent: '#e11d48' },
                { value: 'theme-sky', label: '스카이 브리즈', bg: '#f0f9ff', accent: '#0284c7' },
                { value: 'theme-peach', label: '피치 코랄', bg: '#fef2f2', accent: '#ef4444' },
                { value: 'theme-slate', label: '슬레이트 그레이', bg: '#f8fafc', accent: '#334155' },
                { value: 'theme-coffee', label: '모닝 커피', bg: '#f5f5f4', accent: '#ea580c' },
                { value: 'theme-cherry', label: '체리 블라썸', bg: '#fdf2f8', accent: '#db2777' },
                { value: 'theme-navy', label: '미드나잇 네이비', bg: '#020617', accent: '#3b82f6' },
                { value: 'theme-sand', label: '샌드 듄', bg: '#fbf8f1', accent: '#b45309' },
                { value: 'theme-grape', label: '와인 베리', bg: '#2e0618', accent: '#e879f9' },
                { value: 'theme-cyber', label: '사이버펑크', bg: '#050505', accent: '#00ff41' },
              ].map(({ value, label, bg, accent }) => (
                <button key={value} onClick={() => {
                  updateSetting('theme', value)
                  const font = settings.font || 'noto'
                  const layout = settings.layout || 'standard'
                  const fontSize = settings.font_size || '3'
                  document.documentElement.className = \`\${value} font-\${font} layout-\${layout} text-size-\${fontSize}\`
                }}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all border-2"
                  style={settings.theme === value || (!settings.theme && value === 'theme-light')
                    ? { background: 'var(--bg-card)', borderColor: accent, boxShadow: \`0 0 0 1px \${accent}\` }
                    : { background: 'var(--bg-card)', borderColor: 'var(--border)' }
                  }>
                  <div className="w-full h-12 rounded-lg flex shadow-inner overflow-hidden border" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
                    <div className="w-1/3 h-full" style={{ background: accent }}></div>
                    <div className="w-2/3 h-full" style={{ background: bg }}></div>
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: settings.theme === value || (!settings.theme && value === 'theme-light') ? accent : 'var(--text-secondary)' }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ===== 글자 크기 ===== */}
          <div>
            <label className="label mt-4">글자 크기 조절</label>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>앱 전체의 글자 크기를 1~5단계로 조절합니다. (기본 3단계)</p>
            <div className="flex gap-2">
              {[
                { level: '1', label: '가장 작게' },
                { level: '2', label: '작게' },
                { level: '3', label: '보통' },
                { level: '4', label: '크게' },
                { level: '5', label: '가장 크게' },
              ].map(({ level, label }) => (
                <button key={level} onClick={() => {
                  updateSetting('font_size', level)
                  const theme = settings.theme || 'theme-light'
                  const font = settings.font || 'noto'
                  const layout = settings.layout || 'standard'
                  document.documentElement.className = \`\${theme} font-\${font} layout-\${layout} text-size-\${level}\`
                }}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all border"
                  style={settings.font_size === level || (!settings.font_size && level === '3')
                    ? { background: 'var(--accent-blue)', color: 'white', borderColor: 'var(--accent-blue)' }
                    : { background: 'var(--bg-card)', color: 'var(--text-muted)', borderColor: 'var(--border)' }
                  }>
                  <span style={{ fontSize: \`\${10 + parseInt(level)*2}px\` }}>A</span><br/>
                  <span className="mt-1 inline-block">{label}</span>
                </button>
              ))}
            </div>
          </div>

`;
  const newContent = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  fs.writeFileSync(tsxPath, newContent, 'utf8');
  console.log('Successfully updated Settings.tsx');
} else {
  console.log('Could not find start or end pattern in Settings.tsx');
}
