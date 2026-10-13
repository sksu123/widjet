import { ipcMain } from 'electron'
import {
  getCloudSyncStatus,
  initOrCreateCloudKey,
  disableCloudSync,
  syncCloudNow,
  setCloudHostingUrl
} from '../cloud/cloudSyncManager'

export function registerCloudHandlers(): void {
  // 클라우드 연동 상태 및 QR 조회
  ipcMain.handle('cloud:get-status', async () => {
    try {
      const status = await getCloudSyncStatus()
      return { success: true, data: status }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 클라우드 연동 시작 (새 키 생성 및 첫 동기화)
  ipcMain.handle('cloud:enable', async () => {
    try {
      initOrCreateCloudKey()
      await syncCloudNow()
      const status = await getCloudSyncStatus()
      return { success: true, data: status }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 수동 동기화 실행
  ipcMain.handle('cloud:sync-now', async () => {
    try {
      const res = await syncCloudNow()
      const status = await getCloudSyncStatus()
      return { success: res.success, data: status, error: res.error }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 연동 해제
  ipcMain.handle('cloud:disable', async () => {
    try {
      await disableCloudSync()
      const status = await getCloudSyncStatus()
      return { success: true, data: status }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 키 재발급
  ipcMain.handle('cloud:regenerate-key', async () => {
    try {
      await disableCloudSync()
      initOrCreateCloudKey()
      await syncCloudNow()
      const status = await getCloudSyncStatus()
      return { success: true, data: status }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 호스팅 URL 설정
  ipcMain.handle('cloud:set-hosting-url', async (_, url: string) => {
    try {
      setCloudHostingUrl(url)
      const status = await getCloudSyncStatus()
      return { success: true, data: status }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
