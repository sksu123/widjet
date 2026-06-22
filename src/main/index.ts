import { app, shell, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import { setupTray } from './tray'
import { setupDatabase } from './db/database'
import { registerAllHandlers } from './ipc'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
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

  // 시스템 트레이 설정
  setupTray(mainWindow!)

  // 자동 업데이트
  if (!is.dev) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info) => {
      mainWindow?.webContents.send('updater:update-available', info)
    })
    autoUpdater.on('update-not-available', () => {
      mainWindow?.webContents.send('updater:update-not-available')
    })
    autoUpdater.on('error', (err) => {
      mainWindow?.webContents.send('updater:error', err.message)
    })

    autoUpdater.checkForUpdatesAndNotify()
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
