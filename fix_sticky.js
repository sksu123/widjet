const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/components/StickyNote.tsx', 'utf8');

code = code.replace('Math.max(200, initialSize.current.h + dy)', 'Math.max(100, initialSize.current.h + dy)');
code = code.replace('Math.max(200, initialSize.current.w + dx)', 'Math.max(150, initialSize.current.w + dx)');

fs.writeFileSync('src/renderer/src/components/StickyNote.tsx', code);
console.log('Fixed StickyNote min height');
