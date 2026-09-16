const Database = require('better-sqlite3');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testProofread() {
  const db = new Database('D:/widget/database.sqlite');
  const row = db.prepare(\"SELECT value FROM settings WHERE key = 'gemini_api_key'\").get();
  const apiKey = row ? row.value : process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No API key found!');
    return;
  }
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const SYSTEM_PROMPT = \당신은 대한민국 학교 행정실 전문 AI 비서입니다.
20년 이상의 학교 행정 경험을 바탕으로 다음 분야에서 전문적인 도움을 제공합니다:
1. 학교 회계 및 예산 집행 (K-에듀파인 기준)
2. 공문서 작성 (행정업무 규정 준수)\; // abbreviated

  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite', systemInstruction: SYSTEM_PROMPT });
  const text = '이 문서는 결제가 않되어씁니다. 빨리 처리바람.';
  const prompt = \다음 작성된 공문서 텍스트를 철저하게 교정해 주세요.
아래 4가지 기준을 바탕으로 교정하고, 결과는 [교정된 텍스트] 와 [교정 내용 상세 설명] 두 부분으로 명확하게 나누어 출력해 주세요.

1. 맞춤법 및 표준 문장 부호 제안: 띄어쓰기, 맞춤법 오류 수정. 쌍점(:) 등 공문서 표준 문장 부호 준수.
2. 행정 용어 순화: 권위적이거나 어려운 한자어를 누구나 이해하기 쉬운 우리말로 순화.
3. 문장 간결화: 불필요한 수식어나 중복 표현을 제거하고 간결한 문장으로 다듬기.
4. 서식 규격: 공공기관 고유의 서식 규격(예: 끝. 표기, 번호 체계 등) 맞추기.

[원본 텍스트]
\\;

  try {
    const result = await model.generateContent(prompt);
    console.log('--- TEST RESULT ---');
    console.log(result.response.text());
  } catch (e) {
    console.error(e);
  }
}
testProofread();
