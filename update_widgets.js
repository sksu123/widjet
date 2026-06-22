const fs = require('fs');

function updateSettings() {
  const path = 'd:/widget/src/renderer/src/pages/Settings/Settings.tsx';
  let content = fs.readFileSync(path, 'utf8');

  content = content.replace(
`  const [dashboardWidgets, setDashboardWidgets] = useState({
    weather: true,
    dday: true,
    today: true,
    summary: true,
    quick: true
  })`,
`  const [dashboardWidgets, setDashboardWidgets] = useState({
    calendar: true,
    weather: true,
    summary: true,
    meal: true,
    schedule: true,
    favorites: true,
    memo: true,
    contacts: true
  })`);

  content = content.replace(
`              {[
                { key: 'weather', label: '상단 날씨' },
                { key: 'dday', label: '다가오는 일정' },
                { key: 'today', label: '오늘 일정' },
                { key: 'summary', label: '현황 요약' },
                { key: 'quick', label: '빠른 실행 버튼' }
              ].map(({ key, label }) => (`,
`              {[
                { key: 'calendar', label: '대형 캘린더' },
                { key: 'weather', label: '사용자 정보 및 날씨' },
                { key: 'summary', label: 'AI 날씨 요약' },
                { key: 'meal', label: '오늘의 급식' },
                { key: 'schedule', label: '할 일 / 학사일정' },
                { key: 'favorites', label: '파일/폴더 즐겨찾기' },
                { key: 'memo', label: '메모 보드' },
                { key: 'contacts', label: '주요 연락처 검색' }
              ].map(({ key, label }) => (`);

  fs.writeFileSync(path, content, 'utf8');
}

function wrapWidget(content, startComment, endMarker, condition) {
  const startIdx = content.indexOf(startComment);
  if (startIdx === -1) {
    console.error("Could not find startComment:", startComment);
    return content;
  }
  
  // Find the closing </div> of the widget
  let searchIdx = startIdx + startComment.length;
  let nextSectionIdx = content.indexOf(endMarker, searchIdx);
  if (nextSectionIdx === -1) {
    console.error("Could not find endMarker:", endMarker);
    return content;
  }
  
  // The widget ends just before the nextSectionIdx (usually at a </div>)
  // Let's insert {condition && ( before the widget, and )} after the widget.
  // Actually, we can just replace startComment with `startComment\n {condition && (`
  // And insert `)}` right before `endMarker`
  // Wait, if we just insert it before the div inside the widget, it's safer.
  
  const divStart = content.indexOf('<div', startIdx);
  
  // Let's find the matching closing div for divStart
  let i = divStart;
  let depth = 0;
  let endDivIdx = -1;
  while (i < nextSectionIdx) {
    if (content.substr(i, 4) === '<div') {
      depth++;
      i += 4;
    } else if (content.substr(i, 6) === '</div>') {
      depth--;
      if (depth === 0) {
        endDivIdx = i + 6;
        break;
      }
      i += 6;
    } else {
      i++;
    }
  }

  if (endDivIdx === -1) {
    console.error("Could not find matching closing div for:", startComment);
    return content; // fallback
  }

  // Check if already wrapped
  const beforeDiv = content.substring(startIdx, divStart);
  if (beforeDiv.includes('widgetsConfig.')) return content;

  const part1 = content.substring(0, divStart);
  const part2 = content.substring(divStart, endDivIdx);
  const part3 = content.substring(endDivIdx);

  return part1 + '{widgetsConfig.' + condition + ' && (\n' + part2 + '\n)}' + part3;
}

function updateDashboard() {
  const path = 'd:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx';
  let content = fs.readFileSync(path, 'utf8');

  content = content.replace(
`  const [widgetsConfig, setWidgetsConfig] = useState({
    weather: true,
    dday: true,
    today: true,
    summary: true,
    quick: true
  })`,
`  const [widgetsConfig, setWidgetsConfig] = useState({
    calendar: true,
    weather: true,
    summary: true,
    meal: true,
    schedule: true,
    favorites: true,
    memo: true,
    contacts: true
  })`);

  // Col 1 Calendar
  content = wrapWidget(content, '{/* [1단] 좌측 패널: 대형 캘린더 (40%) */}', '{/* [2단]', 'calendar');

  // Col 2 Widgets
  content = wrapWidget(content, '{/* 사용자 정보 & 날씨 */}', '{/* AI 날씨 요약 배너 */}', 'weather');
  content = wrapWidget(content, '{/* AI 날씨 요약 배너 */}', '{/* 오늘의 급식 */}', 'summary');
  content = wrapWidget(content, '{/* 오늘의 급식 */}', '{/* 할 일 / 학사일정 탭 */}', 'meal');
  content = wrapWidget(content, '{/* 할 일 / 학사일정 탭 */}', '{/* [3단]', 'schedule');

  // Col 3 Widgets
  content = wrapWidget(content, '{/* 파일/폴더 즐겨찾기 */}', '{/* 메모 보드 (포스트잇) */}', 'favorites');
  content = wrapWidget(content, '{/* 메모 보드 (포스트잇) */}', '{/* 주요 연락처 검색 */}', 'memo');
  // For Contacts, next comment is usually end of file or something else
  content = wrapWidget(content, '{/* 주요 연락처 검색 */}', '      </div>\n    </div>\n  )\n}', 'contacts');

  fs.writeFileSync(path, content, 'utf8');
}

updateSettings();
updateDashboard();
console.log("Done");
