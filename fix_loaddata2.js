const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

const regex1 = /const \[weatherRes, todayRes, ddayRes, userRes, settingsRes, mealRes, contactsRes\] = await Promise\.all\(\[\s*window\.api\.calendar\.getWeather\(\),\s*window\.api\.calendar\.getToday\(\),\s*window\.api\.calendar\.getDday\(\),\s*window\.api\.db\.getUser\(\),/;

const newPromise = \const [weatherRes, todayRes, ddayRes, monthRes, userRes, settingsRes, mealRes, contactsRes] = await Promise.all([
        window.api.calendar.getWeather(),
        window.api.calendar.getToday(),
        window.api.calendar.getDday(),
        window.api.calendar.getMonthSchedules ? window.api.calendar.getMonthSchedules(new Date().getFullYear(), new Date().getMonth() + 1) : Promise.resolve({ success: false }),
        window.api.db.getUser(),\;

code = code.replace(regex1, newPromise);

const regex2 = /if \(todayRes\.success\) setTodaySchedules\(todayRes\.data as Schedule\[\]\)\s*if \(ddayRes\.success\) setDdays\(ddayRes\.data as Schedule\[\]\)\s*if \(userRes\.success\) setUser\(userRes\.data as User\)/;

const newSet = \if (todayRes.success) setTodaySchedules(todayRes.data as Schedule[])
      if (ddayRes.success) setDdays(ddayRes.data as Schedule[])
      if (monthRes && monthRes.success) setMonthSchedules(monthRes.data as Schedule[])
      if (userRes.success) setUser(userRes.data as User)\;

code = code.replace(regex2, newSet);

// Also need to fix loadSchoolSchedule! 
// When user clicks prev/next month on the calendar, we need to load monthSchedules for that month!
const regex3 = /loadSchoolSchedule\(year: number, month: number\) {/;
const newLoad = \loadSchoolSchedule(year: number, month: number) {
    if (window.api.calendar.getMonthSchedules) {
      window.api.calendar.getMonthSchedules(year, month).then(res => {
        if (res.success) setMonthSchedules(res.data as Schedule[])
      })
    }\;

code = code.replace(regex3, newLoad);

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Fixed loadData properly');
