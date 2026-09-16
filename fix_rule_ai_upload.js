const fs = require('fs');
let code = fs.readFileSync('src/main/ipc/rule_ai.handler.ts', 'utf8');

const target = \} else {
          return { success: false, error: '이 파일 형식은 현재 직접 분석할 수 없습니다.\\n\\nPDF, DOCX, XLSX, PPTX, HWP, TXT, CSV 등의 형식으로 변환한 후 다시 업로드해주세요.' };
        }
        
;(async () => {\;

const replacement = \} else {
          return { success: false, error: '이 파일 형식은 현재 직접 분석할 수 없습니다.\\n\\nPDF, DOCX, XLSX, PPTX, HWP, TXT, CSV 등의 형식으로 변환한 후 다시 업로드해주세요.' };
        }
        
        const insertDoc = db.prepare(\
          INSERT INTO rule_documents (name, total_pages, status, is_active)
          VALUES (?, ?, '분석 중', 1)
        \);
        const info = insertDoc.run(fileName, pages.length);
        const docId = info.lastInsertRowid;

        const insertPage = db.prepare(\
          INSERT INTO rule_pages (document_id, page_number, content, embedding)
          VALUES (?, ?, ?, ?)
        \);
        
        ;(async () => {\;

code = code.replace(target, replacement);
fs.writeFileSync('src/main/ipc/rule_ai.handler.ts', code);
console.log('Fixed upload doc logic');
