const fs = require('fs');

const tsxPath = 'd:/widget/src/main/ipc/calendar.handler.ts';
let content = fs.readFileSync(tsxPath, 'utf8');

const newWeatherLogic = `
  // 날씨 정보 가져오기 (네이버 날씨 스크래핑 연동)
  ipcMain.handle('calendar:get-weather', async (_, forceRefresh = false) => {
    try {
      const db = getDb()
      const getSetting = (key: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string })?.value || ''
      
      let city = getSetting('weather_city') || '서울특별시 동작구 동작동'
      const intervalMin = parseInt(getSetting('weather_interval') || '30', 10)
      const intervalMs = intervalMin * 60 * 1000

      const now = Date.now()
      if (!forceRefresh && cachedWeather && (now - lastWeatherFetchTime) < intervalMs) {
        return { success: true, data: cachedWeather }
      }

      const searchUrl = \`https://search.naver.com/search.naver?query=\${encodeURIComponent(city + ' 날씨')}\`
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
      
      const pm10 = $('.today_chart_list .item_info:contains("미세먼지") .txt').text().trim() || ''
      const pm25 = $('.today_chart_list .item_info:contains("초미세먼지") .txt').text().trim() || ''
      const uv = $('.today_chart_list .item_info:contains("자외선") .txt').text().trim() || ''
      const ozone = $('.today_chart_list .item_info:contains("오존") .txt').text().trim() || ''
      
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
      if (cachedWeather) return { success: true, data: cachedWeather }
      return {
        success: true,
        data: {
          city: '날씨 오류', temp: '--', compareYm: '', description: '오류', feels_like: '--', humidity: '--', wind: '--',
          pm10: '--', pm25: '--', uv: '--', ozone: '--', icon: '01d', hourly: [], weekly: [], updatedAt: '--'
        }
      }
    }
  })
`;

// Replace from: // 날씨 정보 가져오기 (기상청 동네예보 RSS 연동)
// To: // 오늘 일정 가져오기
const startIndex = content.indexOf('// 날씨 정보 가져오기 (기상청 동네예보 RSS 연동)');
const endIndex = content.indexOf('// 오늘 일정 가져오기');

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + newWeatherLogic + '\n\n  ' + content.substring(endIndex);
  fs.writeFileSync(tsxPath, content);
  console.log('Successfully updated get-weather logic');
} else {
  console.error('Could not find boundaries for replacement');
}
