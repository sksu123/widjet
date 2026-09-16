const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

code = code.replace('is_dday?: number;', '');
code = code.replace(/\{s\.is_dday === 1 && <span className="font-bold text-red-500 mr-1">\[D-Day\]<\/span>\}/g, '');

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Removed legacy is_dday from Dashboard');
