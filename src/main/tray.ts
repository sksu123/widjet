import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'
import { join } from 'path'

let tray: Tray | null = null

export function setupTray(mainWindow: BrowserWindow): void {
  const iconPath = join(__dirname, '../../resources/icon.png')
  let icon: Electron.NativeImage

  try {
    icon = nativeImage.createFromPath(iconPath)
    if (icon.isEmpty()) {
      icon = nativeImage.createFromDataURL(
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAN0lEQVQ4jWNgGAWkgv8kMJCKGf4TqZmJimb+J1IzExXN/E+kZiYqmvmfSM1MVDTzP5GamcgHABmRBRMx7Xs4AAAAAElFTkSuQmCC'
      )
    }
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
