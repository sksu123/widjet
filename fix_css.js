const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/styles/index.css', 'utf8');

code = code.replace('user-select: none;', '/* user-select: none; removed to fix IME bug */');
fs.writeFileSync('src/renderer/src/styles/index.css', code);
console.log('Fixed CSS');
