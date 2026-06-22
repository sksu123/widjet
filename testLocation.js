const axios = require('axios');
const cheerio = require('cheerio');

async function testWeather() {
  try {
    const query = encodeURIComponent(`날씨`);
    const res = await axios.get(`https://search.naver.com/search.naver?query=${query}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000
    });
    
    const $ = cheerio.load(res.data);
    
    const tempText = $('.temperature_text strong').first().text().replace(/[^\d.-]/g, '');
    const summary = $('.weather_main').first().text().trim() || '맑음';
    
    // 위치 정보 찾기
    const location = $('.title_area h2.title').text().trim() || $('.select_box .current_box').text().trim();
    
    console.log({ temp: tempText, summary, location });
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

testWeather();
