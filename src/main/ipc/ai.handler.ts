import { AI_CONFIG } from './ai_config';
import { ipcMain } from 'electron'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getDb } from '../db/database'


// 지수 백오프 기반 재시도 함수
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isRetryable = err?.status === 429 || err?.status === 503 || err?.message?.includes('429') || err?.message?.includes('503') || err?.message?.includes('quota');
      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }
      // 2초, 4초, 8초 대기
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[Retry] ${err?.status || 'Error'} 발생. ${delay}ms 후 재시도 (시도 ${attempt}/${maxRetries})...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('재시도 한도 초과');
}

let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as { value: string } | undefined
  const apiKey = (row?.value || process.env.GEMINI_API_KEY || '').trim()

  if (!apiKey) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.')
  }

  if (!genAI || true) { // 매번 최신 키 사용
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

// 학교 행정 전문 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 대한민국 학교 행정실 전문 AI 비서입니다.
20년 이상의 학교 행정 경험을 바탕으로 다음 분야에서 전문적인 도움을 제공합니다:

1. 학교 회계 및 예산 집행 (K-에듀파인 기준)
2. 공문서 작성 (행정업무 규정 준수)
3. 계약업무 (학교시설사업소 공사계약 일반조건 등)
4. 물품관리 (물품관리법 준수)
5. 출장여비 (공무원 여비규정)
6. 인사 및 급여 관련 업무
7. 학교운영위원회 운영
8. 감사 대비 체크리스트
9. 각종 행정 절차 안내

답변 시 주의사항:
- 관련 법령, 규정, 지침을 정확히 인용하세요
- 단계별로 명확하고 상세하게 설명하세요
- 실무에 바로 적용 가능하도록 구체적인 예시나 자세한 풀이를 제공하세요
- 불확실한 내용은 확인 필요함을 명시하세요
- 답변은 한국어로 제공하세요

절대 준수 규칙:
- "안녕하세요", "무엇을 도와드릴까요" 같은 형식적인 인사말은 출력하지 마세요.
- "도움이 되셨길 바랍니다", "추가로 궁금한 점이 있으시면" 같은 형식적인 마무리 문구도 출력하지 마세요.
- 마크다운 기호인 '#' (제목) 및 '*' (글머리 기호) 문자를 절대 사용하지 마세요. 너무 딱딱한 개조식보다는 부드러운 줄글이나 숫자(1. 2.) 기호를 사용하여 친절하고 자세하게 설명하세요.`


let cachedFlashModel = '';
async function getLatestFlashModel(apiKey: string): Promise<string> {
  // 1순위: 사용자가 수동으로 선택한 모델 (DB에서 매번 읽어와 최신값 반영)
  try {
    const db = getDb();
    const prefRow = db.prepare("SELECT value FROM settings WHERE key = 'gemini_model_preference'").get() as { value: string } | undefined;
    const pref = prefRow?.value;
    if (pref && pref !== 'auto' && pref.trim() !== '') {
      console.log('[Model] 사용자 수동 선택 모델 사용:', pref);
      return pref.trim();
    }
  } catch (e) {
    console.error('[Model] DB 설정 읽기 실패:', e);
  }

  // 2순위: 캐시된 자동 탐색 결과
  if (cachedFlashModel) return cachedFlashModel;

  // 3순위: API로 최신 모델 자동 탐색
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    if (data && data.models) {
      const flashModels = data.models.filter((m: any) =>
        m.name.includes('flash') &&
        m.supportedGenerationMethods?.includes('generateContent') &&
        !m.name.includes('exp')
      );
      flashModels.sort((a: any, b: any) => {
        const numA = parseFloat((a.name.match(/\d+(\.\d+)?/) || ['0'])[0]);
        const numB = parseFloat((b.name.match(/\d+(\.\d+)?/) || ['0'])[0]);
        return numB - numA;
      });
      if (flashModels.length > 0) {
        cachedFlashModel = flashModels[0].name.replace('models/', '');
        console.log('[Model] 자동 선택 모델:', cachedFlashModel);
        return cachedFlashModel;
      }
    }
  } catch (e) {
    console.error('[Model] 모델 목록 조회 실패:', e);
  }

  // 4순위: 최종 fallback
  return 'gemini-3.5-flash';
}

// Lite 모델: 행정비서·예산추천·일정분석 등 빠른 응답이 필요한 기능용
// 사용자 선택 모델에서 '-lite' 버전을 파생하거나, 직접 lite 모델 반환
async function getLiteFlashModel(apiKey: string): Promise<string> {
  const baseModel = await getLatestFlashModel(apiKey);
  // 이미 lite이면 그대로 반환
  if (baseModel.includes('lite')) return baseModel;
  // gemini-X.X-flash → gemini-X.X-flash-lite 형태로 변환
  const liteVariant = baseModel + '-lite';
  // lite 버전 존재 여부 확인 (없으면 base 그대로 사용)
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${liteVariant}?key=${apiKey}`);
    if (res.ok) {
      console.log('[Model] Lite 모델 사용:', liteVariant);
      return liteVariant;
    }
  } catch (_) { /* lite 미지원 시 base 사용 */ }
  console.log('[Model] Lite 없어 base 모델 사용:', baseModel);
  return baseModel;
}

