const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');
code = code.replace('is_dday?: number }', 'is_dday?: number; description?: string }');
fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
