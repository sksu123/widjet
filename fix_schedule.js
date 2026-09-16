const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');
code = code.replace('is_completed: number }', 'is_completed: number; is_dday?: number }');
fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