function getGeminiApiKey(): string {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as { value: string } | undefined;
  return (row?.value || process.env.GEMINI_API_KEY || '').trim();
}

export function registerAiHandlers(): void {
  // 일반 AI 채팅
  ipcMain.handle('ai:chat', async (_, messages: Array<{ role: string; content: string }>, category: string) => {
    try {
      const ai = getGenAI()
      const apiKey = getGeminiApiKey();
      const latestModel = await getLiteFlashModel(apiKey); // 행정비서: Lite 모델
      const model = ai.getGenerativeModel({ model: latestModel, systemInstruction: SYSTEM_PROMPT })

      let history = messages.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))

      // Gemini API는 첫 번째 기록이 반드시 'user'여야 합니다.
      while (history.length > 0 && history[0].role !== 'user') {
        history.shift()
      }

      const chat = model.startChat({ history })
      const lastMsg = messages[messages.length - 1]
      console.log(`[Gemini API]\ndisplayName: ${'Gemini Dynamic Flash'}\napiModel: ${latestModel}`);
        const result = await withRetry(() => chat.sendMessage(lastMsg.content))
      const text = result.response.text()

      // 대화 기록 저장
      const db = getDb()
      const sessionId = messages[0]?.content.substring(0, 20) || 'session'
      db.prepare(`INSERT INTO chat_history (session_id, role, content, category) VALUES (?, ?, ?, ?)`).run(sessionId, 'user', lastMsg.content, category || 'general')
      db.prepare(`INSERT INTO chat_history (session_id, role, content, category) VALUES (?, ?, ?, ?)`).run(sessionId, 'assistant', text, category || 'general')

      return { success: true, text }
    } catch (err: any) {
        console.error('[API Error] requested model:', typeof latestModel !== 'undefined' ? latestModel : 'unknown', 'status:', err?.status || 'N/A', 'message:', err?.message || String(err));
        return { success: false, error: 'AI 행정비서 응답 중 오류가 발생했습니다.\n(상세: ' + (err?.message || String(err)) + ')' };
      }
  })

  // 예산과목 추천 (에듀파인)
  ipcMain.handle('ai:recommend-budget', async (_, data: { projectName: string; item: string; amount: number }) => {
    try {
      const ai = getGenAI()
      const apiKey = getGeminiApiKey();
      const latestModel = await getLiteFlashModel(apiKey); // 예산추천: Lite 모델
      const model = ai.getGenerativeModel({ model: latestModel, systemInstruction: SYSTEM_PROMPT })
      const prompt = `다음 지출 건에 대해 K-에듀파인 예산과목을 추천해주세요:
사업명: ${data.projectName}
품목: ${data.item}
금액: ${data.amount.toLocaleString()}원

다음 형식으로 답변해주세요. 반드시 [AI추천결과] 와 [기안문예시] 라는 구분자를 사용하여 두 부분을 나누어 작성하세요.

[AI추천결과]
1. 추천 예산과목 (세목까지)
2. 지출품의 작성 시 주의사항
3. 집행 가능 여부 검토 의견
4. 관련 규정

[기안문예시]
(입력된 사업명, 품목, 금액을 바탕으로 에듀파인에 바로 복사해서 쓸 수 있는 형태의 기안문 작성. 아래와 같은 형식으로 작성할 것)

[제목] ${data.projectName} 관련 ${data.item} 구입 품의(예시)

1. 관련: (관련 근거 또는 내부 결재 문서 번호 기재)
2. ${data.projectName}을(를) 위하여 아래와 같이 ${data.item}을(를) 구입하고자 합니다.
  가. 건명: ${data.projectName}을(를) 위한 ${data.item} 구입
  나. 내역: ${data.item} (세부내용 기재)
  다. 소요금액: 금${data.amount.toLocaleString()}원(금액 한글 기재)
  라. 예산과목: (추천된 예산과목 기재)

붙임: 1. 견적서 1부. 
      2. 산출내역서 1부.  끝.`

      console.log(`[Gemini API]\ndisplayName: ${'Gemini Dynamic Flash'}\napiModel: ${latestModel}`);
        const result = await withRetry(() => model.generateContent(prompt))
      return { success: true, text: result.response.text(), data: result.response.text() }
    } catch (err: any) {
        console.error('[API Error] requested model:', typeof latestModel !== 'undefined' ? latestModel : 'unknown', 'status:', err?.status || 'N/A', 'message:', err?.message || String(err));
        return { success: false, error: '예산 과목 추천 중 오류가 발생했습니다.\n(상세: ' + (err?.message || String(err)) + ')' };
      }
  })

  // 공문 초안 생성
  ipcMain.handle('ai:draft-document', async (_, data: { type: string; context: string }) => {
    try {
      const ai = getGenAI()
      const apiKey = getGeminiApiKey();
      const latestModel = await getLatestFlashModel(apiKey);
      const model = ai.getGenerativeModel({ model: latestModel, systemInstruction: SYSTEM_PROMPT })
      const prompt = `다음 조건에 맞는 공문/문서 초안을 작성해주세요:
문서 유형: ${data.type}
상황 설명: ${data.context}

실제 업무에서 사용 가능한 수준으로 작성해주세요.`

      console.log(`[Gemini API]\ndisplayName: ${'Gemini Dynamic Flash'}\napiModel: ${latestModel}`);
        const result = await withRetry(() => model.generateContent(prompt))
      return { success: true, text: result.response.text(), data: result.response.text() }
    } catch (err: any) {
        console.error('[API Error] requested model:', typeof latestModel !== 'undefined' ? latestModel : 'unknown', 'status:', err?.status || 'N/A', 'message:', err?.message || String(err));
        return { success: false, error: '공문 초안 생성 중 오류가 발생했습니다.\n(상세: ' + (err?.message || String(err)) + ')' };
      }
  })

  // 음성 텍스트 처리
  ipcMain.handle('ai:process-voice', async (_, text: string) => {
    try {
      const ai = getGenAI()
      const apiKey = getGeminiApiKey();
      const latestModel = await getLiteFlashModel(apiKey); // 음성처리: Lite 모델
      const model = ai.getGenerativeModel({ model: latestModel, systemInstruction: SYSTEM_PROMPT })
      const prompt = `사용자가 음성으로 다음을 말했습니다: "${text}"
이 요청에 대해 간결하고 실용적으로 답변해주세요.`

      console.log(`[Gemini API]\ndisplayName: ${'Gemini Dynamic Flash'}\napiModel: ${latestModel}`);
        const result = await withRetry(() => model.generateContent(prompt))
      return { success: true, text: result.response.text(), data: result.response.text() }
    } catch (err: any) {
        console.error('[API Error] requested model:', typeof latestModel !== 'undefined' ? latestModel : 'unknown', 'status:', err?.status || 'N/A', 'message:', err?.message || String(err));
        return { success: false, error: '음성 처리 중 오류가 발생했습니다.\n(상세: ' + (err?.message || String(err)) + ')' };
      }
  })

  // 공문서 교정
  ipcMain.handle('ai:proofread-document', async (_, text: string, includeTable?: boolean) => {
    try {
      // 문서 분석기 연동
      const currentYear = new Date().getFullYear();
      let analysisText = '';
      try {
        const { analyzeDocument } = require('./docAnalyzer');
        const analysis = analyzeDocument(text, currentYear);
        if (analysis.dates.length > 0 || analysis.persons.length > 0) {
          analysisText += '\n[사전 분석 데이터 (팩트 체크용)]\n';
          if (analysis.dates.length > 0) {
            analysisText += `- 발견된 날짜 표기 검증 결과 (기준연도: ${currentYear}):\n`;
            analysis.dates.forEach((d: any) => {
              analysisText += `  * 원문: "${d.match}" -> ${d.isValid ? '✅ 정상 (요일 일치)' : `❌ 오류 (실제 요일은 '${d.actualWeekday}'요일임)`}\n`;
            });
          }
          if (analysis.persons.length > 0) {
            analysisText += `\n- 인물명 확인 요청 대상:\n`;
            analysis.persons.forEach((p: any) => {
              analysisText += `  * ${p.role}: ${p.name} (문맥: "${p.context}")\n`;
            });
          }
          analysisText += `\n위 사전 분석 데이터를 반드시 참고하여 '교정 내용 상세 설명' 부분에 표 또는 마크다운 목록 형태로 포함하여 사용자에게 경고해 주세요.\n`;
        }
      } catch(e) {
        console.error('Doc Analyzer Error:', e);
      }

      const ai = getGenAI()
      const apiKey = getGeminiApiKey();
      const latestModel = await getLatestFlashModel(apiKey);
      const model = ai.getGenerativeModel({ model: latestModel, systemInstruction: SYSTEM_PROMPT })
      const prompt = `다음 작성된 공문서 텍스트를 철저하게 교정해 주세요.
아래 4가지 기준과 [사전 분석 데이터]를 바탕으로 교정하고, 결과는 [교정된 텍스트] 와 [교정 내용 상세 설명] 두 부분으로 명확하게 나누어 출력해 주세요.

[교정 기준]
1. 맞춤법 및 공문서 표준 용어: 띄어쓰기, 오탈자 교정.
2. 날짜 및 요일 교차 검증: 사전 분석 데이터를 바탕으로 틀린 요일이나 과거 연도를 명확히 지적. (예: 2026. 3. 17.(화) -> 실제 요일인 수요일로 정정 등)
3. 명칭 일관성 및 서식: 중복 표현 제거 및 공공기관 서식 규격 준수.
4. 인물명 확인 (중요): 사전 분석 데이터에 추출된 사람이 있다면, "현재 담당자(책임자)가 맞는지 확인이 필요하다"는 경고를 교정 내용 상세 설명 하단에 눈에 띄게 포함.

${includeTable ? '5. 표 변환 (옵션): 입력된 내용 중 항목별 비교, 일정, 인원 명단 등 표로 정리하면 가독성이 좋아지는 내용은 적극적으로 마크다운 표(Table) 양식으로 변환하여 정리해 주세요.\n' : ''}\n[절대 준수 출력 규칙]
1. 인사말(안녕하세요 등)과 마무리 당부말(도움이 되길 바랍니다 등)은 절대 출력하지 마세요.
2. 제목이나 목록 기호로 '#' 또는 '*' 문자를 절대 사용하지 말고 심플하게 작성하세요.

[원본 텍스트]
${text}
${analysisText}`

      console.log(`[Gemini API]\ndisplayName: ${'Gemini Dynamic Flash'}\napiModel: ${latestModel}`);
        const result = await withRetry(() => model.generateContent(prompt))
      return { success: true, text: result.response.text(), data: result.response.text() }
    } catch (err: any) {
        console.error('[API Error] requested model:', typeof latestModel !== 'undefined' ? latestModel : 'unknown', 'status:', err?.status || 'N/A', 'message:', err?.message || String(err));
        return { success: false, error: 'AI 교정 서비스 연결 중 오류가 발생했습니다.\n(상세: ' + (err?.message || String(err)) + ')' };
      }
  })

  // 대화 기록 조회
  ipcMain.handle('ai:get-history', async (_, limit = 50) => {
    try {
      const db = getDb()
      const rows = db.prepare(`
        SELECT * FROM chat_history 
        ORDER BY created_at DESC 
        LIMIT ?
      `).all(limit)
      return { success: true, data: rows }
    } catch (err: any) { console.error('ai:get-history error', err); return { success: false, error: err?.message || String(err) }; }
  })

  // 날씨 기반 행정 요약
  ipcMain.handle('ai:weather-summary', async (_, weatherData: any) => {
    try {
      const ai = getGenAI()
      const apiKey = getGeminiApiKey();
      const latestModel = await getLiteFlashModel(apiKey); // 날씨요약: Lite 모델
      const model = ai.getGenerativeModel({ model: latestModel, systemInstruction: SYSTEM_PROMPT })
      const prompt = `다음은 오늘 우리 동네 날씨 정보입니다:
지역: ${weatherData.city}
현재 온도: ${weatherData.temp}
날씨 상태: ${weatherData.description}
미세먼지: ${weatherData.pm10}
초미세먼지: ${weatherData.pm25}
오존: ${weatherData.ozone}

이 날씨 정보를 바탕으로 학교 행정실 업무(현장체험학습 점검, 시설물 안전, 등하교 안전, 미세먼지 대응 등)와 연계된 간단한 안내/경고 문구를 1~2문장으로 작성해주세요.
예시 형식: "오늘 담양은 흐리고 오후 강수확률이 높습니다. 우산을 준비하고 시설물 배수로를 점검하세요."

절대 주의사항: 인사말이나 마무리 문구를 쓰지 말고 심플하게 결과만 출력하세요.`

      console.log(`[Gemini API]\ndisplayName: ${'Gemini Dynamic Flash'}\napiModel: ${latestModel}`);
        const result = await withRetry(() => model.generateContent(prompt))
      return { success: true, text: result.response.text(), data: result.response.text() }
    } catch (err: any) {
        console.error('[API Error] requested model:', typeof latestModel !== 'undefined' ? latestModel : 'unknown', 'status:', err?.status || 'N/A', 'message:', err?.message || String(err));
        return { success: false, error: '날씨 요약 중 오류가 발생했습니다.\n(상세: ' + (err?.message || String(err)) + ')' };
      }
  })

  ipcMain.handle('ai:parse-schedule', async (_, text: string) => {
    try {
      const ai = getGenAI()
      const apiKey = getGeminiApiKey();
      const latestModel = await getLiteFlashModel(apiKey); // 일정분석: Lite 모델
      const model = ai.getGenerativeModel({ model: latestModel })

      const prompt = `
당신은 학교 행정실의 똑똑한 AI 비서입니다.
사용자가 공문서 텍스트를 붙여넣었습니다. 이 텍스트를 분석하여 일정 관리에 등록할 수 있도록 제출 내용, 제출처, 제출 기한(날짜)을 추출해주세요.

조건:
- 반드시 유효한 JSON 형식으로만 응답하세요. (마크다운 태그 없이 순수 JSON만 반환)
- 결과 객체는 다음 필드를 가져야 합니다:
  - "title": 일정 제목 (주로 제출할 내용 요약, 예: "2024년 1차 학교폭력 실태조사 결과 제출")
  - "description": 상세 설명 및 제출처 (예: "제출처: 교육지원청 학생생활지원과")
  - "start_date": 기한 날짜 (YYYY-MM-DD 형식. 정확한 연도가 없으면 올해 연도를 사용)
  - "is_dday": 1 (제출 기한이 명확히 있는 경우 1, 일반적인 내용이면 0)
- 날짜는 YYYY-MM-DD 형식이어야 하며, 텍스트에 "24일까지"와 같이 월이 없으면 현재 월을 기준으로 파악하세요. 

[공문서 내용]
${text}
`

      console.log(`[Gemini API]\ndisplayName: ${'Gemini Dynamic Flash'}\napiModel: ${latestModel}`);
        const result = await withRetry(() => model.generateContent(prompt))
      const textResult = result.response.text()
      const jsonStr = textResult.replace(/\s*```json/g, '').replace(/```/g, '').trim()
      
      try {
        const parsed = JSON.parse(jsonStr)
        return { success: true, data: parsed }
      } catch(e) {
        return { success: false, error: 'JSON 파싱 실패' }
      }
    } catch (error: any) {
      console.error('AI Schedule Parse error:', error)
      return { success: false, error: error.message || 'AI 분석 중 오류가 발생했습니다.' }
    }
  })

}
