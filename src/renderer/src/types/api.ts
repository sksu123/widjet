// Window API 타입 선언

export interface AdminSchedule {
  id: number
  title: string
  category: string
  date: string         // YYYY-MM-DD
  end_date: string | null
  is_deadline: number  // 0 or 1
  is_recurring: number // 0 or 1
  memo: string
  description: string
  legal_basis: string
  source: string       // 'builtin' | 'custom'
  created_at: string
  updated_at: string
}

export interface API {
  ruleAi: {
    uploadDocument: (filePath: string) => Promise<any>
    getDocuments: () => Promise<any>
    toggleDocument: (id: number, isActive: boolean) => Promise<any>
    deleteDocument: (id: number) => Promise<any>
    getPageContent: (documentId: number, pageNumber: number) => Promise<any>
    getChats: () => Promise<any>
    getMessages: (chatId: number) => Promise<any>
    askQuestion: (chatId: number | null, question: string) => Promise<any>
  }
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    setAlwaysOnTop: (flag: boolean) => void
    isMaximized: () => Promise<boolean>
  }
  ai: {
    getAvailableModels: () => Promise<{ success: boolean; data: string[]; error?: string }>
    chat: (messages: Array<{ role: string; content: string }>, category?: string) => Promise<{ success: boolean; text: string; error?: string }>
    recommendBudget: (data: { projectName: string; item: string; amount: number }) => Promise<{ success: boolean; text: string; error?: string }>
    draftDocument: (data: { type: string; context: string }) => Promise<{ success: boolean; text: string; error?: string }>
    processVoice: (text: string) => Promise<{ success: boolean; text: string; error?: string }>
    proofreadDocument: (text: string) => Promise<{ success: boolean; text: string; error?: string }>
    getHistory: (limit?: number) => Promise<{ success: boolean; data: unknown[]; error?: string }>
    parseSchedule?: (text: string) => Promise<{ success: boolean; data: any }>
  }
  db: {
    getSettings: () => Promise<{ success: boolean; data: Record<string, string> }>
    updateSetting: (key: string, value: string) => Promise<{ success: boolean }>
    getUser: () => Promise<{ success: boolean; data: unknown }>
    updateUser: (data: Record<string, unknown>) => Promise<{ success: boolean }>
    getSchedules: (year?: number, month?: number) => Promise<{ success: boolean; data: unknown[] }>
    addSchedule: (data: Record<string, unknown>) => Promise<{ success: boolean; id: number | bigint }>
    updateSchedule: (id: number, data: Record<string, unknown>) => Promise<{ success: boolean }>
    deleteSchedule: (id: number) => Promise<{ success: boolean }>
    getCards: () => Promise<{ success: boolean; data: unknown[] }>
    borrowCard: (id: number, data: Record<string, unknown>) => Promise<{ success: boolean }>
    returnCard: (id: number) => Promise<{ success: boolean }>
    getCardHistory: (cardId?: number) => Promise<{ success: boolean; data: unknown[] }>
    getLostItems: (status?: string) => Promise<{ success: boolean; data: unknown[] }>
    addLostItem: (data: Record<string, unknown>) => Promise<{ success: boolean; id: number | bigint; qr_code?: string }>
    claimLostItem: (id: number, ownerName: string) => Promise<{ success: boolean }>
    getDocuments: (category?: string) => Promise<{ success: boolean; data: unknown[] }>
    searchDocuments: (keyword: string) => Promise<{ success: boolean; data: unknown[] }>
    incrementDocUse: (id: number) => Promise<{ success: boolean }>
    saveCalculation: (data: Record<string, unknown>) => Promise<{ success: boolean; id: number | bigint }>
    getCalculations: (type?: string) => Promise<{ success: boolean; data: unknown[] }>
    addLog: (action: string, module: string, detail: string) => Promise<{ success: boolean }>
  }
  file: {
    openDialog: (options: { properties?: string[]; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ success: boolean; paths?: string[] }>
    saveDialog: (options: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ success: boolean; path?: string }>
    batchRename: (folderPath: string, prefix: string, startNum: number) => Promise<{ success: boolean; results?: string[]; error?: string }>
    saveImage: (sourcePath: string, category: string) => Promise<{ success: boolean; path?: string; error?: string }>
    backupDb: () => Promise<{ success: boolean; path?: string; error?: string }>
    restoreDb: () => Promise<{ success: boolean; path?: string; error?: string }>
    saveText: (content: string, filename: string) => Promise<{ success: boolean; path?: string; error?: string }>
    getUserDataPath: () => Promise<{ success: boolean; path: string }>
  }
  calendar: {
    getWeather: (city?: string) => Promise<{ success: boolean; data: unknown; error?: string }>
    getToday: () => Promise<{ success: boolean; data: unknown[]; error?: string }>
    getMonth: (year: number, month: number) => Promise<{ success: boolean; data: unknown[]; error?: string }>
    getDday: () => Promise<{ success: boolean; data: unknown[]; error?: string }>
    getSchoolSchedule?: (year: number, month: number) => Promise<{ success: boolean; data: { date: string; eventName: string; isHoliday: boolean }[] }>
  }
  adminCal: {
    get: (year: number, month: number) => Promise<{ success: boolean; data: AdminSchedule[] }>
    getYear: (year: number) => Promise<{ success: boolean; data: AdminSchedule[] }>
    getAll: (year: number, keyword?: string, category?: string) => Promise<{ success: boolean; data: AdminSchedule[] }>
    add: (data: Record<string, unknown>) => Promise<{ success: boolean; id: number }>
    update: (id: number, data: Record<string, unknown>) => Promise<{ success: boolean }>
    delete: (id: number) => Promise<{ success: boolean }>
    deleteSimilar: (id: number) => Promise<{ success: boolean; count: number }>
    copyYear: (fromYear: number, toYear: number) => Promise<{ success: boolean; count: number; message?: string }>
  }
  mobile?: {
    getStatus: () => Promise<{
      success: boolean
      data?: {
        running: boolean
        port: number
        ip: string
        allIps: string[]
        token: string
        url: string
        qrCode: string
        connectedClients: number
      }
      error?: string
    }>
    regenerateToken: () => Promise<{
      success: boolean
      data?: {
        running: boolean
        port: number
        ip: string
        allIps: string[]
        token: string
        url: string
        qrCode: string
        connectedClients: number
      }
      error?: string
    }>
    startServer: () => Promise<{ success: boolean; data?: any; error?: string }>
    stopServer: () => Promise<{ success: boolean; error?: string }>
    notifyChange: () => Promise<{ success: boolean; error?: string }>
    onDataChanged: (callback: () => void) => () => void
  }
  cloud?: {
    getStatus: () => Promise<{
      success: boolean
      data?: {
        enabled: boolean
        key: string | null
        hostingUrl: string
        mobileAccessUrl: string | null
        qrCode: string | null
        lastSyncTime: string | null
        lastSyncStatus: string
        lastSyncError: string | null
      }
      error?: string
    }>
    enable: () => Promise<{ success: boolean; data?: any; error?: string }>
    syncNow: () => Promise<{ success: boolean; data?: any; error?: string }>
    disable: () => Promise<{ success: boolean; data?: any; error?: string }>
    regenerateKey: () => Promise<{ success: boolean; data?: any; error?: string }>
    setHostingUrl: (url: string) => Promise<{ success: boolean; data?: any; error?: string }>
  }
  updater?: {
    checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>
    onUpdateAvailable: (callback: (info: any) => void) => void
    onUpdateNotAvailable: (callback: () => void) => void
    onError: (callback: (err: string) => void) => void
    downloadUpdate: () => Promise<any>
    quitAndInstall: () => Promise<void>
    onDownloadProgress: (callback: (progress: any) => void) => void
    onUpdateDownloaded: (callback: (info: any) => void) => void
    getReleaseNotes: () => Promise<{
      success: boolean
      data?: ReleaseNoteItem[]
      error?: string
      isFallback?: boolean
    }>
    openUrl: (url: string) => Promise<{ success: boolean; error?: string }>
  }
}

export interface ReleaseNoteItem {
  tagName: string
  name: string
  body: string
  publishedAt: string
  htmlUrl: string
  isPrerelease?: boolean
}

declare global {
  interface Window {
    api: API
  }
}
