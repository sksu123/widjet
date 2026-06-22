import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow): void {
  // 트레이 전용 아이콘 (tray.png 우선 → icon.png fallback)
  let icon: Electron.NativeImage
  try {
    const trayIconPath = join(__dirname, '../../resources/tray.png')
    const mainIconPath = join(__dirname, '../../resources/icon.png')
    let loaded = nativeImage.createFromPath(trayIconPath)
    if (loaded.isEmpty()) {
      loaded = nativeImage.createFromPath(mainIconPath)
    }
    icon = loaded.isEmpty() ? nativeImage.createEmpty() : loaded
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)


  const contextMenu = Menu.buildFromTemplate([
    {
      label: '열기',
      click: () => {
        mainWindow.show()
        mainWindow.focus()
      }
    },
    { type: 'separator' },
    {
      label: '항상 위에 표시',
      type: 'checkbox',
      checked: false,
      click: (menuItem) => {
        mainWindow.setAlwaysOnTop(menuItem.checked, 'floating')
      }
    },
    { type: 'separator' },
    {
      label: '종료',
      click: () => {
        app.exit(0)
      }
    }
  ])

  tray.setToolTip('학교행정 AI 위젯')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}
