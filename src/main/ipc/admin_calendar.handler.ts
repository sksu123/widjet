import { ipcMain } from 'electron'
import { getDb } from '../db/database'

export interface AdminSchedule {
  id: number
  title: string
  category: string
  date: string
  end_date: string | null
  is_deadline: number
  is_recurring: number
  memo: string
  description: string
  legal_basis: string
  source: string
  created_at: string
  updated_at: string
}

export function registerAdminCalendarHandlers(): void {

  // 년·월별 조회
  ipcMain.handle('admin-cal:get', async (_, year: number, month: number) => {
    const db = getDb()
    const ym = `${year}-${String(month).padStart(2, '0')}`
    const rows = db.prepare(`
      SELECT * FROM admin_schedules
      WHERE date LIKE ? OR (end_date IS NOT NULL AND date <= ? AND end_date >= ?)
      ORDER BY date ASC
    `).all(`${ym}-%`, `${ym}-31`, `${ym}-01`)
    return { success: true, data: rows }
  })

  // 연간 뷰용 전체 연도 조회
  ipcMain.handle('admin-cal:get-year', async (_, year: number) => {
    const db = getDb()
    const rows = db.prepare(`
      SELECT * FROM admin_schedules
      WHERE date LIKE ?
      ORDER BY date ASC
    `).all(`${year}-%`)
    return { success: true, data: rows }
  })

  // 검색·목록뷰용 전체 조회 (키워드 + 카테고리 필터)
  ipcMain.handle('admin-cal:get-all', async (_, year: number, keyword?: string, category?: string) => {
    const db = getDb()
    let query = 'SELECT * FROM admin_schedules WHERE date LIKE ?'
    const params: (string | number)[] = [`${year}-%`]

    if (keyword && keyword.trim()) {
      query += ' AND title LIKE ?'
      params.push(`%${keyword.trim()}%`)
    }
    if (category && category !== '전체') {
      query += ' AND category = ?'
      params.push(category)
    }
    query += ' ORDER BY date ASC'

    const rows = db.prepare(query).all(...params)
    return { success: true, data: rows }
  })

  // 주말 보정 함수: 시설/안전은 전주 금요일로, 나머지는 다음 월요일로
  const adjustWeekend = (dateStr: string, category: string): string => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const day = d.getDay()
    if (category === '시설/안전') {
      if (day === 6) d.setDate(d.getDate() - 1)
      else if (day === 0) d.setDate(d.getDate() - 2)
    } else {
      if (day === 6) d.setDate(d.getDate() + 2)
      else if (day === 0) d.setDate(d.getDate() + 1)
    }
    return d.toISOString().split('T')[0]
  }

  const generateRecurring = (baseDateStr: string, data: any, excludeId?: number) => {
    const db = getDb()
    const [y, mStr, dStr] = baseDateStr.split('-')
    const year = Number(y)
    const month = Number(mStr)
    const day = Number(dStr)

    // 기존 해당 연도의 동일 제목 반복 일정 삭제 (현재 수정 중인 id 제외)
    let delQuery = `DELETE FROM admin_schedules WHERE title = ? AND is_recurring = 1 AND date LIKE ?`
    const delParams: any[] = [data.title, `${year}-%`]
    if (excludeId) {
      delQuery += ` AND id != ?`
      delParams.push(excludeId)
    }
    db.prepare(delQuery).run(...delParams)

    const insertStmt = db.prepare(`
      INSERT INTO admin_schedules (title, category, date, end_date, is_deadline, is_recurring, memo, description, legal_basis, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom')
    `)
    for (let i = 1; i <= 12; i++) {
      if (i === month) continue

      const maxDays = new Date(year, i, 0).getDate()
      const targetDay = Math.min(day, maxDays)
      const targetDateStr = `${year}-${String(i).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`
      const adjustedDate = adjustWeekend(targetDateStr, data.category || '행정')
      
      insertStmt.run(
        data.title,
        data.category || '행정',
        adjustedDate,
        null,
        data.is_deadline ? 1 : 0,
        1,
        data.memo || '',
        data.description || '',
        data.legal_basis || ''
      )
    }
  }

  // 일정 추가
  ipcMain.handle('admin-cal:add', async (_, data: Omit<AdminSchedule, 'id' | 'created_at' | 'updated_at'>) => {
    const db = getDb()
    const stmt = db.prepare(`
      INSERT INTO admin_schedules (title, category, date, end_date, is_deadline, is_recurring, memo, description, legal_basis, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom')
    `)
    // 최초 등록 시에도 해당 월의 주말을 자동 보정하도록 적용 (반복일정이든 아니든, 반복일정인 경우 확실히 적용)
    let finalDate = data.date
    if (data.is_recurring) {
      finalDate = adjustWeekend(data.date, data.category || '행정')
    }

    const result = stmt.run(
      data.title,
      data.category || '행정',
      finalDate,
      data.end_date || null,
      data.is_deadline ? 1 : 0,
      data.is_recurring ? 1 : 0,
      data.memo || '',
      data.description || '',
      data.legal_basis || ''
    )
    const newId = result.lastInsertRowid as number

    if (data.is_recurring) {
      // is_recurring 이면 나머지 11개월분 생성 (원본 data.date 기준으로 날짜 계산)
      generateRecurring(data.date, data, newId)
    }

    return { success: true, id: newId }
  })

  // 일정 수정
  ipcMain.handle('admin-cal:update', async (_, id: number, data: Partial<AdminSchedule>) => {
    const db = getDb()
    let finalDate = data.date!
    if (data.is_recurring) {
      finalDate = adjustWeekend(data.date!, data.category || '행정')
    }

    db.prepare(`
      UPDATE admin_schedules
      SET title=?, category=?, date=?, end_date=?, is_deadline=?, is_recurring=?, memo=?, description=?, legal_basis=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(
      data.title,
      data.category,
      finalDate,
      data.end_date || null,
      data.is_deadline ? 1 : 0,
      data.is_recurring ? 1 : 0,
      data.memo || '',
      data.description || '',
      data.legal_basis || '',
      id
    )

    if (data.is_recurring) {
      generateRecurring(data.date!, data, id)
    }
    return { success: true }
  })

  // 일정 삭제
  ipcMain.handle('admin-cal:delete', async (_, id: number) => {
    const db = getDb()
    db.prepare('DELETE FROM admin_schedules WHERE id=?').run(id)
    return { success: true }
  })

  // 유사 일정 일괄 삭제 (같은 연도)
  ipcMain.handle('admin-cal:delete-similar', async (_, id: number) => {
    const db = getDb()
    const row = db.prepare('SELECT title, date FROM admin_schedules WHERE id=?').get(id) as { title: string; date: string } | undefined
    if (!row) return { success: false, count: 0 }
    
    const year = row.date.split('-')[0]
    // "7월분 ", "8월 " 같은 문자열 제거하여 핵심 키워드 추출
    let baseTitle = row.title.replace(/\d+월분?\s*/g, '').trim()
    if (!baseTitle) baseTitle = row.title

    const result = db.prepare(`
      DELETE FROM admin_schedules 
      WHERE date LIKE ? AND title LIKE ?
    `).run(`${year}-%`, `%${baseTitle}%`)
    
    return { success: true, count: result.changes }
  })

  // 연도 복사 (주말 보정)
  ipcMain.handle('admin-cal:copy-year', async (_, fromYear: number, toYear: number) => {
    const db = getDb()
    const sourceRows = db.prepare(`
      SELECT * FROM admin_schedules WHERE date LIKE ?
    `).all(`${fromYear}-%`) as AdminSchedule[]

    if (sourceRows.length === 0) {
      return { success: false, message: '복사할 일정이 없습니다.' }
    }

    const insertStmt = db.prepare(`
      INSERT INTO admin_schedules (title, category, date, end_date, is_deadline, is_recurring, memo, description, legal_basis, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'custom')
    `)

    // 주말 보정 함수: 시설/안전은 전주 금요일로, 나머지는 다음 월요일로
    const adjustWeekend = (dateStr: string, category: string): string => {
      const d = new Date(dateStr)
      const day = d.getDay()
      if (category === '시설/안전') {
        if (day === 6) d.setDate(d.getDate() - 1)      // 토 -> 금
        else if (day === 0) d.setDate(d.getDate() - 2) // 일 -> 금
      } else {
        if (day === 6) d.setDate(d.getDate() + 2)      // 토 -> 월
        else if (day === 0) d.setDate(d.getDate() + 1) // 일 -> 월
      }
      return d.toISOString().split('T')[0]
    }

    const shiftYear = (dateStr: string): string => {
      return dateStr.replace(/^\d{4}/, String(toYear))
    }

    let count = 0
    const insertMany = db.transaction(() => {
      for (const row of sourceRows) {
        const newDate = adjustWeekend(shiftYear(row.date), row.category)
        const newEndDate = row.end_date ? adjustWeekend(shiftYear(row.end_date), row.category) : null
        insertStmt.run(
          row.title, row.category, newDate, newEndDate,
          row.is_deadline, row.is_recurring, row.memo,
          row.description, row.legal_basis
        )
        count++
      }
    })
    insertMany()

    return { success: true, count }
  })
}
