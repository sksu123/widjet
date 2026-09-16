const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/RuleAi/RuleAi.tsx', 'utf8');

code = code.replace(
  "filters: [{ name: '지원 문서', extensions: ['pdf', 'txt', 'hwp', 'hwpx', 'docx'] }]",
  "filters: [{ name: '지원 문서', extensions: ['pdf', 'hwp', 'hwpx', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'txt', 'csv', 'md', 'html', 'xml', 'png', 'jpg', 'jpeg', 'webp', 'zip'] }]"
);

code = code.replace(
  "<p className=\"text-sm text-slate-500\">답변의 근거가 될 규정집을 업로드하세요. (PDF, TXT, HWP, DOCX 지원)</p>",
  "<div className=\"text-sm text-slate-500 mt-1\"><p>규정집 파일을 업로드하세요.</p><p className=\"mt-2 font-semibold\">지원 예시</p><p>PDF · HWP · DOC · DOCX · XLS · XLSX · PPT · PPTX<br/>ODT · ODS · ODP · TXT · CSV · MD · HTML · XML<br/>PNG · JPG · JPEG · WEBP · ZIP</p><p className=\"mt-2 text-[11px]\">※ Gemini API에서 실제 지원하지 않는 형식은 자동으로 안내합니다.<br/>※ 오디오·동영상은 규정집 검색용으로 지원하지 않습니다.</p></div>"
);

fs.writeFileSync('src/renderer/src/pages/RuleAi/RuleAi.tsx', code);
console.log('UI Updated');
