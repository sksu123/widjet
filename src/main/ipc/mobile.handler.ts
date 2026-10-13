import { ipcMain } from 'electron'
import {
  getMobileServerStatus,
  regenerateMobileToken,
  startMobileServer,
  stopMobileServer,
  broadcastMobileUpdate
} from '../mobile/mobileServer'

export function registerMobileHandlers(): void {
  // 모바일 서버 상태 및 QR코드 조회
  ipcMain.handle('mobile:get-status', async () => {
    try {
      const status = await getMobileServerStatus()
      return { success: true, data: status }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 보안 토큰 재발급
  ipcMain.handle('mobile:regenerate-token', async () => {
    try {
      regenerateMobileToken()
      broadcastMobileUpdate()
      const status = await getMobileServerStatus()
      return { success: true, data: status }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 모바일 서버 수동 시작
  ipcMain.handle('mobile:start-server', async () => {
    try {
      await startMobileServer(() => null)
      const status = await getMobileServerStatus()
      return { success: true, data: status }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // 모바일 서버 수동 중지
  ipcMain.handle('mobile:stop-server', async () => {
    try {
      stopMobileServer()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // PC에서 데이터 변경 시 모바일로 알림 발송
  ipcMain.handle('mobile:notify-change', async () => {
    try {
      broadcastMobileUpdate()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })
}
