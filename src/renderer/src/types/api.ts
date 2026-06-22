// Window API 타입 선언
export interface API {
  window: {
    minimize: () => void
    maximize: () => void
    close: () => void
    setAlwaysOnTop: (flag: boolean) => void
    isMaximized: () => Promise<boolean>
  }
  ai: {
    chat: (messages: Array<{ role: string; content: string }>, category?: string) => Promise<{ success: boolean; text: string; error?: string }>
    recommendBudget: (data: { projectName: string; item: string; amount: number }) => Promise<{ success: boolean; text: string; error?: string }>
    draftDocument: (data: { type: string; context: string }) => Promise<{ success: boolean; text: string; error?: string }>
    processVoice: (text: string) => Promise<{ success: boolean; text: string; error?: string }>
    getHistory: (limit?: number) => Promise<{ success: boolean; data: unknown[]; error?: string }>
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
  }
}

declare global {
  interface Window {
    api: API
  }
}
