const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/RuleAi/RuleAi.tsx', 'utf8');
const target = <h1 className="text-xl font-bold flex items-center gap-2">
          <Search className="w-6 h-6 text-blue-600" />
          규정·매뉴얼 AI
        </h1>;
const repl = <div className="flex flex-col">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Search className="w-6 h-6 text-blue-600" />
            규정·매뉴얼 AI
          </h1>
          <p className="text-xs text-slate-500 mt-1">먼저 문서관리에서 참고 규정과 매뉴얼을 업로드 하시고, 여러개의 규정을 동시에 넣을 수 있습니다.</p>
        </div>;
code = code.replace(target, repl);
fs.writeFileSync('src/renderer/src/pages/RuleAi/RuleAi.tsx', code);
