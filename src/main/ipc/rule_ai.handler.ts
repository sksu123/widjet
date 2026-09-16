import { ipcMain } from 'electron'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getDb } from '../db/database'
import * as fs from 'fs'
const pdfParse = require('pdf-parse')
import { AI_CONFIG } from './ai_config'

import { GoogleGenerativeAI } from '@google/generative-ai'

import { AI_CONFIG } from './ai_config'

// 코사인 유사도 계산
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 텍스트 정제 (의미 없는 줄바꿈, 공백 제거)
function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}


// 제미나이 API 키를 DB에서 직접 가져오는 함수 (외부 의존성 없음)
function getGeminiKey(): string {
  const db = getDb();
  if (!db) return '';
  const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as { value: string } | undefined;
  return (row?.value || process.env.GEMINI_API_KEY || '').trim();
}

// 최신 Flash 모델을 동적으로 탐색하는 함수 (DB 수동 설정 최우선)
let cachedFlashModel = '';
async function getFlashModel(apiKey: string): Promise<string> {
  // 1순위: 사용자가 수동으로 선택한 모델 (DB에서 매번 읽어 최신값 반영)
  try {
    const db = getDb();
    const prefRow = db.prepare("SELECT value FROM settings WHERE key = 'gemini_model_preference'").get() as { value: string } | undefined;
    const pref = prefRow?.value;
    if (pref && pref !== 'auto' && pref.trim() !== '') {
      console.log('[RuleAI Model] 사용자 수동 선택 모델 사용:', pref);
      return pref.trim();
    }
  } catch (e) {
    console.error('[RuleAI Model] DB 설정 읽기 실패:', e);
  }

  // 2순위: 캐시된 자동 탐색 결과
  if (cachedFlashModel) return cachedFlashModel;

  // 3순위: API로 최신 모델 자동 탐색
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data && data.models) {
      const flashModels = data.models.filter((m: any) =>
        m.name.includes('flash') && m.supportedGenerationMethods?.includes('generateContent') && !m.name.includes('exp')
      );
      flashModels.sort((a: any, b: any) => {
        const numA = parseFloat((a.name.match(/\d+(\.\d+)?/) || ['0'])[0]);
        const numB = parseFloat((b.name.match(/\d+(\.\d+)?/) || ['0'])[0]);
        return numB - numA;
      });
      if (flashModels.length > 0) {
        cachedFlashModel = flashModels[0].name.replace('models/', '');
        return cachedFlashModel;
      }
    }
  } catch (e) { console.error('[RuleAI Model] 모델 목록 조회 실패:', e); }

  // 4순위: fallback
  return 'gemini-3.5-flash';
}

