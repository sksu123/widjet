import { ipcMain } from 'electron'
import axios from 'axios'
import * as cheerio from 'cheerio'
import { getDb } from '../db/database'
import { triggerCloudSync } from '../cloud/cloudSyncManager'

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
  
  // 날씨 정보 가져오기 (Open-Meteo + 기상청 KMA 보완)
  ipcMain.handle('calendar:get-weather', async (_, forceRefresh = false) => {
    try {
      const db = getDb()
      const getSetting = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string })?.value || ''
      
      let city = getSetting('weather_city') || '서울특별시 동작구'
      const intervalMin = parseInt(getSetting('weather_interval') || '30', 10)
      const intervalMs = intervalMin * 60 * 1000

      const now = Date.now()
      if (!forceRefresh && cachedWeather && cachedWeather.originalCity === city && (now - lastWeatherFetchTime) < intervalMs) {
        return { success: true, data: cachedWeather }
      }

      // 1. Get Lat/Lon
      // Use fallback map for provinces
      const provinceCoords: Record<string, { lat: number, lon: number }> = {
        '서울': { lat: 37.5665, lon: 126.9780 },
        '경기': { lat: 37.2752, lon: 127.0095 },
        '인천': { lat: 37.4563, lon: 126.7052 },
        '강원': { lat: 37.8854, lon: 127.7298 },
        '대전': { lat: 36.3504, lon: 127.3845 },
        '세종': { lat: 36.4800, lon: 127.2890 },
        '충남': { lat: 36.6588, lon: 126.6728 },
        '충북': { lat: 36.6356, lon: 127.4913 },
        '광주': { lat: 35.1595, lon: 126.8526 },
        '전남': { lat: 34.8161, lon: 126.4629 },
        '전북': { lat: 35.8202, lon: 127.1086 },
        '부산': { lat: 35.1796, lon: 129.0756 },
        '울산': { lat: 35.5393, lon: 129.3114 },
        '경남': { lat: 35.2383, lon: 128.6922 },
        '대구': { lat: 35.8714, lon: 128.6014 },
        '경북': { lat: 36.5760, lon: 128.5056 },
        '제주': { lat: 33.4890, lon: 126.4983 }
      };

      let lat = 37.5665;
      let lon = 126.9780;
      let kmaZone = getSetting('weather_zone') || '1111000000'; // Default Jongno

      // Parse city to find province
      for (const [prov, coords] of Object.entries(provinceCoords)) {
        if (city.startsWith(prov)) {
          lat = coords.lat;
          lon = coords.lon;
          break;
        }
      }

      // 2. Fetch Open-Meteo Weather
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
      
      // 3. Fetch Open-Meteo Air Quality (for AI Briefing)
      const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,ozone`;
      
      const [weatherRes, airRes] = await Promise.all([
        axios.get(weatherUrl, { timeout: 10000 }).catch(() => null),
        axios.get(airUrl, { timeout: 10000 }).catch(() => null)
      ]);

      if (!weatherRes || !weatherRes.data) throw new Error('Weather API failed');

      const current = weatherRes.data.current;
      const daily = weatherRes.data.daily;
      const air = airRes?.data?.current || {};

      // Convert WMO code to our icon names and text
      const wmoToIcon = (code: number) => {
        if ([0, 1].includes(code)) return { icon: '01d', text: '맑음' };
        if ([2].includes(code)) return { icon: '02d', text: '구름조금' };
        if ([3].includes(code)) return { icon: '03d', text: '흐림' };
        if ([45, 48].includes(code)) return { icon: '50d', text: '안개' };
        if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { icon: '09d', text: '비' };
        if ([71, 73, 75, 77, 85, 86].includes(code)) return { icon: '13d', text: '눈' };
        if ([95, 96, 99].includes(code)) return { icon: '11d', text: '뇌우' };
        return { icon: '01d', text: '맑음' };
      };

      const currWeather = wmoToIcon(current.weather_code);

      // KMA RSS Supplement
      let kmaSupplement = '특보 없음';
      try {
        const rssRes = await axios.get(`http://www.kma.go.kr/weather/forecast/mid-term-rss3.jsp?stnId=108`, { timeout: 5000 });
        const $ = cheerio.load(rssRes.data, { xmlMode: true });
        const wf = $('header wf').first().text().replace(/<br\s*\/?>/gi, ' ').trim();
        if (wf) kmaSupplement = wf.split('. ')[0] + '.'; // Get just the first sentence
      } catch (e) {}

      // Map daily forecast
      const weeklyList: any[] = [];
      const days = ['일', '월', '화', '수', '목', '금', '토'];
      if (daily && daily.time) {
        for (let i = 0; i < Math.min(daily.time.length, 7); i++) {
          const dateObj = new Date(daily.time[i]);
          const isToday = i === 0;
          weeklyList.push({
            day: days[dateObj.getDay()],
            date: `${dateObj.getMonth()+1}.${dateObj.getDate()}.`,
            icon: wmoToIcon(daily.weather_code[i]).icon,
            rain: daily.precipitation_probability_max[i] + '%',
            low: Math.round(daily.temperature_2m_min[i]),
            high: Math.round(daily.temperature_2m_max[i])
          });
        }
      }

      const weatherData = {
        originalCity: city,
        city: city.split(' ').pop() || city,
        temp: Math.round(current.temperature_2m).toString(),
        compareYm: '',
        description: currWeather.text,
        feels_like: Math.round(current.apparent_temperature).toString() + '°',
        humidity: current.relative_humidity_2m + '%',
        wind: daily.precipitation_probability_max[0] + '%', // We use 'wind' field to pass current precipitation probability to UI!
        pm10: air.pm10 ? air.pm10 + ' ㎍/㎥' : '정보없음',
        pm25: air.pm2_5 ? air.pm2_5 + ' ㎍/㎥' : '정보없음',
        uv: '정보없음',
        ozone: air.ozone ? air.ozone + ' ㎍/㎥' : '정보없음',
        icon: currWeather.icon,
        weekly: weeklyList,
        kma: kmaSupplement // Pass KMA string
      }

      cachedWeather = weatherData
      lastWeatherFetchTime = Date.now()

      return { success: true, data: weatherData }
    } catch (err: any) {
      console.error('[Weather API Error]', err)
      return { success: false, error: err.message || '날씨 정보를 가져오는 데 실패했습니다.' }
    }
  })

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
        timeout: 10000
      })

      // NEIS API 결과 코드 확인
      const resultCode = res.data?.SchoolSchedule?.[0]?.head?.[1]?.RESULT?.CODE
      if (resultCode && resultCode !== 'INFO-000' && resultCode !== 'INFO-200') {
        return { success: false, error: `NEIS 오류 (${resultCode})` }
      }

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
      if (message.includes('timeout') || message.includes('ECONNREFUSED') || message.includes('ENOTFOUND')) {
        return { success: false, error: 'NEIS 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.' }
      }
      return { success: false, error: message }
    }
  })

  // ===== 오늘의 일정 =====
  ipcMain.handle('calendar:get-today', async () => {
    try {
      const db = getDb()
      const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      const rows = db.prepare(
        'SELECT * FROM schedules WHERE start_date = ? ORDER BY id'
      ).all(today)
      return { success: true, data: rows }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ===== 이달 전체 일정 (캘린더 표시용) =====
  ipcMain.handle('calendar:get-month', async (_, year: number, month: number) => {
    try {
      const db = getDb()
      const from = `${year}-${String(month).padStart(2,'0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const to = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
      const rows = db.prepare(
        'SELECT * FROM schedules WHERE start_date BETWEEN ? AND ? ORDER BY start_date'
      ).all(from, to)
      return { success: true, data: rows }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ===== D-Day 임박 일정 =====
  ipcMain.handle('calendar:get-dday', async () => {
    try {
      const db = getDb()
      const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      const rows = db.prepare(`
        SELECT *,
          CAST((julianday(start_date) - julianday(?)) AS INTEGER) as days_left
        FROM schedules
        WHERE start_date >= ? AND is_completed = 0
        ORDER BY start_date ASC
        LIMIT 10
      `).all(today, today)
      return { success: true, data: rows }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ===== 일정 완료 토글 =====
  ipcMain.handle('calendar:toggle-schedule-status', async (_, id: number, is_completed: number) => {
    try {
      const db = getDb()
      db.prepare('UPDATE schedules SET is_completed = ? WHERE id = ?').run(is_completed, id)
      triggerCloudSync()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ===== 급식 정보 (NEIS API) =====
  ipcMain.handle('calendar:get-meal', async (_, targetDate?: string) => {
    try {
      const db = getDb()
      const getSetting = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string })?.value || ''
      const atptCode = getSetting('neis_atpt_code')
      const schulCode = getSetting('neis_schul_code')

      if (!atptCode || !schulCode) {
        return { success: false, error: 'NEIS_NOT_CONFIGURED' }
      }

      const neisApiKey = 'f9d02db8153641808a29b9bb8f8df247'
      const today = targetDate || new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10).replace(/-/g, '')
      
      const res = await axios.get('https://open.neis.go.kr/hub/mealServiceDietInfo', {
        params: {
          KEY: neisApiKey,
          Type: 'json',
          pIndex: 1,
          pSize: 10,
          ATPT_OFCDC_SC_CODE: atptCode,
          SD_SCHUL_CODE: schulCode,
          MLSV_FROM_YMD: today,
          MLSV_TO_YMD: today
        },
        timeout: 10000
      })

      const resultCode = res.data?.mealServiceDietInfo?.[0]?.head?.[1]?.RESULT?.CODE
      if (resultCode && resultCode !== 'INFO-000' && resultCode !== 'INFO-200') {
        return { success: false, error: `NEIS 오류 (${resultCode})` }
      }

      if (res.data?.mealServiceDietInfo?.[1]?.row) {
        const mealTypeMap: Record<string, string> = { '1': '조식', '2': '중식', '3': '석식' }
        const meals = res.data.mealServiceDietInfo[1].row.map((r: any) => ({
          type: r.MMEAL_SC_CODE,
          typeName: mealTypeMap[r.MMEAL_SC_CODE] || r.MMEAL_SC_NM,
          menus: r.DDISH_NM.split('<br/>').map((m: string) => m.trim().replace(/s*(.*?)/g, '')).filter(Boolean),
          kcal: r.CAL_INFO || ''
        }))
        return { success: true, data: meals }
      } else {
        return { success: false, error: 'MEAL_NOT_FOUND' }
      }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

  // ===== 학교 검색 =====
  ipcMain.handle('calendar:search-school', async (_, schoolName: string) => {
    try {
      if (!schoolName || schoolName.trim() === '') return { success: true, data: [] }
      const neisApiKey = 'f9d02db8153641808a29b9bb8f8df247'
      const res = await axios.get('https://open.neis.go.kr/hub/schoolInfo', {
        params: {
          KEY: neisApiKey,
          Type: 'json',
          pIndex: 1,
          pSize: 10,
          SCHUL_NM: schoolName
        },
        timeout: 10000
      })
      if (res.data?.schoolInfo?.[1]?.row) {
        return { success: true, data: res.data.schoolInfo[1].row }
      }
      return { success: true, data: [] }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  })

}
