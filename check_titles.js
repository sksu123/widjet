const fs = require('fs');
const path = require('path');
const p = 'src/renderer/src/pages';
const dirs = fs.readdirSync(p);
dirs.forEach(d => {
  const f = path.join(p, d, d + '.tsx');
  if(fs.existsSync(f)) {
    const code = fs.readFileSync(f, 'utf8');
    const match = code.match(/className="page-title">([^<]+)<\/h1>/);
    const pMatch = code.match(/<p className="text-xs"[^>]*>([^<]+)<\/p>/);
    if(match) {
      console.log(d + ': ' + match[1] + (pMatch ? ' | ' + pMatch[1] : ' | No description'));
    } else {
      console.log(d + ': No page-title');
    }
  }
});
