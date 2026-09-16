const axios = require('axios');
const cheerio = require('cheerio');
axios.get('https://search.naver.com/search.naver?query=서울 날씨', { headers: { 'User-Agent': 'Mozilla/5.0' } }).then(res => {
  const $ = cheerio.load(res.data);
  const weekItem = $('.week_item').first().html();
  console.log(weekItem);
});
