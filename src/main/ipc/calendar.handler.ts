import { ipcMain } from 'electron'
import axios from 'axios'
import { getDb } from '../db/database'

export function registerCalendarHandlers(): void {

  // 날씨 정보 가져오기
  ipcMain.handle('calendar:get-weather', async (_, city = '서울') => {
    try {
      const db = getDb()
      const row = db.prepare("SELECT value FROM settings WHERE key = 'weather_api_key'").get() as { value: string } | undefined
      const apiKey = (row?.value || process.env.WEATHER_API_KEY || '').trim()

      if (!apiKey) {
        return {
          success: true,
          data: { city, temp: 24, feels_like: 26, humidity: 65, description: '맑음', icon: '01d', wind_speed: 2.5 }
        }
      }

      const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: city,
          appid: apiKey,
          units: 'metric',
          lang: 'ko'
        },
        timeout: 5000
      })

      const d = res.data
      return {
        success: true,
        data: {
          city: d.name,
          temp: Math.round(d.main.temp),
          feels_like: Math.round(d.main.feels_like),
          humidity: d.main.humidity,
          description: d.weather[0].description,
          icon: d.weather[0].icon,
          wind_speed: d.wind.speed
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[날씨] API 오류:', message)
      // 오류 시에도 위젯이 사라지지 않도록 더미 데이터 반환
      return {
        success: true,
        data: { city, temp: '--', feels_like: '--', humidity: '--', description: 'API 오류', icon: '01d', wind_speed: '--' }
      }
    }
  })

  // 오늘 일정 가져오기
  ipcMain.handle('calendar:get-today', async () => {
    try {
      const db = getDb()
      const d = new Date()
      const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
      const rows = db.prepare(`
        SELECT * FROM schedules 
        WHERE date(start_date) = ?
        ORDER BY start_date ASC
      `).all(today)
      return { success: true, data: rows }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 이번 달 일정 가져오기
  ipcMain.handle('calendar:get-month', async (_, year: number, month: number) => {
    try {
      const db = getDb()
      const y = year.toString()
      const m = month.toString().padStart(2, '0')
      const rows = db.prepare(`
        SELECT * FROM schedules
        WHERE strftime('%Y-%m', start_date) = ?
        ORDER BY start_date ASC
      `).all(`${y}-${m}`)
      return { success: true, data: rows }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 다음 D-Day 이벤트 가져오기
  ipcMain.handle('calendar:get-dday', async () => {
    try {
      const db = getDb()
      const d = new Date()
      const today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
      const rows = db.prepare(`
        SELECT *, 
          CAST((julianday(date(start_date)) - julianday(?)) AS INTEGER) AS days_left
        FROM schedules
        WHERE date(start_date) >= ? 
          AND CAST((julianday(date(start_date)) - julianday(?)) AS INTEGER) <= 31
        ORDER BY start_date ASC
        LIMIT 5
      `).all(today, today, today)
      return { success: true, data: rows }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 일정 완료 토글 핸들러
  ipcMain.handle('calendar:toggle-schedule-status', async (_, id: number, is_completed: number) => {
    try {
      const db = getDb()
      db.prepare('UPDATE schedules SET is_completed = ? WHERE id = ?').run(is_completed, id)
      return { success: true }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 오늘의 급식 메뉴 가져오기
  ipcMain.handle('calendar:get-meal', async (_, targetDate?: string) => {
    try {
      const db = getDb()
      const getSetting = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string })?.value || ''
      const neisApiKey = getSetting('neis_api_key')
      const atptCode = getSetting('neis_atpt_code')
      const schulCode = getSetting('neis_schul_code')

      if (!neisApiKey || !atptCode || !schulCode) {
        return { success: false, error: 'NEIS_NOT_CONFIGURED' }
      }

      // 인자로 넘어온 날짜 사용, 없으면 오늘 날짜
      let yyyymmdd: string
      if (targetDate) {
        yyyymmdd = targetDate
      } else {
        const today = new Date()
        yyyymmdd = today.getFullYear() + String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0')
      }

      const res = await axios.get('https://open.neis.go.kr/hub/mealServiceDietInfo', {
        params: {
          KEY: neisApiKey,
          Type: 'json',
          pIndex: 1,
          pSize: 1,
          ATPT_OFCDC_SC_CODE: atptCode,
          SD_SCHUL_CODE: schulCode,
          MLSV_YMD: yyyymmdd
        },
        timeout: 5000
      })

      if (res.data?.mealServiceDietInfo?.[1]?.row?.[0]?.DDISH_NM) {
        let menuStr = res.data.mealServiceDietInfo[1].row[0].DDISH_NM
        menuStr = menuStr.replace(/\([^)]*\)/g, '')
        const menus = menuStr.split('<br/>').map((m: string) => m.trim()).filter(Boolean)
        return { success: true, data: menus }
      } else {
        return { success: false, error: '급식 정보가 없습니다.' }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })
}
