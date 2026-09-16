const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

code = code.replace(/getMonthSchedules/g, 'getMonth');

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Fixed getMonth call');
