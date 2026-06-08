import { useState } from 'react'
import { Calculator, Save, RefreshCw } from 'lucide-react'

type CalcType = 'travel' | 'instructor' | 'vat' | 'insurance' | 'overtime' | 'severance'

interface CalcResult { label: string; value: string; highlight?: boolean }

export default function CalculatorPage() {
  const [activeCalc, setActiveCalc] = useState<CalcType>('instructor')
  const [result, setResult] = useState<CalcResult[]>([])
  const [saved, setSaved] = useState(false)

  // ===== 여비 계산 =====
  const [travel, setTravel] = useState({ grade: '5', days: '1', transport: '10000', hotel: '60000' })
  const calcTravel = () => {
    const grades: Record<string, { daily: number; hotel: number }> = {
      '3': { daily: 20000, hotel: 80000 },
      '4': { daily: 18000, hotel: 70000 },
      '5': { daily: 16000, hotel: 60000 },
      '6': { daily: 14000, hotel: 50000 },
      '7': { daily: 13000, hotel: 40000 },
    }
    const g = grades[travel.grade] || grades['5']
    const days = parseInt(travel.days) || 1
    const transport = parseInt(travel.transport) || 0
    const hotel = parseInt(travel.hotel) || 0

    const daily = g.daily * days
    const hotelAllowance = Math.min(hotel, g.hotel) * Math.max(days - 1, 0)
    const total = daily + hotelAllowance + transport * 2

    setResult([
      { label: '일비', value: `${daily.toLocaleString()}원` },
      { label: '숙박비', value: `${hotelAllowance.toLocaleString()}원` },
      { label: '교통비 (왕복)', value: `${(transport * 2).toLocaleString()}원` },
      { label: '합계', value: `${total.toLocaleString()}원`, highlight: true },
    ])
  }

  // ===== 강사수당 계산 =====
  const [instructor, setInstructor] = useState({ type: '일반강사 I', hours: '1', pages: '0' })
  const calcInstructor = () => {
    const hours = parseFloat(instructor.hours) || 0
    const pages = parseFloat(instructor.pages) || 0

    // 단가 표 (기본 1시간, 초과 매 시간당)
    const rates: Record<string, { base: number; excess: number; flat?: number }> = {
      '특별강사 I': { base: 300000, excess: 200000 },
      '특별강사 II': { base: 200000, excess: 150000 },
      '일반강사 I': { base: 160000, excess: 90000 },
      '일반강사 II': { base: 90000, excess: 60000 },
      '보조강사': { base: 40000, excess: 40000, flat: 40000 } // 시간당 단가 정액
    }

    const typeRate = rates[instructor.type] || rates['일반강사 II']
    let lectureFee = 0

    if (hours > 0) {
      if (typeRate.flat) {
        lectureFee = typeRate.flat * hours
      } else {
        const fullHours = Math.floor(hours)
        const isExcess = hours > fullHours // e.g. 1.5
        lectureFee = typeRate.base + (fullHours - 1) * typeRate.excess
        if (isExcess) {
          lectureFee += typeRate.excess // 30분 이상 초과 시 1시간으로 간주하는 규정이 일반적
        }
      }
    }

    const manuscriptFee = pages * 20000 // 원고료 매당 2만원
    const gross = lectureFee + manuscriptFee
    const withholdingTax = Math.floor(gross * 0.088) // 기타소득세 8.8% (필요경비 60% 공제 후 22%) *강의료 기준 일반적 적용

    const net = gross - withholdingTax

    setResult([
      { label: '강사료', value: `${lectureFee.toLocaleString()}원` },
      { label: '원고료', value: `${manuscriptFee.toLocaleString()}원` },
      { label: '지급 총액', value: `${gross.toLocaleString()}원`, highlight: true },
      { label: '원천징수 (8.8% 등)', value: `${withholdingTax.toLocaleString()}원` },
      { label: '실 지급액', value: `${net.toLocaleString()}원`, highlight: true },
    ])
  }

  // ===== 부가세 계산 =====
  const [vatCalc, setVatCalc] = useState({ total: '11000' })
  const calcVat = () => {
    const total = parseInt(vatCalc.total) || 0
    const supplyValue = Math.round(total / 1.1)
    const vatAmount = total - supplyValue

    setResult([
      { label: '합계금액', value: `${total.toLocaleString()}원` },
      { label: '공급가액', value: `${supplyValue.toLocaleString()}원`, highlight: true },
      { label: '부가세액 (10%)', value: `${vatAmount.toLocaleString()}원`, highlight: true },
    ])
  }

  // ===== 4대보험 계산 =====
  const [insurance, setInsurance] = useState({ salary: '3000000' })
  const calcInsurance = () => {
    const salary = parseInt(insurance.salary) || 0
    const national = Math.floor(salary * 0.045)
    const health = Math.floor(salary * 0.03545)
    const elderly = Math.floor(health * 0.1295)
    const employ = Math.floor(salary * 0.009)
    const total = national + health + elderly + employ

    setResult([
      { label: '국민연금 (4.5%)', value: `${national.toLocaleString()}원` },
      { label: '건강보험 (3.545%)', value: `${health.toLocaleString()}원` },
      { label: '장기요양보험 (12.95%)', value: `${elderly.toLocaleString()}원` },
      { label: '고용보험 (0.9%)', value: `${employ.toLocaleString()}원` },
      { label: '4대보험 합계', value: `${total.toLocaleString()}원`, highlight: true },
      { label: '실 지급액', value: `${(salary - total).toLocaleString()}원` },
    ])
  }

  // ===== 초과근무수당 =====
  const [overtime, setOvertime] = useState({ salary: '3000000', hours: '10' })
  const calcOvertime = () => {
    const salary = parseInt(overtime.salary) || 0
    const hours = parseFloat(overtime.hours) || 0
    const hourlyRate = Math.floor(salary / 209)
    const overtimePay = Math.floor(hourlyRate * 1.5 * hours)

    setResult([
      { label: '시간당 통상임금', value: `${hourlyRate.toLocaleString()}원` },
      { label: '초과근무 시간', value: `${hours}시간` },
      { label: '초과근무수당 (150%)', value: `${overtimePay.toLocaleString()}원`, highlight: true },
    ])
  }

  // ===== 퇴직금 계산 =====
  const [severance, setSeverance] = useState({ salary: '3000000', months: '36' })
  const calcSeverance = () => {
    const salary = parseInt(severance.salary) || 0
    const months = parseInt(severance.months) || 0
    const years = months / 12
    const amount = Math.floor(salary * years)

    setResult([
      { label: '근속 연수', value: `${years.toFixed(1)}년 (${months}개월)` },
      { label: '월 통상임금', value: `${salary.toLocaleString()}원` },
      { label: '퇴직금 (세전)', value: `${amount.toLocaleString()}원`, highlight: true },
      { label: '퇴직소득세 (추정)', value: `${Math.floor(amount * 0.03).toLocaleString()}원` },
    ])
  }

  const CALCS = [
    { key: 'travel', label: '여비 (새창)', icon: '✈️', run: () => {} },
    { key: 'instructor', label: '강사수당', icon: '👨‍🏫', run: calcInstructor },
    { key: 'vat', label: '부가세', icon: '📊', run: calcVat },
    { key: 'insurance', label: '4대보험', icon: '🏥', run: calcInsurance },
    { key: 'overtime', label: '초과근무', icon: '⏰', run: calcOvertime },
    { key: 'severance', label: '퇴직금', icon: '💼', run: calcSeverance },
  ]

  const activeCalcDef = CALCS.find(c => c.key === activeCalc)

  const handleCalculate = () => {
    activeCalcDef?.run()
    setSaved(false)
  }

  const handleSave = async () => {
    const text = result.map(r => `${r.label}: ${r.value}`).join('\n')
    await window.api.db.saveCalculation({
      type: activeCalc,
      title: `${activeCalcDef?.label} 계산 ${new Date().toLocaleDateString('ko-KR')}`,
      input_data: JSON.stringify(
        activeCalc === 'travel' ? travel :
        activeCalc === 'instructor' ? instructor :
        activeCalc === 'vat' ? vatCalc :
        activeCalc === 'insurance' ? insurance :
        activeCalc === 'overtime' ? overtime : severance
      ),
      result_data: text
    })
    setSaved(true)
  }

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <Calculator size={16} className="text-white" />
        </div>
        <h1 className="page-title">업무 계산기</h1>
      </div>

      {/* 계산기 선택 */}
      <div className="grid grid-cols-6 gap-2">
        {CALCS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => {
              if (key === 'travel') {
                window.open('https://hyonu1.github.io/ybez/', '_blank')
              } else {
                setActiveCalc(key as CalcType)
                setResult([])
              }
            }}
            className="flex flex-col items-center gap-1 py-3 rounded-xl text-xs font-medium transition-all"
            style={activeCalc === key
              ? { background: 'linear-gradient(135deg, #f59e0b22, #d9770611)', border: '1px solid #f59e0b44', color: '#f59e0b' }
              : { background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
            }
          >
            <span className="text-base">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 입력 폼 */}
        <div className="card space-y-3">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {activeCalcDef?.icon} {activeCalcDef?.label} 계산
          </p>

          {activeCalc === 'travel' && (
            <>
              <div>
                <label className="label">직급</label>
                <select className="input" value={travel.grade} onChange={e => setTravel({ ...travel, grade: e.target.value })}>
                  {['3', '4', '5', '6', '7'].map(g => (
                    <option key={g} value={g}>{g}급</option>
                  ))}
                </select>
              </div>
              <div><label className="label">출장 일수</label>
                <input className="input" value={travel.days} onChange={e => setTravel({ ...travel, days: e.target.value })} type="number" min="1" /></div>
              <div><label className="label">교통비 (편도, 원)</label>
                <input className="input" value={travel.transport} onChange={e => setTravel({ ...travel, transport: e.target.value })} type="number" /></div>
              <div><label className="label">실제 숙박비 (원)</label>
                <input className="input" value={travel.hotel} onChange={e => setTravel({ ...travel, hotel: e.target.value })} type="number" /></div>
            </>
          )}

          {activeCalc === 'instructor' && (
            <>
              <div><label className="label">강사 구분</label>
                <select className="input" value={instructor.type} onChange={e => setInstructor({ ...instructor, type: e.target.value })}>
                  <option value="특별강사 I">특별강사 I (기본 30만/초과 20만)</option>
                  <option value="특별강사 II">특별강사 II (기본 20만/초과 15만)</option>
                  <option value="일반강사 I">일반강사 I (기본 16만/초과 9만)</option>
                  <option value="일반강사 II">일반강사 II (기본 9만/초과 6만)</option>
                  <option value="보조강사">보조강사 (시간당 4만)</option>
                </select>
              </div>
              <div><label className="label">강의 시간수 (시간)</label>
                <input className="input" value={instructor.hours} onChange={e => setInstructor({ ...instructor, hours: e.target.value })} type="number" step="1" /></div>
              <div><label className="label">원고료 매수 (A4 기준)</label>
                <input className="input" value={instructor.pages} onChange={e => setInstructor({ ...instructor, pages: e.target.value })} type="number" /></div>
            </>
          )}

          {activeCalc === 'vat' && (
            <>
              <div><label className="label">합계 금액 (원)</label>
                <input className="input" value={vatCalc.total} onChange={e => setVatCalc({ ...vatCalc, total: e.target.value })} type="number" /></div>
            </>
          )}

          {(activeCalc === 'insurance' || activeCalc === 'overtime' || activeCalc === 'severance') && (
            <div><label className="label">월 급여 (원)</label>
              <input className="input"
                value={activeCalc === 'insurance' ? insurance.salary : activeCalc === 'overtime' ? overtime.salary : severance.salary}
                onChange={e => {
                  if (activeCalc === 'insurance') setInsurance({ salary: e.target.value })
                  else if (activeCalc === 'overtime') setOvertime({ ...overtime, salary: e.target.value })
                  else setSeverance({ ...severance, salary: e.target.value })
                }} type="number" /></div>
          )}
          {activeCalc === 'overtime' && (
            <div><label className="label">초과근무 시간</label>
              <input className="input" value={overtime.hours} onChange={e => setOvertime({ ...overtime, hours: e.target.value })} type="number" step="0.5" /></div>
          )}
          {activeCalc === 'severance' && (
            <div><label className="label">근속 개월수</label>
              <input className="input" value={severance.months} onChange={e => setSeverance({ ...severance, months: e.target.value })} type="number" /></div>
          )}

          <button onClick={handleCalculate} className="btn-primary w-full justify-center">
            <RefreshCw size={14} /> 계산하기
          </button>
        </div>

        {/* 결과 */}
        <div className="card">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>계산 결과</p>
          {result.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>계산 결과가 여기에 표시됩니다</p>
          ) : (
            <div className="space-y-2">
              {result.map(({ label, value, highlight }) => (
                <div key={label} className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? '' : ''}`}
                  style={highlight ? { background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' } : {}}>
                  <span className="text-xs" style={{ color: highlight ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{label}</span>
                  <span className={`font-semibold tabular-nums ${highlight ? 'text-base' : 'text-sm'}`}
                    style={{ color: highlight ? '#60a5fa' : 'var(--text-primary)' }}>
                    {value}
                  </span>
                </div>
              ))}
              <button
                onClick={handleSave}
                className={`btn w-full justify-center mt-2 text-xs ${saved ? 'btn-ghost' : 'btn-primary'}`}
              >
                <Save size={12} /> {saved ? '저장됨 ✓' : '결과 저장'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
