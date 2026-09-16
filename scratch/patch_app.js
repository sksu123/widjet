const fs = require('fs');
let app = fs.readFileSync('d:/widget/src/renderer/src/App.tsx', 'utf8');

if (!app.includes('RuleAi')) {
  app = app.replace(
    "import AIAssistant from './pages/AIAssistant/AIAssistant'",
    "import AIAssistant from './pages/AIAssistant/AIAssistant'\nimport RuleAi from './pages/RuleAi/RuleAi'"
  );
  app = app.replace(
    '<Route path="ai" element={<AIAssistant />} />',
    '<Route path="ai" element={<AIAssistant />} />\n          <Route path="rule-ai" element={<RuleAi />} />'
  );
  fs.writeFileSync('d:/widget/src/renderer/src/App.tsx', app, 'utf8');
  console.log('App.tsx patched with RuleAi');
}