export function setupRuleAiHandlers() {

  ipcMain.handle('ruleAi:deleteChat', async (_, id: number) => {
    try {
      const db = getDb()
      if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' }
      db.prepare('DELETE FROM rule_messages WHERE chat_id = ?').run(id)
      db.prepare('DELETE FROM rule_chats WHERE id = ?').run(id)
      return { success: true }
    } catch (error: any) {
      console.error('ruleAi:deleteChat error', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('ruleAi:deleteAllChats', async () => {
    try {
      const db = getDb()
      if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' }
      db.prepare('DELETE FROM rule_messages').run()
      db.prepare('DELETE FROM rule_chats').run()
      return { success: true }
    } catch (error: any) {
      console.error('ruleAi:deleteAllChats error', error)
      return { success: false, error: error.message }
    }
  })

  // 문서 업로드 및 분석
  ipcMain.handle('ruleAi:uploadDocument', async (_, filePath: string) => {
    try {
      const db = getDb()
      if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' }

      // API Key 가져오기 (문서 업로드는 이제 100% 로컬이므로 불필요하지만 유지/제거 옵션)
      // 제미나이 API 키 가져오기
      const uploadApiKey = getGeminiKey();
      if (!uploadApiKey) return { success: false, error: '제미나이 API 키가 설정되지 않았습니다. 환경설정에서 등록해주세요.' };

      // 파일명 추출
      const fileName = filePath.split('\\').pop() || filePath.split('/').pop() || 'unknown.pdf'
      
      const dataBuffer = fs.readFileSync(filePath)
      
      let pages: string[] = []
      const ext = fileName.split('.').pop()?.toLowerCase() || ''
      
      
        const textExts = ['txt', 'md', 'html', 'xml', 'json', 'csv', 'rtf', 'css', 'js'];
        const unsupportedExts = ['doc', 'dot', 'dotx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'png', 'jpg', 'jpeg', 'webp', 'zip'];
        const audioVideo = ['mp3', 'mp4', 'wav', 'avi', 'mkv', 'ogg'];
        
        if (audioVideo.includes(ext)) {
          return { success: false, error: '오디오 및 동영상 파일은 현재 규정집 검색 저장소에서 지원하지 않습니다.\n문서 또는 PDF 형태로 변환하여 업로드해주세요.' };
        } else if (unsupportedExts.includes(ext)) {
          return { success: false, error: '이 파일 형식은 현재 직접 분석할 수 없습니다.\n\nPDF, DOCX, XLSX, PPTX, HWP, TXT, CSV 등의 형식으로 변환한 후 다시 업로드해주세요.' };
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
          const chunks = text.split(/(?:\r?\n){2,}/).filter(c => c.trim().length > 0)
          pages = chunks
        } else if (ext === 'docx') {
          const mammoth = require('mammoth')
          const result = await mammoth.extractRawText({ path: filePath })
          const chunks = result.value.split(/(?:\r?\n){2,}/).filter((c: string) => c.trim().length > 0)
          pages = chunks
        } else if (ext === 'hwp') {
          const { hwpToText } = await import('@ssabrojs/hwpxjs')
          const dataBuffer = fs.readFileSync(filePath)
          const text = await hwpToText(dataBuffer)
          const chunks = text.split(/(?:\r?\n){2,}/).filter((c: string) => c.trim().length > 0)
          pages = chunks
        } else if (ext === 'hwpx') {
          const { hwpxToText } = await import('@ssabrojs/hwpxjs')
          const dataBuffer = fs.readFileSync(filePath)
          const text = await hwpxToText(dataBuffer)
          const chunks = text.split(/(?:\r?\n){2,}/).filter((c: string) => c.trim().length > 0)
          pages = chunks
        } else if (['xls', 'xlsx', 'xlsm'].includes(ext)) {
          const XLSX = require('xlsx')
          const workbook = XLSX.readFile(filePath)
          workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName]
            const text = XLSX.utils.sheet_to_txt(worksheet)
            if (text.trim()) {
              const chunks = text.split(/(?:\r?\n){2,}/).filter((c: string) => c.trim().length > 0)
              chunks.forEach(c => pages.push(`[Sheet: ${sheetName}]\n${c}`))
            }
          })
        } else {
          return { success: false, error: '이 파일 형식은 현재 직접 분석할 수 없습니다.\n\nPDF, DOCX, XLSX, PPTX, HWP, TXT, CSV 등의 형식으로 변환한 후 다시 업로드해주세요.' };
        }
        
        const insertDoc = db.prepare("INSERT INTO rule_documents (name, type, total_pages, status, is_active) VALUES (?, ?, ?, '분석 중', 1)");
        const info = insertDoc.run(fileName, ext || 'unknown', pages.length);
        const docId = info.lastInsertRowid;

        const insertPage = db.prepare("INSERT INTO rule_pages (document_id, page_number, content, embedding) VALUES (?, ?, ?, ?)");
        
        ;(async () => {
        try {
          for (let i = 0; i < pages.length; i++) {
            const content = cleanText(pages[i])
            if (content.length < 10) continue // 너무 짧은 페이지 스킵
            
            // 임베딩 호출 (형식: title: {문서명} | text: {Chunk 내용})
            const embedText = `title: ${fileName} | text: ${content}`
            const uploadEmbedModel = new GoogleGenerativeAI(uploadApiKey).getGenerativeModel({ model: 'gemini-embedding-2' });
            const embedResult = await uploadEmbedModel.embedContent(embedText);
            const embedding = embedResult.embedding.values;;
            
            insertPage.run(docId, i + 1, content, JSON.stringify(embedding))
          }
          
          db.prepare("UPDATE rule_documents SET status = '분석 완료' WHERE id = ?").run(docId)
        } catch (err) {
          console.error("Embedding Error: ", err)
          db.prepare("UPDATE rule_documents SET status = '분석 오류' WHERE id = ?").run(docId)
        }
      })();

      return { success: true, data: { id: docId, name: fileName, total_pages: pages.length } }
    } catch (error: any) {
      console.error(error)
      return { success: false, error: error.message }
    }
  })

  // 문서 목록 조회
  ipcMain.handle('ruleAi:getDocuments', async () => {
    try {
      const db = getDb()
      if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' }
      const docs = db.prepare('SELECT * FROM rule_documents ORDER BY id DESC').all()
      return { success: true, data: docs }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 문서 상태 토글
  ipcMain.handle('ruleAi:toggleDocument', async (_, id: number, isActive: boolean) => {
    try {
      const db = getDb()
      if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' }
      db.prepare('UPDATE rule_documents SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 문서 삭제
  ipcMain.handle('ruleAi:deleteDocument', async (_, id: number) => {
    try {
      const db = getDb()
      if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' }
      db.prepare('DELETE FROM rule_documents WHERE id = ?').run(id)
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 페이지 원문 조회
  ipcMain.handle('ruleAi:getPageContent', async (_, documentId: number, pageNumber: number) => {
    try {
      const db = getDb()
      if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' }
      const row = db.prepare('SELECT content FROM rule_pages WHERE document_id = ? AND page_number = ?').get(documentId, pageNumber) as any
      if (!row) return { success: false, error: 'PAGE_NOT_FOUND' }
      return { success: true, data: row.content }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 채팅 세션 목록 조회
  ipcMain.handle('ruleAi:getChats', async () => {
    try {
      const db = getDb()
      if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' }
      const chats = db.prepare('SELECT * FROM rule_chats ORDER BY updated_at DESC').all()
      return { success: true, data: chats }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 특정 세션 메시지 조회
  ipcMain.handle('ruleAi:getMessages', async (_, chatId: number) => {
    try {
      const db = getDb()
      if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' }
      const messages = db.prepare('SELECT * FROM rule_messages WHERE chat_id = ? ORDER BY id ASC').all(chatId)
      return { success: true, data: messages }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  })

  // 질문 및 답변 생성 (RAG)
  ipcMain.handle('ruleAi:askQuestion', async (_, chatId: number | null, question: string) => {
  try {
    const db = getDb();
    if (!db) return { success: false, error: 'DB_NOT_INITIALIZED' };
    
    const apiKey = getGeminiKey();
    if (!apiKey) return { success: false, error: '제미나이 API 키가 설정되지 않았습니다. 환경설정에서 등록해주세요.' };
    
    // 1. 제미나이 임베딩으로 질문 벡터 생성
    const embedModel = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: 'gemini-embedding-2' });
    const qEmbedResult = await embedModel.embedContent(question);
    const qEmbedding = qEmbedResult.embedding.values;

    // 2. 임베딩 검색
    const pages = db.prepare("SELECT p.id, p.document_id, p.page_number, p.content, p.embedding, d.name as doc_name FROM rule_pages p JOIN rule_documents d ON p.document_id = d.id WHERE d.is_active = 1").all() as any[];

    let dimensionMismatch = false;
    const scoredPages = pages.map(p => {
      const pEmbedding = JSON.parse(p.embedding);
      if (qEmbedding.length !== pEmbedding.length) {
        dimensionMismatch = true;
      }
      const score = cosineSimilarity(qEmbedding, pEmbedding);
      return { ...p, score };
    });
    
    if (dimensionMismatch) {
      throw new Error("임베딩 AI 엔진이 새로운 제미나이(Gemini) 기반으로 업데이트되어 기존 문서와 호환되지 않습니다. 규정 문서 목록에서 기존 문서를 삭제하고 다시 업로드해 주세요!");
    }
    
    scoredPages.sort((a, b) => b.score - a.score);

    const topPages = scoredPages.slice(0, 5); // 고정 5개

    let contextText = '';
    let sourcesData: any[] = [];
    
    topPages.forEach((p, idx) => {
      contextText += "\n\n[문서명: " + p.doc_name + ", 페이지: " + p.page_number + "쪽]\n" + p.content;
      sourcesData.push({
        document_id: p.document_id,
        doc_name: p.doc_name,
        page_number: p.page_number,
        content: p.content, // <--- Here is the fix! We add content so it can be summarized.
        score: p.score
      });
    });

    const systemInstruction = "이 앱은 일반적인 LLM이 아니라 '업로드된 규정집 기반 Q&A 시스템'이다.\n다음 규칙을 엄격히 준수하라:\n- 업로드된 문서에서 검색된 내용만 근거로 답변한다.\n- 모델 자체의 일반 지식을 사용하여 규정을 추정하지 않는다.\n- 검색 결과에 답이 없으면 '업로드된 규정집에서 확인할 수 없습니다.'라고 답한다.\n- 법령이나 규정을 임의로 만들어내지 않는다.\n- 존재하지 않는 조항 번호를 생성하지 않는다.\n- 검색 결과의 페이지 번호만 근거로 표시하고, 추측하지 마라.\n- 불확실한 경우 반드시 불확실하다고 표시한다.\n- 여러 규정이 충돌하는 경우 각각의 근거를 제시하고 단정하지 않는다.\n\n[절대 준수 출력 규칙]\n1. 형식적인 인사말(안녕하세요 등)과 마무리 당부말(도움이 되길 바랍니다 등)은 절대 출력하지 마라.\n2. 마크다운 기호인 '#' 또는 '*' 문자를 절대 사용하지 마라. 대신 번호(1. 2.)나 일반 텍스트를 활용하고, 너무 짧은 개조식보다는 자연스럽고 친절한 문장으로 풀어서 상세히 설명하라.\n\n답변은 다음 텍스트 구조로 작성하라:\n[핵심 답변]\n(질문에 대한 친절하고 구체적인 답변)\n\n[근거]\n(문서명 OO쪽, 관련 조항 또는 문단 등)\n\n[상세 설명]\n(구체적인 절차, 예외 사항 등을 알기 쉽게 풀어서 자세히 설명)";

    const prompt = "사용자 질문: " + question + "\n\n[검색된 문서 Context]\n" + contextText + "\n\n위 Context만을 바탕으로 사용자의 질문에 답해주세요.";
    
    let responseText = '';
    if (topPages.length === 0) {
      responseText = "업로드된 규정집에서 확인할 수 없습니다.";
    } else {
      // 히스토리는 위에서 구성

            const genAI = new GoogleGenerativeAI(apiKey);
      const latestModelName = await getFlashModel(apiKey);
      
      const chatModel = genAI.getGenerativeModel({
        model: latestModelName,
        systemInstruction: systemInstruction
      });

      // 제미나이 히스토리 포맷에 맞게 변환
      const geminiHistory = [];
      if (chatId) {
        const historyRows = db.prepare("SELECT role, content FROM rule_messages WHERE chat_id = ? ORDER BY id ASC LIMIT 10").all(chatId) as any[];
        historyRows.forEach(row => {
          geminiHistory.push({
            role: row.role === 'ai' ? 'model' : 'user',
            parts: [{ text: row.content }]
          });
        });
        
        // Gemini API는 첫 번째가 반드시 user여야 함
        while(geminiHistory.length > 0 && geminiHistory[0].role !== 'user') {
          geminiHistory.shift();
        }
      }

      const chatSession = chatModel.startChat({ history: geminiHistory });
      const result = await chatSession.sendMessage(prompt);
      responseText = result.response.text();
    }

    if (!chatId) {
      const title = question.length > 20 ? question.substring(0, 20) + '...' : question;
      const cInfo = db.prepare("INSERT INTO rule_chats (title) VALUES (?)").run(title);
      chatId = cInfo.lastInsertRowid as number;
    } else {
      db.prepare("UPDATE rule_chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(chatId);
    }

    db.prepare("INSERT INTO rule_messages (chat_id, role, content) VALUES (?, ?, ?)").run(chatId, 'user', question);
    db.prepare("INSERT INTO rule_messages (chat_id, role, content, sources) VALUES (?, ?, ?, ?)").run(chatId, 'ai', responseText, JSON.stringify(sourcesData));

    return { success: true, data: { chat_id: chatId, response: responseText, sources: sourcesData } };
  } catch (error: any) {
    console.error("API Error in askQuestion:", error);
    return { success: false, error: error.message };
  }
})
}
