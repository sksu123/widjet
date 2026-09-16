const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/types/api.ts', 'utf8');
if (!code.includes('is_dday?: number')) {
  code = code.replace('is_completed?: number', 'is_completed?: number;\n  is_dday?: number');
  fs.writeFileSync('src/renderer/src/types/api.ts', code);
  console.log('Fixed api.ts');
}
