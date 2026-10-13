import { contextBridge, ipcRenderer } from 'electron'

// 타입 안전한 IPC 브릿지
const api = {
  ruleAi: {
    uploadDocument: (filePath: string) => ipcRenderer.invoke('ruleAi:uploadDocument', filePath),
    getDocuments: () => ipcRenderer.invoke('ruleAi:getDocuments'),
    toggleDocument: (id: number, isActive: boolean) => ipcRenderer.invoke('ruleAi:toggleDocument', id, isActive),
    deleteDocument: (id: number) => ipcRenderer.invoke('ruleAi:deleteDocument', id),
    getPageContent: (documentId: number, pageNumber: number) => ipcRenderer.invoke('ruleAi:getPageContent', documentId, pageNumber),
    getChats: () => ipcRenderer.invoke('ruleAi:getChats'),
    getMessages: (chatId: number) => ipcRenderer.invoke('ruleAi:getMessages', chatId),
    deleteChat: (id: number) => ipcRenderer.invoke('ruleAi:deleteChat', id),
    deleteAllChats: () => ipcRenderer.invoke('ruleAi:deleteAllChats'),
    askQuestion: (chatId: number | null, question: string) => ipcRenderer.invoke('ruleAi:askQuestion', chatId, question)
  },

  // 행정 달력
  adminCal: {
    get: (year: number, month: number) => ipcRenderer.invoke('admin-cal:get', year, month),
    getYear: (year: number) => ipcRenderer.invoke('admin-cal:get-year', year),
    getAll: (year: number, keyword?: string, category?: string) => ipcRenderer.invoke('admin-cal:get-all', year, keyword, category),
    add: (data: Record<string, unknown>) => ipcRenderer.invoke('admin-cal:add', data),
    update: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('admin-cal:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('admin-cal:delete', id),
    deleteSimilar: (id: number) => ipcRenderer.invoke('admin-cal:delete-similar', id),
    copyYear: (fromYear: number, toYear: number) => ipcRenderer.invoke('admin-cal:copy-year', fromYear, toYear)
  },

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
    getAvailableModels: () => ipcRenderer.invoke('ai:get-available-models'),
    chat: (messages: Array<{ role: string; content: string }>, category?: string) =>
      ipcRenderer.invoke('ai:chat', messages, category),
    recommendBudget: (data: { projectName: string; item: string; amount: number }) =>
      ipcRenderer.invoke('ai:recommend-budget', data),
    draftDocument: (data: { type: string; context: string }) =>
      ipcRenderer.invoke('ai:draft-document', data),
    processVoice: (text: string) =>
      ipcRenderer.invoke('ai:process-voice', text),
    proofreadDocument: (text: string, includeTable?: boolean) => ipcRenderer.invoke('ai:proofread-document', text, includeTable),
    getHistory: (limit?: number) =>
      ipcRenderer.invoke('ai:get-history', limit),
    weatherSummary: (weatherData: any) =>
      ipcRenderer.invoke('ai:weather-summary', weatherData),
    parseSchedule: (text: string) =>
      ipcRenderer.invoke('ai:parse-schedule', text)
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
    addCard: (data: Record<string, unknown>) => ipcRenderer.invoke('db:add-card', data),
    updateCard: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('db:update-card', id, data),
    deleteCard: (id: number) => ipcRenderer.invoke('db:delete-card', id),
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

    addLog: (action: string, module: string, detail: string) => ipcRenderer.invoke('db:add-log', action, module, detail),

    getContacts: () => ipcRenderer.invoke('db:get-contacts'),
    addContact: (data: Record<string, unknown>) => ipcRenderer.invoke('db:add-contact', data),
    addContactsBulk: (data: Record<string, unknown>[]) => ipcRenderer.invoke('db:add-contacts-bulk', data),
    updateContact: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('db:update-contact', id, data),
    deleteContact: (id: number) => ipcRenderer.invoke('db:delete-contact', id),
    syncContactsBulk: (data: { updates: Record<string, unknown>[], deletes: number[] }) => ipcRenderer.invoke('db:sync-contacts-bulk', data),
    toggleContactFavorite: (id: number, is_favorite: boolean) => ipcRenderer.invoke('db:toggle-contact-favorite', id, is_favorite),

    getMemos: () => ipcRenderer.invoke('db:get-memos'),
    addMemo: (data: Record<string, unknown>) => ipcRenderer.invoke('db:add-memo', data),
    updateMemo: (id: number, data: Record<string, unknown>) => ipcRenderer.invoke('db:update-memo', id, data),
    deleteMemo: (id: number) => ipcRenderer.invoke('db:delete-memo', id),
    clearMemos: () => ipcRenderer.invoke('db:clear-memos')
  },

  // 파일
  file: {
    openDialog: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('file:open-dialog', options),
    saveDialog: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('file:save-dialog', options),
    batchRename: (folderPath: string, prefix: string, startNum: number) =>
      ipcRenderer.invoke('file:batch-rename', folderPath, prefix, startNum),
    saveImage: (sourcePath: string, category: string) => ipcRenderer.invoke('file:save-image', sourcePath, category),
    backupDb: () => ipcRenderer.invoke('file:backup-db'),
    restoreDb: () => ipcRenderer.invoke('file:restore-db'),
    saveText: (content: string, filename: string) => ipcRenderer.invoke('file:save-text', content, filename),
    getUserDataPath: () => ipcRenderer.invoke('file:get-user-data-path'),
    getFavorites: () => ipcRenderer.invoke('file:get-favorites'),
    addFavorite: (name: string, path: string, type: string) => ipcRenderer.invoke('file:add-favorite', name, path, type),
    removeFavorite: (id: number) => ipcRenderer.invoke('file:remove-favorite', id),
    openPath: (path: string) => ipcRenderer.invoke('file:open-path', path)
  },

  // 캘린더/날씨
  calendar: {
    getWeather: (forceRefresh?: boolean) => ipcRenderer.invoke('calendar:get-weather', forceRefresh),
    getToday: () => ipcRenderer.invoke('calendar:get-today'),
    getMonth: (year: number, month: number) => ipcRenderer.invoke('calendar:get-month', year, month),
    getDday: () => ipcRenderer.invoke('calendar:get-dday'),
    toggleScheduleStatus: (id: number, is_completed: number) => ipcRenderer.invoke('calendar:toggle-schedule-status', id, is_completed),
    getMeal: (targetDate?: string) => ipcRenderer.invoke('calendar:get-meal', targetDate),
    searchSchool: (schoolName: string) => ipcRenderer.invoke('calendar:search-school', schoolName),
    searchWeatherCity: (query: string) => ipcRenderer.invoke('calendar:search-weather-city', query),
    getSchoolSchedule: (year: number, month: number) => ipcRenderer.invoke('calendar:get-school-schedule', year, month)
  },

  // 시스템 (자동 실행 등)
  system: {
    setLoginItem: (openAtLogin: boolean) => ipcRenderer.invoke('system:set-login-item', openAtLogin),
    getLoginItem: () => ipcRenderer.invoke('system:get-login-item'),
    getVersion: () => ipcRenderer.invoke('system:get-version'),
    readClipboard: () => ipcRenderer.invoke('system:read-clipboard'),
    writeClipboard: (text: string) => ipcRenderer.invoke('system:write-clipboard', text),
    getClipboardHistory: () => ipcRenderer.invoke('system:get-clipboard-history'),
    clearClipboardHistory: () => ipcRenderer.invoke('system:clear-clipboard-history'),
    registerSnippets: (snippets: string[]) => ipcRenderer.invoke('system:register-snippets', snippets),
    onShowNotification: (callback: (data: any) => void) => {
      ipcRenderer.removeAllListeners('system:show-notification')
      ipcRenderer.on('system:show-notification', (_, data) => callback(data))
    }
  },

  // 업데이트
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on('updater:update-available', (_, info) => callback(info))
    },
    onUpdateNotAvailable: (callback: () => void) => {
      ipcRenderer.on('updater:update-not-available', () => callback())
    },
    onError: (callback: (err: string) => void) => {
      ipcRenderer.on('updater:error', (_, err) => callback(err))
    },
    downloadUpdate: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:install'),
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on('updater:download-progress', (_, progressObj) => callback(progressObj))
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      ipcRenderer.on('updater:update-downloaded', (_, info) => callback(info))
    }
  },

  // 모바일 연동 (PWA)
  mobile: {
    getStatus: () => ipcRenderer.invoke('mobile:get-status'),
    regenerateToken: () => ipcRenderer.invoke('mobile:regenerate-token'),
    startServer: () => ipcRenderer.invoke('mobile:start-server'),
    stopServer: () => ipcRenderer.invoke('mobile:stop-server'),
    notifyChange: () => ipcRenderer.invoke('mobile:notify-change'),
    onDataChanged: (callback: () => void) => {
      const listener = () => callback()
      ipcRenderer.on('mobile:data-changed', listener)
      return () => {
        ipcRenderer.removeListener('mobile:data-changed', listener)
      }
    }
  },

  // 외부 네트워크 클라우드 연동 (Supabase)
  cloud: {
    getStatus: () => ipcRenderer.invoke('cloud:get-status'),
    enable: () => ipcRenderer.invoke('cloud:enable'),
    syncNow: () => ipcRenderer.invoke('cloud:sync-now'),
    disable: () => ipcRenderer.invoke('cloud:disable'),
    regenerateKey: () => ipcRenderer.invoke('cloud:regenerate-key'),
    setHostingUrl: (url: string) => ipcRenderer.invoke('cloud:set-hosting-url', url)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
