import { ipcMain } from 'electron'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { getDb } from '../db/database'

// 날씨 아이콘 분류 헬퍼
function getNaverWeatherIcon($: cheerio.CheerioAPI, el: cheerio.Cheerio<any>): string {
  const cls = el.attr('class') || ''
  const title = el.attr('title') || ''
  const alt = el.attr('alt') || ''
  const txt = cls + title + alt
  if (txt.includes('rain') || txt.includes('비')) return '09d'
  if (txt.includes('snow') || txt.includes('눈')) return '13d'
  if (txt.includes('cloud') || txt.includes('흐') || txt.includes('구름')) return '03d'
  return '01d'
}

let cachedWeather: any = null
let lastWeatherFetchTime = 0

export function registerCalendarHandlers(): void {

  
  // 날씨 정보 가져오기 (네이버 날씨 스크래핑 연동)
  ipcMain.handle('calendar:get-weather', async (_, forceRefresh = false) => {
    try {
      const db = getDb()
      const getSetting = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string })?.value || ''
      
      let city = getSetting('weather_city') || '서울특별시 동작구 동작동'
      const intervalMin = parseInt(getSetting('weather_interval') || '30', 10)
      const intervalMs = intervalMin * 60 * 1000

      const now = Date.now()
      if (!forceRefresh && cachedWeather && cachedWeather.originalCity === city && (now - lastWeatherFetchTime) < intervalMs) {
        return { success: true, data: cachedWeather }
      }

      const searchUrl = `https://search.naver.com/search.naver?query=${encodeURIComponent(city + ' 날씨')}`
      const res = await axios.get(searchUrl, { 
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 10000 
      })
      const $ = cheerio.load(res.data)

      const currentTemp = $('.temperature_text strong').first().text().replace('현재 온도', '').replace('°', '').trim() || '0'
      const summary = $('.weather_main').first().text().trim() || $('.summary .weather').first().text().trim() || '맑음'
      const compareYm = $('.summary .temperature').first().text().trim() || ''
      
      const feelsLike = $('.summary_list .sort:contains("체감") .desc').text().trim() || ''
      const humidity = $('.summary_list .sort:contains("습도") .desc').text().trim() || ''
      const wind = $('.summary_list .sort:contains("바람") .desc').text().trim() || ''
      
      const pm10 = $('.item_today:has(.title:contains("미세먼지")) .txt').first().text().trim() || ''
      const pm25 = $('.item_today:has(.title:contains("초미세먼지")) .txt').first().text().trim() || ''
      const uv = $('.item_today:has(.title:contains("자외선")) .txt').first().text().trim() || ''
      const ozone = $('.item_today:has(.title:contains("오존")) .txt').first().text().trim() || ''
      
      let icon = '01d'
      if (summary.includes('구름') || summary.includes('흐')) icon = '03d'
      if (summary.includes('비') || summary.includes('소나기')) icon = '09d'
      if (summary.includes('눈')) icon = '13d'

      // 주간 예보 파싱
      const weeklyList: any[] = []
      $('.week_item').each((i, el) => {
        const day = $(el).find('.day').text().trim()
        const date = $(el).find('.date').text().trim()
        const amRain = $(el).find('.cell_weather').eq(0).find('.weather_inner .rainfall').text().trim()
        const pmRain = $(el).find('.cell_weather').eq(1).find('.weather_inner .rainfall').text().trim()
        const amIconStr = $(el).find('.cell_weather').eq(0).find('i').attr('class') || ''
        const pmIconStr = $(el).find('.cell_weather').eq(1).find('i').attr('class') || ''
        const lowTemp = $(el).find('.temperature_inner .lowest').text().replace('최저기온', '').replace('°', '').trim()
        const highTemp = $(el).find('.temperature_inner .highest').text().replace('최고기온', '').replace('°', '').trim()

        if (day) {
          weeklyList.push({
            day, date,
            amIcon: amIconStr.includes('rain') ? '09d' : amIconStr.includes('cloud') ? '03d' : '01d',
            pmIcon: pmIconStr.includes('rain') ? '09d' : pmIconStr.includes('cloud') ? '03d' : '01d',
            amRain, pmRain, low: lowTemp, high: highTemp
          })
        }
      })

      const weatherData = {
        originalCity: city,
        city: city.split(' ').pop() || city,
        temp: currentTemp,
        compareYm,
        description: summary,
        feels_like: feelsLike,
        humidity,
        wind,
        pm10,
        pm25,
        uv,
        ozone,
        icon,
        hourly: [],
        weekly: weeklyList,
        updatedAt: new Date().toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      }

      cachedWeather = weatherData
      lastWeatherFetchTime = Date.now()

      return { success: true, data: weatherData }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[날씨] API 오류:', message)
      if (cachedWeather && cachedWeather.originalCity === city) return { success: true, data: cachedWeather }
      return {
        success: true,
        data: {
          city: '날씨 오류', temp: '--', compareYm: '', description: '오류', feels_like: '--', humidity: '--', wind: '--',
          pm10: '--', pm25: '--', uv: '--', ozone: '--', icon: '01d', hourly: [], weekly: [], updatedAt: '--'
        }
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

  ipcMain.handle('calendar:get-meal', async (_, targetDate?: string) => {
    try {
      const db = getDb()
      const getSetting = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string })?.value || ''
      const neisApiKey = 'f9d02db8153641808a29b9bb8f8df247' // 기본 API 키 적용
      const atptCode = getSetting('neis_atpt_code')
      const schulCode = getSetting('neis_schul_code')

      if (!atptCode || !schulCode) {
        return { success: false, error: 'NEIS_NOT_CONFIGURED' }
      }

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
          pSize: 3,
          ATPT_OFCDC_SC_CODE: atptCode,
          SD_SCHUL_CODE: schulCode,
          MLSV_YMD: yyyymmdd
        },
        timeout: 5000
      })

      if (res.data?.mealServiceDietInfo?.[1]?.row) {
        const rows = res.data.mealServiceDietInfo[1].row;
        const meals = rows.map((row: any) => {
          let menuStr = row.DDISH_NM
          menuStr = menuStr.replace(/\([^)]*\)/g, '')
          const menus = menuStr.split('<br/>').map((m: string) => m.trim()).filter(Boolean)
          const kcal = row.CAL_INFO || ''
          return {
            type: row.MMEAL_SC_CODE, // '1' 조식, '2' 중식, '3' 석식
            typeName: row.MMEAL_SC_NM,
            menus,
            kcal
          }
        })
        return { success: true, data: meals }
      } else {
        return { success: false, error: '급식 정보가 없습니다.' }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 나이스 API 학교 검색
  ipcMain.handle('calendar:search-school', async (_, schoolName: string) => {
    try {
      if (!schoolName || schoolName.trim() === '') {
        return { success: false, error: '학교명을 입력하세요.' }
      }
      
      const neisApiKey = 'f9d02db8153641808a29b9bb8f8df247'
      const res = await axios.get('https://open.neis.go.kr/hub/schoolInfo', {
        params: {
          KEY: neisApiKey,
          Type: 'json',
          pIndex: 1,
          pSize: 100,
          SCHUL_NM: schoolName
        },
        timeout: 5000
      })

      if (res.data?.schoolInfo?.[1]?.row) {
        const schools = res.data.schoolInfo[1].row.map((s: any) => ({
          schoolName: s.SCHUL_NM,
          officeCode: s.ATPT_OFCDC_SC_CODE,
          officeName: s.ATPT_OFCDC_SC_NM,
          schoolCode: s.SD_SCHUL_CODE
        }))
        return { success: true, data: schools }
      } else {
        return { success: true, data: [] }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 날씨 지역 검색 (네이버 지역 자동완성)
  ipcMain.handle('calendar:search-weather-city', async (_, query: string) => {
    try {
      if (!query || query.trim() === '') return { success: true, data: [] }
      const res = await axios.get(
        `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(query + ' 날씨')}&con=1&frm=nv&ans=2&ht=1&fm=1`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }, timeout: 5000 }
      )
      // 네이버 자동완성 응답에서 지역명 추출
      const items: string[] = []
      if (res.data?.items?.[0]) {
        for (const item of res.data.items[0]) {
          const name = (item[0] || '').replace(' 날씨', '').trim()
          if (name && !items.includes(name)) items.push(name)
        }
      }
      return { success: true, data: items.slice(0, 8) }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })

  // 나이스 API 월간 학사일정 가져오기
  ipcMain.handle('calendar:get-school-schedule', async (_, year: number, month: number) => {
    try {
      const db = getDb()
      const getSetting = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string })?.value || ''
      const atptCode = getSetting('neis_atpt_code')
      const schulCode = getSetting('neis_schul_code')

      if (!atptCode || !schulCode) {
        return { success: false, error: 'NEIS_NOT_CONFIGURED' }
      }

      const neisApiKey = 'f9d02db8153641808a29b9bb8f8df247'
      const ym = `${year}${String(month).padStart(2, '0')}`
      const fromYmd = `${ym}01`
      const lastDay = new Date(year, month, 0).getDate()
      const toYmd = `${ym}${String(lastDay).padStart(2, '0')}`

      const res = await axios.get('https://open.neis.go.kr/hub/SchoolSchedule', {
        params: {
          KEY: neisApiKey,
          Type: 'json',
          pIndex: 1,
          pSize: 100,
          ATPT_OFCDC_SC_CODE: atptCode,
          SD_SCHUL_CODE: schulCode,
          AA_FROM_YMD: fromYmd,
          AA_TO_YMD: toYmd
        },
        timeout: 7000
      })

      if (res.data?.SchoolSchedule?.[1]?.row) {
        const rows = res.data.SchoolSchedule[1].row.map((r: any) => ({
          date: r.AA_YMD,           // 'YYYYMMDD'
          eventName: r.EVENT_NM,   // '개학식' 등
          isHoliday: r.SBTR_DD_SC_NM === '공휴일' || r.SBTR_DD_SC_NM === '방학'
        }))
        return { success: true, data: rows }
      } else {
        return { success: true, data: [] }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      return { success: false, error: message }
    }
  })
}
