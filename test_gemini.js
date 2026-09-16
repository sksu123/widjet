const Database = require('better-sqlite3');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
  const dbPath = process.env.APPDATA + '/SchoolAdminWidget/database.sqlite';
  const db = new Database(dbPath);
  const row = db.prepare("SELECT value FROM settings WHERE key = 'gemini_api_key'").get();
  const apiKey = row ? row.value : '';
  
  if (!apiKey) {
    console.log('No API key found in DB');
    return;
  }
  
  console.log('Key starts with:', apiKey.substring(0, 5));
  
  const ai = new GoogleGenerativeAI(apiKey);
  
  // Test text-embedding-004
  try {
    const embedModel = ai.getGenerativeModel({ model: 'text-embedding-004' });
    const embedRes = await embedModel.embedContent('Hello');
    console.log('text-embedding-004 Success!');
  } catch (e) {
    console.log('text-embedding-004 Error:', e.message);
  }

  // Test embedding-001
  try {
    const embedModel2 = ai.getGenerativeModel({ model: 'embedding-001' });
    const embedRes2 = await embedModel2.embedContent('Hello');
    console.log('embedding-001 Success!');
  } catch (e) {
    console.log('embedding-001 Error:', e.message);
  }
  
  // Test gemini-1.5-flash
  try {
    const chatModel = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const chatRes = await chatModel.generateContent('Hello');
    console.log('gemini-1.5-flash Success!');
  } catch (e) {
    console.log('gemini-1.5-flash Error:', e.message);
  }
}

test();
