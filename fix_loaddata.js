const fs = require('fs');
let code = fs.readFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

const oldPromise = \const [weatherRes, todayRes, ddayRes, userRes, settingsRes, mealRes, contactsRes] = await Promise.all([
        window.api.calendar.getWeather(),
        window.api.calendar.getToday(),
        window.api.calendar.getDday(),
        window.api.db.getUser(),\;

const newPromise = \const [weatherRes, todayRes, ddayRes, monthRes, userRes, settingsRes, mealRes, contactsRes] = await Promise.all([
        window.api.calendar.getWeather(),
        window.api.calendar.getToday(),
        window.api.calendar.getDday(),
        window.api.calendar.getMonthSchedules ? window.api.calendar.getMonthSchedules(new Date().getFullYear(), new Date().getMonth() + 1) : Promise.resolve({ success: false }),
        window.api.db.getUser(),\;

code = code.replace(oldPromise, newPromise);

const oldSet = \if (todayRes.success) setTodaySchedules(todayRes.data as Schedule[])
      if (ddayRes.success) setDdays(ddayRes.data as Schedule[])
      if (userRes.success) setUser(userRes.data as User)\;

const newSet = \if (todayRes.success) setTodaySchedules(todayRes.data as Schedule[])
      if (ddayRes.success) setDdays(ddayRes.data as Schedule[])
      if (monthRes && monthRes.success) setMonthSchedules(monthRes.data as Schedule[])
      if (userRes.success) setUser(userRes.data as User)\;

code = code.replace(oldSet, newSet);

fs.writeFileSync('src/renderer/src/pages/Dashboard/Dashboard.tsx', code);
console.log('Fixed loadData');
