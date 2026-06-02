import { ipcMain } from 'electron'
import { getDb } from '../db/database'

export function registerDbHandlers(): void {

  // ===== 설정 =====
  ipcMain.handle('db:get-settings', async () => {
    const db = getDb()
    const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[]
    const settings: Record<string, string> = {}
    for (const row of rows) settings[row.key] = row.value
    return { success: true, data: settings }
  })

  ipcMain.handle('db:update-setting', async (_, key: string, value: string) => {
    const db = getDb()
    db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value)
    return { success: true }
  })

  // ===== 사용자 =====
  ipcMain.handle('db:get-user', async () => {
    const db = getDb()
    const row = db.prepare('SELECT * FROM users ORDER BY id LIMIT 1').get()
    return { success: true, data: row }
  })

  ipcMain.handle('db:update-user', async (_, data: Record<string, unknown>) => {
    const db = getDb()
    db.prepare(`
      UPDATE users SET name=?, school_name=?, department=?, email=?, avatar_color=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=1
    `).run(data.name, data.school_name, data.department, data.email, data.avatar_color)
    return { success: true }
  })

  // ===== 일정 =====
  ipcMain.handle('db:get-schedules', async (_, year?: number, month?: number) => {
    const db = getDb()
    let query = 'SELECT * FROM schedules'
    const params: (number | string)[] = []
    if (year && month) {
      query += ` WHERE strftime('%Y', start_date) = ? AND strftime('%m', start_date) = ?`
      params.push(year.toString(), month.toString().padStart(2, '0'))
    }
    query += ' ORDER BY start_date ASC'
    const rows = db.prepare(query).all(...params)
    return { success: true, data: rows }
  })

  ipcMain.handle('db:add-schedule', async (_, data: Record<string, unknown>) => {
    const db = getDb()
    const result = db.prepare(`
      INSERT INTO schedules (title, description, start_date, end_date, category, color, is_all_day, reminder_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.title, data.description, data.start_date, data.end_date, data.category, data.color, data.is_all_day, data.reminder_minutes)
    return { success: true, id: result.lastInsertRowid }
  })

  ipcMain.handle('db:update-schedule', async (_, id: number, data: Record<string, unknown>) => {
    const db = getDb()
    db.prepare(`
      UPDATE schedules SET title=?, description=?, start_date=?, end_date=?, category=?, color=?, is_all_day=?
      WHERE id=?
    `).run(data.title, data.description, data.start_date, data.end_date, data.category, data.color, data.is_all_day, id)
    return { success: true }
  })

  ipcMain.handle('db:delete-schedule', async (_, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM schedules WHERE id=?').run(id)
    return { success: true }
  })

  // ===== 법인카드 =====
  ipcMain.handle('db:get-cards', async () => {
    const db = getDb()
    const rows = db.prepare('SELECT * FROM corporate_cards ORDER BY id ASC').all()
    return { success: true, data: rows }
  })

  ipcMain.handle('db:borrow-card', async (_, id: number, data: { borrower_name: string; borrower_dept: string; purpose: string; due_date: string }) => {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE corporate_cards 
      SET is_available=0, borrower_name=?, borrower_dept=?, purpose=?, borrowed_at=?, due_date=?
      WHERE id=?
    `).run(data.borrower_name, data.borrower_dept, data.purpose, now, data.due_date, id)
    db.prepare(`
      INSERT INTO card_history (card_id, borrower_name, borrower_dept, borrowed_at, purpose)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, data.borrower_name, data.borrower_dept, now, data.purpose)
    return { success: true }
  })

  ipcMain.handle('db:return-card', async (_, id: number) => {
    const db = getDb()
    const now = new Date().toISOString()
    db.prepare(`
      UPDATE corporate_cards 
      SET is_available=1, borrower_name=NULL, borrower_dept=NULL, purpose=NULL, borrowed_at=NULL, due_date=NULL, returned_at=?
      WHERE id=?
    `).run(now, id)
    db.prepare(`
      UPDATE card_history SET returned_at=? WHERE card_id=? AND returned_at IS NULL
    `).run(now, id)
    return { success: true }
  })

  ipcMain.handle('db:get-card-history', async (_, cardId?: number) => {
    const db = getDb()
    const rows = cardId
      ? db.prepare('SELECT * FROM card_history WHERE card_id=? ORDER BY borrowed_at DESC').all(cardId)
      : db.prepare('SELECT ch.*, cc.card_name FROM card_history ch JOIN corporate_cards cc ON ch.card_id=cc.id ORDER BY ch.borrowed_at DESC').all()
    return { success: true, data: rows }
  })

  // ===== 분실물 =====
  ipcMain.handle('db:get-lost-items', async (_, status?: string) => {
    const db = getDb()
    const rows = status
      ? db.prepare('SELECT * FROM lost_items WHERE status=? ORDER BY created_at DESC').all(status)
      : db.prepare('SELECT * FROM lost_items ORDER BY created_at DESC').all()
    return { success: true, data: rows }
  })

  ipcMain.handle('db:add-lost-item', async (_, data: Record<string, unknown>) => {
    const db = getDb()
    const qrCode = `LOST-${Date.now()}`
    const result = db.prepare(`
      INSERT INTO lost_items (item_name, description, found_date, found_location, image_path, qr_code, finder_name, storage_location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(data.item_name, data.description, data.found_date, data.found_location, data.image_path, qrCode, data.finder_name, data.storage_location)
    return { success: true, id: result.lastInsertRowid, qr_code: qrCode }
  })

  ipcMain.handle('db:claim-lost-item', async (_, id: number, ownerName: string) => {
    const db = getDb()
    db.prepare(`
      UPDATE lost_items SET status='claimed', owner_name=?, claimed_at=CURRENT_TIMESTAMP WHERE id=?
    `).run(ownerName, id)
    return { success: true }
  })

  // ===== 문서 =====
  ipcMain.handle('db:get-documents', async (_, category?: string) => {
    const db = getDb()
    const rows = category
      ? db.prepare('SELECT * FROM documents WHERE category=? ORDER BY use_count DESC').all(category)
      : db.prepare('SELECT * FROM documents ORDER BY use_count DESC').all()
    return { success: true, data: rows }
  })

  ipcMain.handle('db:search-documents', async (_, keyword: string) => {
    const db = getDb()
    const rows = db.prepare(`
      SELECT * FROM documents 
      WHERE title LIKE ? OR tags LIKE ? OR category LIKE ?
      ORDER BY use_count DESC
    `).all(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`)
    return { success: true, data: rows }
  })

  ipcMain.handle('db:increment-doc-use', async (_, id: number) => {
    const db = getDb()
    db.prepare('UPDATE documents SET use_count = use_count + 1 WHERE id=?').run(id)
    return { success: true }
  })

  // ===== 계산기 =====
  ipcMain.handle('db:save-calculation', async (_, data: { type: string; title: string; input_data: string; result_data: string }) => {
    const db = getDb()
    const result = db.prepare(`
      INSERT INTO calculations (type, title, input_data, result_data) VALUES (?, ?, ?, ?)
    `).run(data.type, data.title, data.input_data, data.result_data)
    return { success: true, id: result.lastInsertRowid }
  })

  ipcMain.handle('db:get-calculations', async (_, type?: string) => {
    const db = getDb()
    const rows = type
      ? db.prepare('SELECT * FROM calculations WHERE type=? ORDER BY created_at DESC LIMIT 20').all(type)
      : db.prepare('SELECT * FROM calculations ORDER BY created_at DESC LIMIT 50').all()
    return { success: true, data: rows }
  })

  // ===== 감사 로그 =====
  ipcMain.handle('db:add-log', async (_, action: string, module: string, detail: string) => {
    const db = getDb()
    db.prepare(`INSERT INTO audit_log (action, module, detail) VALUES (?, ?, ?)`).run(action, module, detail)
    return { success: true }
  })
}
