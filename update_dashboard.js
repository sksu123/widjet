const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

// 1. Remove the old small compact D-Day widget
const startWidget = code.indexOf('{/* 4. D-Day À§Á¬ (¼ÒÇü Àü±¤ÆÇ) */}');
if (startWidget !== -1) {
  const endWidget = code.indexOf('{/* =====', startWidget);
  code = code.substring(0, startWidget) + code.substring(endWidget);
}

// 2. Add DdayPanel to imports
if (!code.includes("import DdayPanel from '../../components/DdayPanel/DdayPanel'")) {
  code = code.replace("import FavoritesWidget from '../../components/FavoritesWidget/FavoritesWidget'", "import FavoritesWidget from '../../components/FavoritesWidget/FavoritesWidget'\nimport DdayPanel from '../../components/DdayPanel/DdayPanel'");
}

// 3. Insert DdayPanel into the right panel. Let's put it above FavoritesWidget.
const favIdx = code.indexOf('<FavoritesWidget />');
if (favIdx !== -1) {
  code = code.substring(0, favIdx) + "<DdayPanel />\n        " + code.substring(favIdx);
}

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Updated Dashboard');
