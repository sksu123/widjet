import { ipcMain, dialog, app } from 'electron'
import { join, extname, basename, dirname } from 'path'
import { existsSync, mkdirSync, copyFileSync, readdirSync, renameSync, statSync, writeFileSync, readFileSync } from 'fs'

export function registerFileHandlers(): void {

  // 파일 선택 다이얼로그
  ipcMain.handle('file:open-dialog', async (_, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options)
    return { success: !result.canceled, paths: result.filePaths }
  })

  // 저장 다이얼로그
  ipcMain.handle('file:save-dialog', async (_, options: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(options)
    return { success: !result.canceled, path: result.filePath }
  })

  // 파일 일괄 이름 변경
  ipcMain.handle('file:batch-rename', async (_, folderPath: string, prefix: string, startNum: number) => {
    try {
      const files = readdirSync(folderPath).filter(f => {
        const stat = statSync(join(folderPath, f))
        return stat.isFile()
      })

      const results: string[] = []
      files.forEach((file, idx) => {
        const ext = extname(file)
        const newName = `${prefix}${String(startNum + idx).padStart(3, '0')}${ext}`
        const oldPath = join(folderPath, file)
        const newPath = join(folderPath, newName)
        renameSync(oldPath, newPath)
        results.push(`${file} → ${newName}`)
      })

      return { success: true, results }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 이미지 저장 (분실물 사진 등)
  ipcMain.handle('file:save-image', async (_, sourcePath: string, category: string) => {
    try {
      const userDataPath = app.getPath('userData')
      const destDir = join(userDataPath, 'uploads', category)
      if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true })

      const ext = extname(sourcePath)
      const destName = `${Date.now()}${ext}`
      const destPath = join(destDir, destName)
      copyFileSync(sourcePath, destPath)

      return { success: true, path: destPath }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 데이터 백업
  ipcMain.handle('file:backup-db', async () => {
    try {
      const userDataPath = app.getPath('userData')
      const dbPath = join(userDataPath, 'database', 'school-admin.db')
      const backupDir = join(userDataPath, 'backups')
      if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })

      const backupName = `backup-${new Date().toISOString().slice(0, 10)}.db`
      const backupPath = join(backupDir, backupName)
      copyFileSync(dbPath, backupPath)

      return { success: true, path: backupPath }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 텍스트 파일 저장 (공문 초안 등)
  ipcMain.handle('file:save-text', async (_, content: string, filename: string) => {
    try {
      const result = await dialog.showSaveDialog({
        defaultPath: filename,
        filters: [
          { name: '텍스트 파일', extensions: ['txt'] },
          { name: '모든 파일', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePath) {
        writeFileSync(result.filePath, content, 'utf-8')
        return { success: true, path: result.filePath }
      }
      return { success: false, error: '취소됨' }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 앱 데이터 경로 반환
  ipcMain.handle('file:get-user-data-path', async () => {
    return { success: true, path: app.getPath('userData') }
  })
}
