const axios = require('axios');
const cheerio = require('cheerio');

async function testWeather(city) {
  try {
    const query = encodeURIComponent(`${city} 날씨`)
    const res = await axios.get(`https://search.naver.com/search.naver?query=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    })
    
    const $ = cheerio.load(res.data)
    
    const tempText = $('.temperature_text strong').first().text().replace(/[^\d.-]/g, '')
    const summary = $('.weather_main').first().text().trim() || '맑음'
    let compareYm = $('.temperature_info .temperature').first().text().trim()
    if (compareYm.startsWith('어제보다 ')) compareYm = compareYm.substring(5)

    let feelsLike = '', humidity = '', wind = ''
    $('.summary_list .sort').each((i, el) => {
      const term = $(el).find('.term').text()
      const desc = $(el).find('.desc').text()
      if (term.includes('체감')) feelsLike = desc
      if (term.includes('습도')) humidity = desc
      if (term.includes('바람') || term.includes('풍향') || term.includes('풍속') || term.includes('풍')) wind = term + ' ' + desc
    })

    let pm10 = '', pm25 = '', uv = ''
    $('.today_chart_list .item_today').each((i, el) => {
      const title = $(el).find('.title').text().trim()
      const text = $(el).find('.txt').text().trim()
      if (title.includes('미세먼지') && !title.includes('초')) pm10 = text
      if (title.includes('초미세먼지')) pm25 = text
      if (title.includes('자외선')) uv = text
    })

    console.log({ temp: tempText, summary, compareYm, feelsLike, humidity, wind, pm10, pm25, uv })
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

testWeather('Seoul');
