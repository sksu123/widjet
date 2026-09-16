const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

if (!code.includes("import DdayPanel from '../../components/DdayPanel/DdayPanel'")) {
  code = code.replace("import FavoritesWidget from '../../components/FavoritesWidget/FavoritesWidget'", "import FavoritesWidget from '../../components/FavoritesWidget/FavoritesWidget'\\nimport DdayPanel from '../../components/DdayPanel/DdayPanel'");
}

const memoBlockStart = code.indexOf('{/* 메모 보드 */}');
const contactsBlockStart = code.indexOf('{/* 주요 연락처 검색 (좌우 분할 배치) */}');

let memoBlock = code.substring(memoBlockStart, contactsBlockStart);

// Replace the wrapping card for memo to remove min-h-[300px] since we put it on the wrapper
memoBlock = memoBlock.replace('min-h-[300px] relative', 'relative');

const newWrapper = \{/* D-Day & 메모 보드 (가로 배치) */}
        <div className="flex gap-4 min-h-[300px]">
          <div className="flex-1 flex flex-col min-w-0">
            <DdayPanel />
          </div>
          <div className="flex-1 flex flex-col min-w-0">
            \ + memoBlock.trim() + \
          </div>
        </div>\\n\\n        \;

code = code.substring(0, memoBlockStart) + newWrapper + code.substring(contactsBlockStart);

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Updated Dashboard Layout');
