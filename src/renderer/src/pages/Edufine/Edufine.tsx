
import { useState } from 'react'
import { BookOpen, Sparkles, Copy, Download, ChevronRight, Search } from 'lucide-react'

const getCatStyle = (cat: string, isActive: boolean) => {
  const styles: Record<string, string> = {
    '인건비': isActive ? 'bg-blue-500 text-white shadow-md' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 hover:bg-blue-200',
    '운영비': isActive ? 'bg-emerald-500 text-white shadow-md' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 hover:bg-emerald-200',
    '업무추진비': isActive ? 'bg-violet-500 text-white shadow-md' : 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200 hover:bg-violet-200',
    '시설비': isActive ? 'bg-orange-500 text-white shadow-md' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200 hover:bg-orange-200',
    '자산취득비': isActive ? 'bg-rose-500 text-white shadow-md' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 hover:bg-rose-200'
  };
  return styles[cat] || '';
}

const BUDGET_CATEGORIES = ['인건비', '운영비', '업무추진비', '시설비', '자산취득비']

const BUDGET_EXAMPLES: Record<string, { project: string; item: string; amount: string }[]> = {
  '인건비': [
    { project: '기간제교원 인건비', item: '기간제교사(결원대체) 3월 급여', amount: '3,200,000' },
    { project: '교육공무직원 인건비', item: '교무행정사 기본급 및 수당', amount: '2,400,000' },
    { project: '방과후학교 운영', item: '외부강사 수당(3월분)', amount: '1,500,000' },
    { project: '초등돌봄교실 운영', item: '돌봄전담사 인건비', amount: '2,100,000' },
    { project: '배움터지킴이 운영', item: '학생보호인력 자원봉사자 활동비', amount: '800,000' },
    { project: '원어민보조교사 지원', item: '원어민강사 체재비', amount: '400,000' },
    { project: '시간강사 수당', item: '예술강사 지도 수당', amount: '300,000' },
    { project: '특수운영직군 인건비', item: '당직전담원 급여', amount: '2,300,000' },
    { project: '교원연구비', item: '교원연구비(직급별 차등)', amount: '60,000' },
    { project: '맞춤형복지비', item: '교직원 복지포인트 배정', amount: '500,000' }
  ],
  '운영비': [
    { project: '일반수용비', item: '복사용지 A4 20박스', amount: '450,000' },
    { project: '공공요금 및 제세', item: '4월분 전기요금 납부', amount: '3,500,000' },
    { project: '피복비', item: '당직근무자 근무복 구입', amount: '200,000' },
    { project: '여비', item: '관내 출장 여비 지급', amount: '150,000' },
    { project: '교과용도서구입', item: '1학년 국어 교과서 구입', amount: '1,200,000' },
    { project: '소모품 구입', item: '화장실 화장지 및 비누', amount: '300,000' },
    { project: '교육운영비', item: '과학실험 재료 구입', amount: '400,000' },
    { project: '학생복지', item: '졸업생 기념품(도장) 제작', amount: '800,000' },
    { project: '수수료', item: '정수기 렌탈 및 관리 수수료', amount: '120,000' },
    { project: '통신비', item: '학교 인터넷 전용선 요금', amount: '250,000' }
  ],
  '업무추진비': [
    { project: '기관운영업무추진비', item: '교직원 체육대회 격려품', amount: '300,000' },
    { project: '직책급업무추진비', item: '교장 직책급업무추진비', amount: '250,000' },
    { project: '부서운영업무추진비', item: '교무실 부서운영 경비', amount: '150,000' },
    { project: '업무협의회', item: '학교운영위원회 협의회 다과', amount: '100,000' },
    { project: '유관기관 협의', item: '경찰서 합동 캠페인 식대', amount: '120,000' },
    { project: '학부모회 지원', item: '학부모 총회 음료 구입', amount: '80,000' },
    { project: '교직원 경조사', item: '교직원 결혼 축하 화환', amount: '100,000' },
    { project: '우수직원 포상', item: '업무유공자 표창 상품권', amount: '200,000' },
    { project: '명절 격려', item: '환경미화원 명절 격려품', amount: '150,000' },
    { project: '간담회', item: '학년별 간담회 식대', amount: '180,000' }
  ],
  '시설비': [
    { project: '소규모 시설보수', item: '교실 출입문 손잡이 교체', amount: '80,000' },
    { project: '안전 인프라 확충', item: 'CCTV 카메라 추가 설치 공사', amount: '1,500,000' },
    { project: '학교시설 유지관리', item: '화장실 배관 누수 수리', amount: '450,000' },
    { project: '교육환경 개선', item: '과학실 노후 실험대 교체', amount: '2,000,000' },
    { project: '조경 및 외부환경', item: '운동장 잡초 제거 및 모래 보충', amount: '800,000' },
    { project: '소방안전 관리', item: '소방시설 종합정밀점검 지적사항 조치', amount: '1,200,000' },
    { project: '냉난방기 관리', item: '교무실 시스템 에어컨 세척', amount: '600,000' },
    { project: '승강기 유지보수', item: '장애인 승강기 부품 교체 공사', amount: '350,000' },
    { project: '외벽 방수 공사', item: '본관 옥상 방수 및 도장 공사', amount: '5,000,000' },
    { project: '전기 시설 관리', item: '노후 형광등 LED 교체 공사', amount: '3,500,000' }
  ],
  '자산취득비': [
    { project: '비품 구입', item: '교무실 업무용 컴퓨터 3대', amount: '3,600,000' },
    { project: '교육기자재', item: '스마트교실 전자칠판', amount: '5,000,000' },
    { project: '도서 구입', item: '도서관 신간 도서 100권', amount: '1,500,000' },
    { project: '방송설비', item: '체육관 무선 마이크 세트', amount: '800,000' },
    { project: '소프트웨어', item: '한컴오피스 학교 라이선스', amount: '1,200,000' },
    { project: '가구 구입', item: '1학년 교실 책걸상 30조', amount: '2,100,000' },
    { project: '과학기구', item: '천체 망원경 세트', amount: '3,000,000' },
    { project: '체육교구', item: '뜀틀 및 매트 세트', amount: '1,800,000' },
    { project: '악기 구입', item: '음악실 디지털 피아노', amount: '1,500,000' },
    { project: '냉난방기 구입', item: '보건실 벽걸이 에어컨', amount: '900,000' }
  ]
}

