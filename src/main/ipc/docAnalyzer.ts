export interface DateCheckResult {
  match: string;
  year: number;
  month: number;
  day: number;
  expectedWeekday: string;
  actualWeekday: string;
  isValid: boolean;
}

export interface PersonExtraction {
  role: string;
  name: string;
  context: string;
}

export function analyzeDocument(text: string, currentYear: number) {
  const dateResults = verifyDates(text, currentYear);
  const personResults = extractPersons(text);
  
  return {
    dates: dateResults,
    persons: personResults
  };
}

function verifyDates(text: string, currentYear: number): DateCheckResult[] {
  const results: DateCheckResult[] = [];
  const dateRegex = /(?:(20\d{2})[년.\s]+)?(\d{1,2})[월.\s]+(\d{1,2})[일.\s]*\(([월화수목금토일])\)/g;
  
  let match;
  while ((match = dateRegex.exec(text)) !== null) {
    const year = match[1] ? parseInt(match[1]) : currentYear;
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    const weekdayStr = match[4];
    
    const dateObj = new Date(year, month - 1, day);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const actualWeekday = weekdays[dateObj.getDay()];
    
    const isValid = dateObj.getMonth() === month - 1 && dateObj.getDate() === day && actualWeekday === weekdayStr;
    
    results.push({
      match: match[0],
      year,
      month,
      day,
      expectedWeekday: weekdayStr,
      actualWeekday,
      isValid
    });
  }
  return results;
}

function extractPersons(text: string): PersonExtraction[] {
  const results: PersonExtraction[] = [];
  const lines = text.split('\n');
  const roleKeywords = ['담당자', '책임자', '작성자', '검토자', '결재자', '문의', '연락처'];
  
  for (const line of lines) {
    for (const kw of roleKeywords) {
      if (line.includes(kw)) {
        const nameMatch = line.match(/[가-힣]{2,4}/g);
        if (nameMatch) {
          const names = nameMatch.filter(n => n !== kw && !['그리고', '담당자', '책임자', '입니다', '장학사', '주무관'].includes(n));
          if (names.length > 0) {
            results.push({
              role: kw,
              name: names[0],
              context: line.trim()
            });
          }
        }
      }
    }
  }
  
  const unique = [];
  const seen = new Set();
  for (const r of results) {
    const key = r.role + r.name;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    }
  }
  
  return unique;
}
