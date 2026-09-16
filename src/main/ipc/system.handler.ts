import { ipcMain, app, globalShortcut, clipboard, Notification } from 'electron'

let clipboardHistory: { id: string; text: string; time: number }[] = []
let lastClipboardText = ''
const MAX_HISTORY = 20
let isPollingStarted = false


let registeredShortcuts: string[] = []

export function registerSystemHandlers(): void {
  if (!isPollingStarted) {
    isPollingStarted = true;
    setInterval(() => {
      try {
        const text = clipboard.readText();
        if (text && text.trim() !== '' && text !== lastClipboardText) {
          lastClipboardText = text;
          clipboardHistory = clipboardHistory.filter(item => item.text !== text);
          clipboardHistory.unshift({ id: Date.now().toString(), text, time: Date.now() });
          if (clipboardHistory.length > MAX_HISTORY) {
            clipboardHistory.pop();
          }
        }
      } catch (e) {
        // ignore
      }
    }, 1000);
  }

  
  ipcMain.handle('system:write-clipboard', (_, text: string) => {
    clipboard.writeText(text);
    return { success: true };
  })
  
  ipcMain.handle('system:get-clipboard-history', () => {
    return { success: true, data: clipboardHistory };
  });

  ipcMain.handle('system:clear-clipboard-history', () => {
    clipboardHistory = [];
    return { success: true };
  });

  ipcMain.handle('system:register-snippets', (_, snippets: { label?: string; text: string }[]) => {
    registeredShortcuts.forEach(s => globalShortcut.unregister(s))
    registeredShortcuts = []
    
    if (snippets && Array.isArray(snippets)) {
      snippets.forEach((item, i) => {
        // 호환성을 위해 문자열인지 객체인지 체크
        const text = typeof item === 'string' ? item : item.text
        const label = typeof item === 'string' ? '' : item.label
        
        if (!text || text.trim() === '' || text === '[object Object]') return
        if (i >= 9) return // Max 9 shortcuts (Alt+1 to Alt+9)
        const shortcut = `Alt+${i + 1}`
        try {
          globalShortcut.register(shortcut, () => {
            clipboard.writeText(text)
            
            const title = '교행보드';
            const body = `클립보드에 복사됨\n${label || (text.length > 50 ? text.slice(0, 50) + '...' : text)}`;
            
            // 네이티브 알림 (timeoutType: 'default' 으로 자동 닫힘)
            new Notification({ title, body, timeoutType: 'default' }).show()
          })
          registeredShortcuts.push(shortcut)
        } catch (e) {
          console.error('Failed to register shortcut', shortcut, e)
        }
      })
    }
    return { success: true }
  })
  ipcMain.handle('system:set-login-item', (_, openAtLogin: boolean) => {
    app.setLoginItemSettings({
      openAtLogin,
      openAsHidden: true
    })
    return { success: true }
  })

  ipcMain.handle('system:get-login-item', () => {
    const settings = app.getLoginItemSettings()
    return { success: true, openAtLogin: settings.openAtLogin }
  })

  ipcMain.handle('system:get-version', () => {
    return { success: true, version: app.getVersion() }
  })
}
