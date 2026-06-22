import { ipcMain } from 'electron'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getDb } from '../db/database'

let genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get() as { value: string } | undefined
  const apiKey = row?.value || process.env.GEMINI_API_KEY || ''

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
- 단계별로 명확하게 설명하세요
- 실무에 바로 적용 가능한 답변을 제공하세요
- 불확실한 내용은 확인 필요함을 명시하세요
- 답변은 한국어로 제공하세요`

export function registerAiHandlers(): void {
  // 일반 AI 채팅
  ipcMain.handle('ai:chat', async (_, messages: Array<{ role: string; content: string }>, category: string) => {
    try {
      const ai = getGenAI()
      const model = ai.getGenerativeModel({
        model: 'gemini-3.1-flash-lite',
        systemInstruction: SYSTEM_PROMPT
      })

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
      const result = await chat.sendMessage(lastMsg.content)
      const text = result.response.text()

      // 대화 기록 저장
      const db = getDb()
      const sessionId = messages[0]?.content.substring(0, 20) || 'session'
      db.prepare(`INSERT INTO chat_history (session_id, role, content, category) VALUES (?, ?, ?, ?)`).run(sessionId, 'user', lastMsg.content, category || 'general')
      db.prepare(`INSERT INTO chat_history (session_id, role, content, category) VALUES (?, ?, ?, ?)`).run(sessionId, 'assistant', text, category || 'general')

      return { success: true, text }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 예산과목 추천 (에듀파인)
  ipcMain.handle('ai:recommend-budget', async (_, data: { projectName: string; item: string; amount: number }) => {
    try {
      const ai = getGenAI()
      const model = ai.getGenerativeModel({ model: 'gemini-3.1-flash-lite', systemInstruction: SYSTEM_PROMPT })
      const prompt = `다음 지출 건에 대해 K-에듀파인 예산과목을 추천해주세요:
사업명: ${data.projectName}
품목: ${data.item}
금액: ${data.amount.toLocaleString()}원

다음 형식으로 답변해주세요:
1. 추천 예산과목 (세목까지)
2. 지출품의 작성 시 주의사항
3. 집행 가능 여부 검토 의견
4. 관련 규정`

      const result = await model.generateContent(prompt)
      return { success: true, text: result.response.text() }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 공문 초안 생성
  ipcMain.handle('ai:draft-document', async (_, data: { type: string; context: string }) => {
    try {
      const ai = getGenAI()
      const model = ai.getGenerativeModel({ model: 'gemini-3.1-flash-lite', systemInstruction: SYSTEM_PROMPT })
      const prompt = `다음 조건에 맞는 공문/문서 초안을 작성해주세요:
문서 유형: ${data.type}
상황 설명: ${data.context}

실제 업무에서 사용 가능한 수준으로 작성해주세요.`

      const result = await model.generateContent(prompt)
      return { success: true, text: result.response.text() }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 음성 텍스트 처리
  ipcMain.handle('ai:process-voice', async (_, text: string) => {
    try {
      const ai = getGenAI()
      const model = ai.getGenerativeModel({ model: 'gemini-3.1-flash-lite', systemInstruction: SYSTEM_PROMPT })
      const prompt = `사용자가 음성으로 다음을 말했습니다: "${text}"
이 요청에 대해 간결하고 실용적으로 답변해주세요.`

      const result = await model.generateContent(prompt)
      return { success: true, text: result.response.text() }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 날씨 기반 행정 요약
  ipcMain.handle('ai:weather-summary', async (_, weatherData: any) => {
    try {
      const ai = getGenAI()
      const model = ai.getGenerativeModel({ model: 'gemini-3.1-flash-lite', systemInstruction: SYSTEM_PROMPT })
      const prompt = `다음은 오늘 우리 동네 날씨 정보입니다:
지역: ${weatherData.city}
현재 온도: ${weatherData.temp}
날씨 상태: ${weatherData.description}
미세먼지: ${weatherData.pm10}
초미세먼지: ${weatherData.pm25}
오존: ${weatherData.ozone}

이 날씨 정보를 바탕으로 학교 행정실 업무(현장체험학습 점검, 시설물 안전, 등하교 안전, 미세먼지 대응 등)와 연계된 간단한 안내/경고 문구를 1~2문장으로 작성해주세요.
예시 형식: "오늘 담양은 흐리고 오후 강수확률이 높습니다. 우산을 준비하고 시설물 배수로를 점검하세요."`

      const result = await model.generateContent(prompt)
      return { success: true, text: result.response.text() }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })
}
