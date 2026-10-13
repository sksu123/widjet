import { app, shell, BrowserWindow, ipcMain, Notification } from 'electron'
import { join } from 'path'
import { getDb } from './db/database'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { setupTray } from './tray'
import { setupDatabase } from './db/database'
import { registerAllHandlers } from './ipc'
import { startMobileServer, stopMobileServer } from './mobile/mobileServer'
import { syncCloudNow } from './cloud/cloudSyncManager'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    frame: false,          // 커스텀 타이틀바
    transparent: false,
    alwaysOnTop: false,    // 설정에서 변경 가능
    skipTaskbar: false,
    resizable: true,
    backgroundColor: '#0f172a',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 개발: Vite 개발 서버 / 프로덕션: 빌드된 파일
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.schooladmin.widget')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // DB 초기화
  await setupDatabase()

  // IPC 핸들러 등록
  registerAllHandlers()

  createWindow()

  // 모바일 동기화 서버 시작 (PWA)
  try {
    await startMobileServer(() => mainWindow)
  } catch (err) {
    console.error('Failed to start mobile server:', err)
  }

  // 외부 클라우드 동기화 (Supabase)
  syncCloudNow().catch(() => {})

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
            title: '좋은 아침입니다! ☀️',
            body: `오늘 출근 확인! 오늘은 [${titles}] D-Day 입니다. 화이팅하세요!`,
          }).show();
        }
      }
    }
  } catch (err) {
    console.error('D-Day notification error', err);
  }

  // 시스템 트레이 설정
  setupTray(mainWindow!)

  // 자동 업데이트
  // checkForUpdatesAndNotify()는 영어 알림을 강제로 표시하므로 사용하지 않음
  // checkForUpdates()를 직접 호출하고, 이벤트 핸들러에서 한글 알림을 직접 발송함
  if (!is.dev) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info) => {
      // 앱 내 배너 표시를 위해 렌더러에 전송
      mainWindow?.webContents.send('updater:update-available', info)
      // 한글 시스템 알림
      if (Notification.isSupported()) {
        new Notification({
          title: '🔔 새 버전이 있습니다!',
          body: `교행 보드 v${info.version}이(가) 출시되었습니다. 백그라운드에서 자동 다운로드 중입니다.`,
        }).show()
      }
    })

    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('updater:update-not-available')
    })

    autoUpdater.on('error', (err) => {
      mainWindow?.webContents.send('updater:error', err.message)
    })

    autoUpdater.on('update-downloaded', (info) => {
      // 앱 내 배너 표시를 위해 렌더러에 전송
      mainWindow?.webContents.send('updater:update-downloaded', info)
      // 한글 시스템 알림
      if (Notification.isSupported()) {
        new Notification({
          title: '✅ 업데이트 다운로드 완료!',
          body: `교행 보드 v${info.version} 준비 완료. 설정 → 업데이트에서 지금 설치하거나, 프로그램 종료 시 자동으로 설치됩니다.`,
        }).show()
      }
    })

    autoUpdater.checkForUpdates()
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  stopMobileServer()
})

// 창 컨트롤 IPC
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window-close', () => mainWindow?.hide()) // 닫기 시 트레이로 최소화
ipcMain.on('window-always-on-top', (_, flag: boolean) => {
  mainWindow?.setAlwaysOnTop(flag, 'floating')
})
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized())

// 수동 업데이트 확인
ipcMain.handle('updater:check', async () => {
  if (is.dev) {
    return { success: false, error: '개발 환경에서는 업데이트를 확인할 수 없습니다.' }
  }
  try {
    await autoUpdater.checkForUpdates()
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall(true, true)
})
