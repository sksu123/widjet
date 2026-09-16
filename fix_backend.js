const fs = require('fs');
let code = fs.readFileSync('src/main/ipc/rule_ai.handler.ts', 'utf8');

const sIdx = code.indexOf("if (ext === 'pdf') {");
const eIdx = code.indexOf(";(async () => {", sIdx);

const newLogic = \
        const textExts = ['txt', 'md', 'html', 'xml', 'json', 'csv', 'rtf', 'css', 'js'];
        const unsupportedExts = ['doc', 'dot', 'dotx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'png', 'jpg', 'jpeg', 'webp', 'zip'];
        const audioVideo = ['mp3', 'mp4', 'wav', 'avi', 'mkv', 'ogg'];
        
        if (audioVideo.includes(ext)) {
          return { success: false, error: '오디오 및 동영상 파일은 현재 규정집 검색 저장소에서 지원하지 않습니다.\\n문서 또는 PDF 형태로 변환하여 업로드해주세요.' };
        } else if (unsupportedExts.includes(ext)) {
          return { success: false, error: '이 파일 형식은 현재 직접 분석할 수 없습니다.\\n\\nPDF, DOCX, XLSX, PPTX, HWP, TXT, CSV 등의 형식으로 변환한 후 다시 업로드해주세요.' };
        } else if (ext === 'pdf') {
          const dataBuffer = fs.readFileSync(filePath)
          const render_page = function(pageData: any) {
            let render_options = { normalizeWhitespace: false, disableCombineTextItems: false }
            return pageData.getTextContent(render_options).then(function(textContent: any) {
                let text = textContent.items.map((item: any) => item.str).join(' ');
                pages.push(text);
                return text;
            });
          }
          let options = { pagerender: render_page }
          const pdfParse = require('pdf-parse')
          await pdfParse(dataBuffer, options)
        } else if (textExts.includes(ext)) {
          const text = fs.readFileSync(filePath, 'utf-8')
          const chunks = text.split(/(?:\\r?\\n){2,}/).filter(c => c.trim().length > 0)
          pages = chunks
        } else if (ext === 'docx') {
          const mammoth = require('mammoth')
          const result = await mammoth.extractRawText({ path: filePath })
          const chunks = result.value.split(/(?:\\r?\\n){2,}/).filter((c: string) => c.trim().length > 0)
          pages = chunks
        } else if (ext === 'hwp') {
          const { hwpToText } = await import('@ssabrojs/hwpxjs')
          const dataBuffer = fs.readFileSync(filePath)
          const text = await hwpToText(dataBuffer)
          const chunks = text.split(/(?:\\r?\\n){2,}/).filter((c: string) => c.trim().length > 0)
          pages = chunks
        } else if (ext === 'hwpx') {
          const { hwpxToText } = await import('@ssabrojs/hwpxjs')
          const dataBuffer = fs.readFileSync(filePath)
          const text = await hwpxToText(dataBuffer)
          const chunks = text.split(/(?:\\r?\\n){2,}/).filter((c: string) => c.trim().length > 0)
          pages = chunks
        } else if (['xls', 'xlsx', 'xlsm'].includes(ext)) {
          const XLSX = require('xlsx')
          const workbook = XLSX.readFile(filePath)
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName]
            const text = XLSX.utils.sheet_to_txt(worksheet)
            if (text.trim()) {
              const chunks = text.split(/(?:\\r?\\n){2,}/).filter((c: string) => c.trim().length > 0)
              chunks.forEach(c => pages.push(\[Sheet: \]\\n\\))
            }
          })
        } else {
          return { success: false, error: '이 파일 형식은 현재 직접 분석할 수 없습니다.\\n\\nPDF, DOCX, XLSX, PPTX, HWP, TXT, CSV 등의 형식으로 변환한 후 다시 업로드해주세요.' };
        }
        
\;

const newCode = code.substring(0, sIdx) + newLogic + code.substring(eIdx);
fs.writeFileSync('src/main/ipc/rule_ai.handler.ts', newCode);
console.log('Backend Updated');
