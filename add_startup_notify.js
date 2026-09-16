const fs = require('fs');
let code = fs.readFileSync('src/main/index.ts', 'utf8');

const importTarget = "import { getDb } from './db/database'";
if (!code.includes("import { Notification } from 'electron'")) {
  code = code.replace("import { app, shell, BrowserWindow, ipcMain } from 'electron'", "import { app, shell, BrowserWindow, ipcMain, Notification } from 'electron'");
}
if (!code.includes("getDb")) {
  code = code.replace("import { join } from 'path'", "import { join } from 'path'\nimport { getDb } from './db/database'");
}

const startupLogic = \
  createWindow()

  // D-Day 시작 알림
  try {
    const db = getDb();
    const row = db.prepare("SELECT value FROM settings WHERE key = 'custom_ddays'").get() as { value: string } | undefined;
    if (row && row.value) {
      const ddays = JSON.parse(row.value);
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayDdays = ddays.filter((d: any) => {
        const t = new Date(d.targetDate);
        t.setHours(0,0,0,0);
        return t.getTime() === today.getTime();
      });
      
      if (todayDdays.length > 0) {
        const titles = todayDdays.map((d: any) => d.title).join(', ');
        if (Notification.isSupported()) {
          new Notification({
            title: '좋은 아침입니다! ??',
            body: \오늘 출근 확인! 오늘은 [\] D-Day 입니다. 화이팅하세요!\,
          }).show();
        }
      }
    }
  } catch (err) {
    console.error('D-Day notification error', err);
  }
\;

code = code.replace("  createWindow()", startupLogic);

fs.writeFileSync('src/main/index.ts', code);
console.log('Added startup notification');
