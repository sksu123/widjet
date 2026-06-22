import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database

export function getDb(): Database.Database {
  return db
}

export async function setupDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'database')

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  const dbPath = join(dbDir, 'school-admin.db')
  db = new Database(dbPath)

  // WAL 모드로 성능 향상
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // 스키마 생성
  createTables()
  seedInitialData()

  // 마이그레이션: contacts 테이블에 is_favorite, sort_order 컬럼이 없을 경우 추가
  try { db.exec('ALTER TABLE contacts ADD COLUMN is_favorite INTEGER DEFAULT 0'); } catch(e) {}
  try { db.exec('ALTER TABLE contacts ADD COLUMN sort_order INTEGER DEFAULT 0'); } catch(e) {}

  console.log('✅ Database initialized:', dbPath)
}

function createTables(): void {
  db.exec(`
    -- 사용자 설정
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '관리자',
      role TEXT NOT NULL DEFAULT 'staff',
      school_name TEXT NOT NULL DEFAULT '○○학교',
      department TEXT DEFAULT '행정실',
      email TEXT,
      avatar_color TEXT DEFAULT '#3b82f6',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 앱 설정
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 학교 일정
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      start_date DATETIME NOT NULL,
      end_date DATETIME,
      category TEXT DEFAULT 'general',
      color TEXT DEFAULT '#3b82f6',
      recurrence_rule TEXT,
      reminder_minutes INTEGER DEFAULT 30,
      is_all_day INTEGER DEFAULT 0,
      is_completed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 공문/문서 템플릿
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT,
      file_path TEXT,
      tags TEXT,
      use_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 법인카드
    CREATE TABLE IF NOT EXISTS corporate_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_name TEXT NOT NULL,
      card_number TEXT,
      is_available INTEGER DEFAULT 1,
      borrower_name TEXT,
      borrower_dept TEXT,
      borrowed_at DATETIME,
      due_date DATETIME,
      purpose TEXT,
      returned_at DATETIME,
      notes TEXT
    );

    -- 법인카드 이력
    CREATE TABLE IF NOT EXISTS card_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER NOT NULL,
      borrower_name TEXT NOT NULL,
      borrower_dept TEXT,
      borrowed_at DATETIME NOT NULL,
      returned_at DATETIME,
      purpose TEXT,
      amount INTEGER DEFAULT 0,
      FOREIGN KEY (card_id) REFERENCES corporate_cards(id)
    );

    -- 분실물
    CREATE TABLE IF NOT EXISTS lost_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_name TEXT NOT NULL,
      description TEXT,
      found_date DATE NOT NULL,
      found_location TEXT,
      image_path TEXT,
      qr_code TEXT,
      status TEXT DEFAULT 'holding',
      finder_name TEXT,
      owner_name TEXT,
      claimed_at DATETIME,
      storage_location TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- AI 대화 기록
    CREATE TABLE IF NOT EXISTS chat_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 계산기 저장 결과
    CREATE TABLE IF NOT EXISTS calculations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT,
      input_data TEXT,
      result_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 감사 로그
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      module TEXT,
      detail TEXT,
      user_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 주요 연락처
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT DEFAULT 'staff',
      name TEXT NOT NULL,
      department TEXT,
      phone TEXT,
      mobile TEXT,
      ceo_name TEXT,
      email TEXT,
      note TEXT,
      sort_order INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 파일/폴더 즐겨찾기
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 메모 (포스트잇)
    CREATE TABLE IF NOT EXISTS memos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT '',
      content TEXT DEFAULT '',
      color TEXT DEFAULT '#fef3c7',
      x INTEGER DEFAULT 100,
      y INTEGER DEFAULT 100,
      width INTEGER DEFAULT 250,
      height INTEGER DEFAULT 250,
      z_index INTEGER DEFAULT 10,
      is_pinned INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  
  // 마이그레이션
  try { db.exec(`ALTER TABLE schedules ADD COLUMN is_completed INTEGER DEFAULT 0;`) } catch (e) { /* ignore */ }
  
  // 연락처 마이그레이션 (기존 컬럼 없으면 추가)
  try { db.exec(`ALTER TABLE contacts ADD COLUMN type TEXT DEFAULT 'staff';`) } catch (e) { /* ignore */ }
  try { db.exec(`ALTER TABLE contacts ADD COLUMN department TEXT;`) } catch (e) { /* ignore */ }
  try { db.exec(`ALTER TABLE contacts ADD COLUMN mobile TEXT;`) } catch (e) { /* ignore */ }
  try { db.exec(`ALTER TABLE contacts ADD COLUMN ceo_name TEXT;`) } catch (e) { /* ignore */ }
  try { db.exec(`ALTER TABLE contacts ADD COLUMN is_favorite INTEGER DEFAULT 0;`) } catch (e) { /* ignore */ }
  
  // 사용자의 요청: "기존 연락처는 전체 삭제해 다시 입력할거야."
  // 이미 삭제했는지 여부를 체크하기 위해 settings에 플래그를 저장할 수도 있지만,
  // 1회성 마이그레이션으로 처리. 연락처 데이터가 예전 스키마 형태로 존재할 경우 삭제.
  try {
    const checkLegacy = db.prepare('SELECT COUNT(*) as cnt FROM contacts WHERE type IS NULL').get() as {cnt: number};
    if (checkLegacy && checkLegacy.cnt > 0) {
      db.exec('DELETE FROM contacts');
    }
  } catch (e) { /* ignore */ }
}

function seedInitialData(): void {
  // 기본 사용자
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt
  if (userCount === 0) {
    db.prepare(`
      INSERT INTO users (name, role, school_name, department) 
      VALUES ('관리자', 'admin', '○○초등학교', '행정실')
    `).run()
  }

  // 기본 설정
  const defaultSettings = [
    ['theme', 'dark'],
    ['always_on_top', 'false'],
    ['gemini_api_key', ''],
    ['weather_api_key', ''],
    ['school_name', '○○초등학교'],
    ['notifications_enabled', 'true'],
    ['backup_enabled', 'true'],
    ['language', 'ko']
  ]

  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `)
  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value)
  }

  // 샘플 법인카드
  const cardCount = (db.prepare('SELECT COUNT(*) as cnt FROM corporate_cards').get() as { cnt: number }).cnt
  if (cardCount === 0) {
    db.prepare(`
      INSERT INTO corporate_cards (card_name, card_number, is_available)
      VALUES 
        ('법인카드 1호', '**** **** **** 1234', 1),
        ('법인카드 2호', '**** **** **** 5678', 1),
        ('법인카드 3호', '**** **** **** 9012', 1)
    `).run()
  }

  // 샘플 일정
  const schedCount = (db.prepare('SELECT COUNT(*) as cnt FROM schedules').get() as { cnt: number }).cnt
  if (schedCount === 0) {
    const today = new Date()
    const fmt = (d: Date) => d.toISOString().split('T')[0]
    const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000)

    db.prepare(`
      INSERT INTO schedules (title, category, start_date, color, is_all_day) VALUES
        ('1학기 기말고사', 'exam', '${fmt(addDays(today, 7))}', '#ef4444', 1),
        ('학교운영위원회', 'meeting', '${fmt(addDays(today, 3))}', '#8b5cf6', 1),
        ('현장학습', 'event', '${fmt(addDays(today, 14))}', '#f59e0b', 1),
        ('급여 지급일', 'finance', '${fmt(addDays(today, 10))}', '#10b981', 1),
        ('방학식', 'holiday', '${fmt(addDays(today, 21))}', '#3b82f6', 1)
    `).run()
  }

  // 샘플 문서 템플릿
  const docCount = (db.prepare('SELECT COUNT(*) as cnt FROM documents').get() as { cnt: number }).cnt
  if (docCount === 0) {
    db.prepare(`
      INSERT INTO documents (title, category, tags) VALUES
        ('지출품의서', '회계', '지출,품의,회계'),
        ('출장신청서', '출장', '출장,신청,여비'),
        ('물품구매 품의서', '물품', '물품,구매,품의'),
        ('강사비 지급 품의서', '회계', '강사비,수당,지급'),
        ('학교운영위원회 회의록', '회의', '운영위원회,회의록'),
        ('수의계약 품의서', '계약', '수의계약,계약'),
        ('일반경쟁입찰 공고', '계약', '입찰,공고,계약'),
        ('원천징수영수증', '회계', '원천세,영수증')
    `).run()
  }
}
