const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://search.naver.com/search.naver?query=서울특별시+날씨', { headers: { 'User-Agent': 'Mozilla/5.0' } })
  .then(res => {
    const $ = cheerio.load(res.data);
    const pm10 = $('.item_today:has(.title:contains("미세먼지")) .txt').first().text().trim();
    const pm25 = $('.item_today:has(.title:contains("초미세먼지")) .txt').first().text().trim();
    console.log('미세먼지:', pm10);
    console.log('초미세먼지:', pm25);
  });
