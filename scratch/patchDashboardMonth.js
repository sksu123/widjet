const fs = require('fs');

let code = fs.readFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', 'utf8');

// 1. loadData target
code = code.replace(
  `        window.api.calendar.getDday(),\n        window.api.db.getUser(),`,
  `        window.api.calendar.getDday(),\n        window.api.db.getSchedules(),\n        window.api.db.getUser(),`
);

// 2. loadData Promise array
code = code.replace(
  `const [weatherRes, todayRes, ddayRes, userRes, settingsRes, mealRes, contactsRes] = await Promise.all([`,
  `const [weatherRes, todayRes, ddayRes, monthRes, userRes, settingsRes, mealRes, contactsRes] = await Promise.all([`
);

// 3. state assignments
code = code.replace(
  `      if (todayRes.success) setTodaySchedules(todayRes.data as Schedule[])\n      if (ddayRes.success) setDdays(ddayRes.data as Schedule[])\n      if (userRes.success) setUser(userRes.data as User)`,
  `      if (todayRes.success) setTodaySchedules(todayRes.data as Schedule[])\n      if (ddayRes.success) setDdays(ddayRes.data as Schedule[])\n      if (monthRes && monthRes.success) setMonthSchedules(monthRes.data as Schedule[])\n      if (userRes.success) setUser(userRes.data as User)`
);

// 4. state variable
code = code.replace(
  `const [ddays, setDdays] = useState<Schedule[]>([])`,
  `const [ddays, setDdays] = useState<Schedule[]>([])\n  const [monthSchedules, setMonthSchedules] = useState<Schedule[]>([])`
);

// 5. Calendar dots calculation
code = code.replace(
  `const daySchedules = ddays.filter(s => isSameDay(new Date(s.start_date), day))`,
  `const daySchedules = monthSchedules.filter(s => isSameDay(new Date(s.start_date), day))`
);

fs.writeFileSync('d:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx', code, 'utf8');
console.log('Fixed Dashboard month schedules');
