const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Calendar/CalendarPage.tsx', 'utf8');

// 1. Remove is_dday from interface Schedule
code = code.replace(/is_dday\?: number; /g, '');

// 2. Remove is_dday from setForm and form usages
code = code.replace(/, is_dday: false/g, '');
code = code.replace(/, is_dday: true/g, '');
code = code.replace(/is_dday: aiParsedResult\.is_dday \? 1 : 0,/g, '');
code = code.replace(/is_dday: s\.is_dday === 1,/g, '');
code = code.replace(/is_dday: form\.is_dday \? 1 : 0,/g, '');
code = code.replace(/is_dday\?: boolean;/g, '');
code = code.replace(/is_dday: res\.data\.is_dday === 1,/g, '');

// 3. Remove the D-Day badges from rendering
code = code.replace(/\{s\.is_dday === 1 && <span.*?D-Day<\/span>\}/g, '');

// 4. Remove the D-Day checkbox UI (two checkboxes)
const cb1Start = code.indexOf('<input type="checkbox" id="dday-check"');
if (cb1Start !== -1) {
  const cb1End = code.indexOf('</div>', cb1Start);
  // remove the whole div wrapping it (it has <div className="flex items-center gap-2 mt-2 mb-2">)
  const divStart = code.lastIndexOf('<div', cb1Start);
  code = code.substring(0, divStart) + code.substring(cb1End + 6);
}

const cb2Start = code.indexOf('checked={aiParsedResult.is_dday || false}');
if (cb2Start !== -1) {
  const cb2End = code.indexOf('</label>', cb2Start);
  const labelStart = code.lastIndexOf('<label', cb2Start);
  code = code.substring(0, labelStart) + code.substring(cb2End + 8);
}

fs.writeFileSync('src/renderer/src/pages/Calendar/CalendarPage.tsx', code);
console.log('Cleaned CalendarPage');
