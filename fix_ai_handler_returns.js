const fs = require('fs');
let code = fs.readFileSync('src/main/ipc/ai.handler.ts', 'utf8');

code = code.replace(/return \{ success: true, text: result\.response\.text\(\) \}/g, "return { success: true, text: result.response.text(), data: result.response.text() }");

fs.writeFileSync('src/main/ipc/ai.handler.ts', code);
console.log('Fixed API returns');
