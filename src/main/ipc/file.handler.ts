import { ipcMain, dialog, app, shell } from 'electron'
import { getDb } from '../db/database'
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

  // 데이터 백업 (저장 위치 선택)
  ipcMain.handle('file:backup-db', async () => {
    try {
      const userDataPath = app.getPath('userData')
      const dbPath = join(userDataPath, 'database', 'school-admin.db')
      const d = new Date()
      const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
      const result = await dialog.showSaveDialog({
        title: '백업 파일 저장 위치 선택',
        defaultPath: `학교행정AI위젯_백업_${dateStr}.db`,
        filters: [{ name: '데이터베이스 파일', extensions: ['db'] }, { name: '모든 파일', extensions: ['*'] }]
      })
      if (result.canceled || !result.filePath) return { success: false, error: '취소됨' }
      copyFileSync(dbPath, result.filePath)
      return { success: true, path: result.filePath }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 데이터 복원 (백업 파일 선택)
  ipcMain.handle('file:restore-db', async () => {
    try {
      const userDataPath = app.getPath('userData')
      const dbPath = join(userDataPath, 'database', 'school-admin.db')
      const result = await dialog.showOpenDialog({
        title: '복원할 백업 파일 선택',
        filters: [{ name: '데이터베이스 파일', extensions: ['db'] }, { name: '모든 파일', extensions: ['*'] }],
        properties: ['openFile']
      })
      if (result.canceled || !result.filePaths[0]) return { success: false, error: '취소됨' }
      // 현재 DB를 임시 백업한 뒤 복원
      const tempPath = dbPath + '.before-restore'
      copyFileSync(dbPath, tempPath)
      copyFileSync(result.filePaths[0], dbPath)
      return { success: true, path: result.filePaths[0] }
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

  // ==========================================
  // 파일/폴더 즐겨찾기 관련
  // ==========================================
  
  // 즐겨찾기 목록 조회
  ipcMain.handle('file:get-favorites', async () => {
    try {
      const db = getDb()
      const rows = db.prepare('SELECT * FROM favorites ORDER BY created_at ASC').all()
      return { success: true, data: rows }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 즐겨찾기 추가
  ipcMain.handle('file:add-favorite', async (_, name: string, path: string, type: string) => {
    try {
      const db = getDb()
      const stmt = db.prepare('INSERT INTO favorites (name, path, type) VALUES (?, ?, ?)')
      const info = stmt.run(name, path, type)
      return { success: true, id: info.lastInsertRowid }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 즐겨찾기 삭제
  ipcMain.handle('file:remove-favorite', async (_, id: number) => {
    try {
      const db = getDb()
      const stmt = db.prepare('DELETE FROM favorites WHERE id = ?')
      stmt.run(id)
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 파일/폴더 열기
  ipcMain.handle('file:open-path', async (_, path: string) => {
    try {
      if (!existsSync(path)) {
        return { success: false, error: '경로가 존재하지 않습니다.' }
      }
      const errorMsg = await shell.openPath(path)
      if (errorMsg) {
        return { success: false, error: errorMsg }
      }
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })
}
