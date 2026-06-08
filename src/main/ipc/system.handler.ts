import { ipcMain, app } from 'electron'

export function registerSystemHandlers(): void {
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
}
