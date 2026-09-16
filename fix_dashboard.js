const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

code = code.replace(
  /const \\[widgetsConfig, setWidgetsConfig\\] = useState\\(\\{\\s*weather: true,\\s*dday: true,\\s*today: true,\\s*summary: true,\\s*quick: true\\s*\\}\\)/,
  \const [widgetsConfig, setWidgetsConfig] = useState({
    weather: true,
    dday: true,
    today: true,
    summary: true,
    quick: true,
    favorites: true,
    memo: true,
    contacts: true
  })\
);

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Fixed widgetsConfig defaults');