export default function Edufine() {
  const [projectName, setProjectName] = useState('')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [activeTab, setActiveTab] = useState<'budget'>('budget')
  const [activeCategory, setActiveCategory] = useState('인건비')

  const recommend = async () => {
    if (!projectName || !item || !amount) return
    setLoading(true)
    setResult('')
    try {
      const res = await window.api.ai.recommendBudget({
        projectName, item, amount: parseInt(amount.replace(/,/g, ''))
      })
      if (res.success) setResult(res.text)
      else setResult(`오류: ${res.error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fade-in space-y-4">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
          <BookOpen size={16} className="text-white" />
        </div>
        <div>
          <h1 className="page-title">예산 집행 도우미</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>예산과목 추천 · 회계 검토 · 집행 가능 여부</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <button
          onClick={() => setActiveTab('budget')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${activeTab === 'budget' ? 'shadow-sm' : 'opacity-60 hover:opacity-100'}`}
          style={{ background: activeTab === 'budget' ? 'var(--bg-card)' : 'transparent', color: activeTab === 'budget' ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          예산 집행 목·세목 추천
        </button>

        <button
          onClick={() => window.open('https://spen-blue.vercel.app/', '_blank')}
          className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#ffffff' }}
        >
          <Search size={12} />
          지능형학교예산 집행률 분석 앱 ↗
        </button>
        <button
          onClick={() => window.open('https://sksu123-yeabi.vercel.app/', '_blank')}
          className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #f97316, #fb923c)', color: '#ffffff' }}
        >
          <Search size={12} />
          여비정산신청서 ↗
        </button>
        <button
          onClick={() => window.open('https://edufine-draft-assistant.vercel.app', '_blank')}
          className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 hover:opacity-80"
          style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#ffffff' }}
        >
          <Search size={12} />
          품의뚝딱 ↗
        </button>
      </div>

      {activeTab === 'budget' && (
        <div className="space-y-4">
          
          {/* 지출 정보 입력 (상단 넓게) */}
          <div className="card space-y-3">
            <p className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>지출 정보 입력</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">사업명</label>
                <input className="input text-sm py-1.5" value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  placeholder="예: 학교 교육활동 지원" />
              </div>
              <div>
                <label className="label text-xs">품목</label>
                <input className="input text-sm py-1.5" value={item}
                  onChange={e => setItem(e.target.value)}
                  placeholder="예: 복사용지 A4 10박스" />
              </div>
            </div>
            <div>
              <label className="label text-xs">금액 (원)</label>
              <input className="input text-sm py-1.5" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="예: 50,000" />
            </div>
            
            <button onClick={recommend} disabled={loading || !projectName || !item || !amount}
              className="btn-mint w-full justify-center text-sm py-2 font-bold mt-2"
              style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? <span className="spinner" /> : <Sparkles size={16} />}
              예산과목 및 기안문 추천 받기
            </button>
          </div>

          {/* 빠른 예시 (중단 넓게) */}
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>빠른 예시</p>
            <div className="flex gap-2 flex-wrap mb-3">
              {BUDGET_CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${getCatStyle(cat, activeCategory === cat)}`}>
                  {cat}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(BUDGET_EXAMPLES[activeCategory] || []).map((ex, i) => (
                <button key={i} onClick={() => {
                  setProjectName(ex.project); setItem(ex.item); setAmount(ex.amount)
                }}
                  className="card text-left hover:border-teal-500/50 text-xs group p-3 transition-colors">
                  <p className="font-bold mb-1 truncate" style={{ color: 'var(--text-primary)' }}>{ex.project}</p>
                  <p style={{ color: 'var(--text-muted)' }} className="truncate mb-1">{ex.item}</p>
                  <p className="font-semibold" style={{ color: 'var(--accent-mint)' }}>{ex.amount}원</p>
                </button>
              ))}
            </div>
          </div>

          {/* 하단 2분할 (결과) - 크고 넓게 */}
          {result && (
            <div className="grid grid-cols-2 gap-4 items-stretch mt-6">
              
              {/* 왼쪽: AI 추천 결과 */}
              <div className="card h-full flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>💡 AI 추천 결과 (예산과목 및 검토)</p>
                  <button onClick={() => navigator.clipboard.writeText((result.split('[기안문예시]')[0] || '').replace('[AI추천결과]', '').trim())}
                    className="btn-ghost text-sm py-1.5 px-3 font-semibold">
                    <Copy size={16} /> 복사
                  </button>
                </div>
                <div className="prose-chat text-base md:text-lg leading-relaxed flex-1"
                  dangerouslySetInnerHTML={{
                    __html: (result.split('[기안문예시]')[0] || '').replace('[AI추천결과]', '').trim()
                      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent-mint)">$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
              </div>

              {/* 오른쪽: 품의 기안문 예시 */}
              <div className="card h-full flex flex-col min-h-[400px]">
                <div className="flex items-center justify-between mb-4 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>📝 품의 기안문 예시</p>
                  <button onClick={() => navigator.clipboard.writeText((result.split('[기안문예시]')[1] || '').trim())}
                    className="btn-ghost text-sm py-1.5 px-3 font-semibold">
                    <Copy size={16} /> 복사
                  </button>
                </div>
                <div className="prose-chat text-base md:text-lg leading-relaxed flex-1 bg-slate-50 dark:bg-slate-900/30 p-5 rounded-xl border border-dashed shadow-inner" style={{ borderColor: 'var(--border)' }}
                  dangerouslySetInnerHTML={{
                    __html: (result.split('[기안문예시]')[1] || '\n결과를 생성하는 중이거나 기안문을 가져올 수 없습니다.').trim()
                      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent-blue)">$1</strong>')
                      .replace(/\n/g, '<br/>')
                  }} />
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  )
}
