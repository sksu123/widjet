const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function testWeather() {
  try {
    const res = await axios.get('https://search.naver.com/search.naver?query=%EB%82%A0%EC%94%A8', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    fs.writeFileSync('weather.html', res.data);
    const $ = cheerio.load(res.data);
    
    // PC 네이버 날씨 검색결과 구조
    const temp = $('.temperature_text strong').first().text().replace(/[^\d.-]/g, '');
    const summary = $('.weather_main').first().text().trim();
    const compareYm = $('.temperature_info .temperature').first().text().trim(); // 어제보다 ~ 높아요
    
    let feelsLike = '', humidity = '', wind = '';
    $('.summary_list .sort').each((i, el) => {
      const term = $(el).find('.term').text();
      const desc = $(el).find('.desc').text();
      if (term.includes('체감')) feelsLike = desc;
      if (term.includes('습도')) humidity = desc;
      if (term.includes('바람') || term.includes('풍향') || term.includes('풍속')) wind = desc;
    });

    let pm10 = '', pm25 = '', uv = '';
    $('.today_chart_list .item_info').each((i, el) => {
      const text = $(el).text();
      if (text.includes('미세먼지') && !text.includes('초미세먼지')) pm10 = text.replace('미세먼지', '').trim();
      if (text.includes('초미세먼지')) pm25 = text.replace('초미세먼지', '').trim();
      if (text.includes('자외선')) uv = text.replace('자외선', '').trim();
    });

    console.log({
      temp, summary, compareYm, feelsLike, humidity, wind, pm10, pm25, uv
    });
  } catch (err) {
    console.error(err.message);
  }
}

testWeather();
