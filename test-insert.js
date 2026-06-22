const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'database', 'school-admin.db');
  console.log('DB Path:', dbPath);
  const db = new Database(dbPath);
  
  try {
    const insert = db.prepare(`
      INSERT INTO contacts (type, name, department, phone, mobile, ceo_name, email)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const dummyData = [
      ['staff', '테스트교직원1', '행정실', '101', '010-1111-1111', '', 'test1@school.com'],
      ['staff', '김철수주무관', '행정실', '102', '010-2222-2222', '', 'kim@school.com'],
      ['company', '알파문구', '', '02-111-1111', '010-3333-3333', '이대표', 'alpha@test.com'],
      ['company', '오피스디포', '', '02-222-2222', '010-4444-4444', '박대표', 'office@test.com'],
    ];

    db.transaction(() => {
      for (const data of dummyData) {
        insert.run(...data);
      }
    })();
    
    console.log('가상 연락처 데이터 추가 완료!');
  } catch (error) {
    console.error('데이터 추가 중 오류:', error);
  } finally {
    db.close();
    app.quit();
  }
});
