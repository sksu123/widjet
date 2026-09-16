const fs = require('fs');

let sidebar = fs.readFileSync('d:/widget/src/renderer/src/components/Sidebar/Sidebar.tsx', 'utf8');
if (!sidebar.includes('규정·매뉴얼 AI')) {
  sidebar = sidebar.replace(
    '<SidebarItem icon={<Bot size={20} />} label="공문서 AI 교정기" to="/ai" isCollapsed={isCollapsed} />',
    '<SidebarItem icon={<Bot size={20} />} label="공문서 AI 교정기" to="/ai" isCollapsed={isCollapsed} />\n        <SidebarItem icon={<Search size={20} />} label="규정·매뉴얼 AI" to="/rule-ai" isCollapsed={isCollapsed} />'
  );
  if(!sidebar.includes('Search')) {
    sidebar = sidebar.replace('import { Home, Calendar as CalendarIcon, Briefcase, FileText, CreditCard, Bot, Settings, ChevronLeft, ChevronRight, Calculator, Package } from \'lucide-react\'', 'import { Home, Calendar as CalendarIcon, Briefcase, FileText, CreditCard, Bot, Settings, ChevronLeft, ChevronRight, Calculator, Package, Search } from \'lucide-react\'');
  }
  fs.writeFileSync('d:/widget/src/renderer/src/components/Sidebar/Sidebar.tsx', sidebar, 'utf8');
}

let app = fs.readFileSync('d:/widget/src/renderer/src/App.tsx', 'utf8');
if (!app.includes('RuleAi')) {
  app = app.replace(
    'import AIAssistant from \'./pages/AIAssistant/AIAssistant\'',
    'import AIAssistant from \'./pages/AIAssistant/AIAssistant\'\nimport RuleAi from \'./pages/RuleAi/RuleAi\''
  );
  app = app.replace(
    '<Route path="/ai" element={<AIAssistant />} />',
    '<Route path="/ai" element={<AIAssistant />} />\n          <Route path="/rule-ai" element={<RuleAi />} />'
  );
  fs.writeFileSync('d:/widget/src/renderer/src/App.tsx', app, 'utf8');
}

console.log('UI update done');
