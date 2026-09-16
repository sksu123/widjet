const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

const regex = /\{\/\* 4\. D-Day À§Á¬ \*\/\}[\s\S]*?\{\/\* =====/m;
code = code.replace(regex, "{/* =====");
fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Removed');
