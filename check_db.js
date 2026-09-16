const Database = require('better-sqlite3');
const db = new Database('C:/Users/user/AppData/Roaming/school-admin-widget/database.sqlite');
console.log(db.prepare('PRAGMA table_info(rule_pages)').all());
