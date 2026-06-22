const cheerio = require('cheerio');
const fs = require('fs');
const $ = cheerio.load(fs.readFileSync('weather.html'));

console.log("CHART LIST TEXT:", $('.today_chart_list').text());
console.log("SUMMARY LIST TEXT:", $('.summary_list').text());

let pm10 = '', pm25 = '', uv = '';
$('.today_chart_list .item_today').each((i, el) => {
  const title = $(el).find('.title').text().trim();
  const text = $(el).find('.txt').text().trim();
  if (title.includes('미세먼지') && !title.includes('초')) pm10 = text;
  if (title.includes('초미세먼지')) pm25 = text;
  if (title.includes('자외선')) uv = text;
});

let wind = '';
$('.summary_list .sort').each((i, el) => {
  const term = $(el).find('.term').text();
  const desc = $(el).find('.desc').text();
  if (term.includes('바람') || term.includes('풍향') || term.includes('풍속') || term.includes('풍')) wind = term + ' ' + desc;
});

console.log({ pm10, pm25, uv, wind });
