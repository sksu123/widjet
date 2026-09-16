const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/App.tsx', 'utf8');
code = code.replace(/import Documents from '\.\/pages\/Documents\/Documents'\r?\n/g, '');
code = code.replace(/<Route path="documents" element={<Documents \/>} \/>\r?\n/g, '');
fs.writeFileSync('src/renderer/src/App.tsx', code);
