const fs = require('fs');
let code = fs.readFileSync('src/main/ipc/rule_ai.handler.ts', 'utf8');
code = code.replace(/console\.log\(\[Gemini API\]\\ndisplayName:\s*\\napiModel:\s*\);/g, '');
code = code.replace(/console\.log\(\[Gemini API\]\ndisplayName: \napiModel: \);/g, '');
fs.writeFileSync('src/main/ipc/rule_ai.handler.ts', code);
