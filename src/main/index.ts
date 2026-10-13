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
import axios from 'axios'

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
    const result = await autoUpdater.checkForUpdates()
    return { success: true, updateInfo: result?.updateInfo }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall(true, true)
})

// GitHub Releases API로부터 릴리스 노트 목록 조회
ipcMain.handle('updater:get-release-notes', async () => {
  try {
    const res = await axios.get('https://api.github.com/repos/sksu123/widjet/releases', {
      timeout: 7000,
      headers: {
        'User-Agent': 'SchoolAdminWidget',
        Accept: 'application/vnd.github.v3+json'
      }
    })
    if (Array.isArray(res.data) && res.data.length > 0) {
      const releases = res.data.slice(0, 10).map((r: any) => ({
        tagName: r.tag_name || '',
        name: r.name || r.tag_name || '',
        body: r.body || '',
        publishedAt: r.published_at || '',
        htmlUrl: r.html_url || '',
        isPrerelease: !!r.prerelease
      }))
      return { success: true, data: releases }
    }
  } catch (err: any) {
    console.warn('GitHub API release notes fetch failed:', err.message)
  }

  // API 호출 실패 시 (네트워크 오류, rate limit, 아직 릴리스 생성 전 등) 최신 릴리스 기본 fallback 제공
  const fallback = [
    {
      tagName: 'v2.0.58',
      name: '교행 보드 v2.0.58 - 외부 네트워크 모바일 연동 & 릴리스 노트 조회',
      publishedAt: new Date().toISOString(),
      htmlUrl: 'https://github.com/sksu123/widjet/releases',
      body: `### 🌟 v2.0.58 주요 업데이트 내역

#### 1. 📱 외부 네트워크 모바일 연동 지원 (Supabase + PWA)
- 학교 내부망 PC와 집/모바일(LTE/다른 Wi-Fi) 간의 실시간 일정 및 D-DAY 조회 지원
- 48자리 무작위 보안 토큰과 SHA-256 해시 검증을 통한 안전한 클라우드 스냅샷 동기화
- 일정, D-DAY, 행정달력 마감일 데이터 60일치 자동 동기화 (2초 디바운스)

#### 2. 🔔 모바일 웹푸시 알림 지원
- D-DAY 알림: D-3일 오전 8시, 당일 오전 8시 푸시 발송
- 오늘 일정/할일 요약 알림: 매일 아침 8시 KST 자동 푸시
- 행정달력 마감일 알림 발송

#### 3. 🌐 GitHub Pages 기반 모바일 웹앱 배포
- \`docs/\` 폴더를 통한 무설치 모바일 PWA 배포
- 스마트폰 브라우저에서 '홈 화면에 추가'로 앱처럼 바로 사용 가능

#### 4. 📋 앱 내 버전 업데이트 및 GitHub Release Notes 열람 기능
- 업데이트 확인 시 GitHub 릴리스 노트를 앱 내에서 바로 확인할 수 있는 뷰어 추가
- 이전 릴리스 내역 확인 및 릴리스 노트 텍스트 복사 기능 지원`
    }
  ]
  return { success: true, data: fallback, isFallback: true }
})

// 외부 URL 열기
ipcMain.handle('updater:open-url', async (_, url: string) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    await shell.openExternal(url)
    return { success: true }
  }
  return { success: false, error: '유효하지 않은 URL입니다.' }
})
