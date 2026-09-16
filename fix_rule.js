const fs = require('fs');
let code = fs.readFileSync('src/main/ipc/rule_ai.handler.ts', 'utf8');

code = code.replace(/const AI_CONFIG = \{[\s\S]*?\};/, "import { AI_CONFIG } from './ai_config'");
code = code.replace(/AI_CONFIG\.GENERAL_MODEL/g, "AI_CONFIG.models.general.apiModel");
code = code.replace(/AI_CONFIG\.COMPLEX_MODEL/g, "AI_CONFIG.models.complex.apiModel");
code = code.replace(/AI_CONFIG\.EMBEDDING_MODEL/g, "AI_CONFIG.embedding.apiModel");

// Also add console.log before generating content
const qStr = "const chatSession = chatModel.startChat({ history });";
if(code.includes(qStr)) {
  code = code.replace(qStr, "console.log([Gemini API]\\ndisplayName: \\napiModel: );\n" + qStr);
}

// Ensure 404 does not hide detail UI. Actually that's on frontend. We just return error.
fs.writeFileSync('src/main/ipc/rule_ai.handler.ts', code);
