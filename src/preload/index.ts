import { contextBridge, ipcRenderer } from 'electron'

// 타입 안전한 IPC 브릿지
const api = {
  // 윈도우 컨트롤
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    setAlwaysOnTop: (flag: boolean) => ipcRenderer.send('window-always-on-top', flag),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized')
  },

  // AI
  ai: {
    chat: (messages: Array<{ role: string; content: string }>, category?: string) =>
      ipcRenderer.invoke('ai:chat', messages, category),
    recommendBudget: (data: { projectName: string; item: string; amount: number }) =>
      ipcRenderer.invoke('ai:recommend-budget', data),
    draftDocument: (data: { type: string; context: string }) =>
      ipcRenderer.invoke('ai:draft-document', data),
    processVoice: (text: string) =>
      ipcRenderer.invoke('ai:process-voice', text),
    getHistory: (limit?: number) =>
      ipcRenderer.invoke('ai:get-history', limit)
  },

  // 데이터베이스
  db: {
    getSettings: () => ipcRenderer.invoke('db:get-settings'),
    updateSetting: (key: string, value: string) => ipcRenderer.invoke('db:update-setting', key, value),
    getUser: () => ipcRenderer.invoke('db:get-user'),
    updateUser: (data: Record<string, unknown>) => ipcRenderer.invoke('db:update-user', data),

    getSchedules: (year?: number, month?: number) => ipcRenderer.invoke('db:get-schedules', year, month),
    addSchedule: (data: Record<string, unknown>) => ipcRenderer.invoke('db:add-schedule', data),
    updateSchedule: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('db:update-schedule', id, data),
    deleteSchedule: (id: number) => ipcRenderer.invoke('db:delete-schedule', id),

    getCards: () => ipcRenderer.invoke('db:get-cards'),
    borrowCard: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('db:borrow-card', id, data),
    returnCard: (id: number) => ipcRenderer.invoke('db:return-card', id),
    getCardHistory: (cardId?: number) => ipcRenderer.invoke('db:get-card-history', cardId),

    getLostItems: (status?: string) => ipcRenderer.invoke('db:get-lost-items', status),
    addLostItem: (data: Record<string, unknown>) => ipcRenderer.invoke('db:add-lost-item', data),
    claimLostItem: (id: number, ownerName: string) => ipcRenderer.invoke('db:claim-lost-item', id, ownerName),

    getDocuments: (category?: string) => ipcRenderer.invoke('db:get-documents', category),
    searchDocuments: (keyword: string) => ipcRenderer.invoke('db:search-documents', keyword),
    incrementDocUse: (id: number) => ipcRenderer.invoke('db:increment-doc-use', id),

    saveCalculation: (data: Record<string, unknown>) => ipcRenderer.invoke('db:save-calculation', data),
    getCalculations: (type?: string) => ipcRenderer.invoke('db:get-calculations', type),

    addLog: (action: string, module: string, detail: string) => ipcRenderer.invoke('db:add-log', action, module, detail)
  },

  // 파일
  file: {
    openDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('file:open-dialog', options),
    saveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('file:save-dialog', options),
    batchRename: (folderPath: string, prefix: string, startNum: number) =>
      ipcRenderer.invoke('file:batch-rename', folderPath, prefix, startNum),
    saveImage: (sourcePath: string, category: string) => ipcRenderer.invoke('file:save-image', sourcePath, category),
    backupDb: () => ipcRenderer.invoke('file:backup-db'),
    saveText: (content: string, filename: string) => ipcRenderer.invoke('file:save-text', content, filename),
    getUserDataPath: () => ipcRenderer.invoke('file:get-user-data-path')
  },

  // 캘린더/날씨
  calendar: {
    getWeather: (city?: string) => ipcRenderer.invoke('calendar:get-weather', city),
    getToday: () => ipcRenderer.invoke('calendar:get-today'),
    getMonth: (year: number, month: number) => ipcRenderer.invoke('calendar:get-month', year, month),
    getDday: () => ipcRenderer.invoke('calendar:get-dday')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
