const fs = require('fs');
let code = fs.readFileSync('src/main/ipc/rule_ai.handler.ts', 'utf8');

// replace the console log I just added
code = code.replace(/console\.log\(\\[Gemini API\]\\ndisplayName: \$\{AI_CONFIG\.models\.complex\.displayName\}\\napiModel: \$\{selectedModelName\}\\);\n/, "");

// Re-insert dynamically
const qStr = "const chatSession = chatModel.startChat({ history });";
const newLog = 
    const isComplex = selectedModelName === AI_CONFIG.models.complex.apiModel;
    console.log('[Gemini API]\\ndisplayName: ' + (isComplex ? AI_CONFIG.models.complex.displayName : AI_CONFIG.models.general.displayName) + '\\napiModel: ' + selectedModelName);
;
code = code.replace(qStr, newLog + qStr);
fs.writeFileSync('src/main/ipc/rule_ai.handler.ts', code);
