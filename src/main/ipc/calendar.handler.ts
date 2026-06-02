import { ipcMain } from 'electron'
import axios from 'axios'
import { getDb } from '../db/database'

export function registerCalendarHandlers(): void {

  // 날씨 정보 가져오기
  ipcMain.handle('calendar:get-weather', async (_, city = '서울') => {
    try {
      const db = getDb()
      const row = db.prepare("SELECT value FROM settings WHERE key = 'weather_api_key'").get() as { value: string } | undefined
      const apiKey = row?.value || process.env.WEATHER_API_KEY || ''

      if (!apiKey) {
        // API 키 없을 때 더미 데이터 반환
        return {
          success: true,
          data: {
            city,
            temp: 24,
            feels_like: 26,
            humidity: 65,
            description: '맑음',
            icon: '01d',
            wind_speed: 2.5
          }
        }
      }

      const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather`, {
        params: {
          q: city,
          appid: apiKey,
          units: 'metric',
          lang: 'kr'
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
      return { success: false, error: message }
    }
  })

  // 오늘 일정 가져오기
  ipcMain.handle('calendar:get-today', async () => {
    try {
      const db = getDb()
      const today = new Date().toISOString().split('T')[0]
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
      const today = new Date().toISOString().split('T')[0]
      const rows = db.prepare(`
        SELECT *, 
          CAST((julianday(date(start_date)) - julianday(?)) AS INTEGER) AS days_left
        FROM schedules
        WHERE date(start_date) >= ?
        ORDER BY start_date ASC
        LIMIT 5
      `).all(today, today)
      return { success: true, data: rows }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })
}
