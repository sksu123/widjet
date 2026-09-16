const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/components/DdayPanel/DdayPanel.tsx', 'utf8');

code = code.replace('card flex flex-col p-4 shrink-0 bg-white', 'card flex flex-col p-4 shrink-0 h-full bg-white');
fs.writeFileSync('src/renderer/src/components/DdayPanel/DdayPanel.tsx', code);
