import { useState, useMemo } from 'react'
import { Calculator, Save, RefreshCw, Table as TableIcon, Download, Printer, Calendar } from 'lucide-react'

type CalcType = 'travel' | 'instructor' | 'vat' | 'insurance' | 'tax' | 'unit'
type IncomeCategory = 'business' | 'other'

interface CalcResult { label: string; value: string; highlight?: boolean; color?: string }

interface TaxResultRow {
  id: number;
  month: string;
  name: string;
  incomeTax: number;
  localTax: number;
  totalTax: number;
  netPay: number;
  insurance: number;
  isTaxExempt: boolean;
  isForeigner: boolean;
  amount: number;
  category: IncomeCategory;
}

const UNIT_CATEGORIES = [
  { id: 'length', label: '길이' },
  { id: 'area', label: '넓이' },
  { id: 'weight', label: '무게' },
  { id: 'volume', label: '부피' },
  { id: 'temperature', label: '온도' },
  { id: 'speed', label: '속도' },
  { id: 'data', label: '데이터' },
  { id: 'pressure', label: '압력' },
  { id: 'time', label: '시간' }
]

const UNIT_DATA: Record<string, { [key: string]: number }> = {
  length: {
    'mm': 0.001, 'cm': 0.01, 'm': 1, 'km': 1000, 'in': 0.0254, 'ft': 0.3048, 'yd': 0.9144, 'mile': 1609.344
  },
  area: {
    '㎡': 1, 'a': 100, 'ha': 10000, '㎢': 1000000, 'ft²': 0.092903, 'yd²': 0.836127, 'ac': 4046.856, '평': 3.305785
  },
  weight: {
    'mg': 0.000001, 'g': 0.001, 'kg': 1, 't': 1000, 'oz': 0.0283495, 'lb': 0.453592, '근': 0.6, '관': 3.75
  },
  volume: {
    'cc': 0.001, 'mℓ': 0.001, 'ℓ': 1, '㎤': 0.001, '㎥': 1000, 'in³': 0.016387, 'ft³': 28.3168, 'gal': 3.78541, '배럴': 158.987
  },
  temperature: {
    '℃': 1, '℉': 1, 'K': 1
  },
  speed: {
    'm/s': 1, 'm/h': 0.000277778, 'km/s': 1000, 'km/h': 0.277778, 'in/s': 0.0254, 'in/h': 0.0000070556, 'ft/s': 0.3048, 'ft/h': 0.000084667, 'mi/s': 1609.344, 'mi/h': 0.44704, 'knot': 0.514444, 'mach': 340.3
  },
  data: {
    'bit': 0.125, 'Byte': 1, 'KB': 1024, 'MB': 1048576, 'GB': 1073741824, 'TB': 1099511627776, 'PB': 1125899906842624, 'EB': 1152921504606846976
  },
  pressure: {
    'Pa': 1, 'hPa': 100, 'kPa': 1000, 'MPa': 1000000, 'atm': 101325, 'bar': 100000, 'mb': 100, 'dyn/cm²': 0.1, 'psi': 6894.76, 'mmHg': 133.322, 'inchHg': 3386.39, 'mmH2O': 9.80665, 'inchH2O': 249.082
  },
  time: {
    'ms': 0.001, '초': 1, '분': 60, '시간': 3600, '일': 86400, '주': 604800, '달': 2592000, '년': 31536000
  }
}

export default function CalculatorPage() {
  const [activeCalc, setActiveCalc] = useState<CalcType>('instructor')
  const [result, setResult] = useState<CalcResult[]>([])
  const [saved, setSaved] = useState(false)

  // ===== 단위 변환 =====
  const [unitCategory, setUnitCategory] = useState<string>('length')
  const [unitFrom, setUnitFrom] = useState<string>('cm')
  const [unitTo, setUnitTo] = useState<string>('m')
  const [unitValue, setUnitValue] = useState<string>('0')

  const changeUnitCategory = (cat: string) => {
    setUnitCategory(cat)
    const units = Object.keys(UNIT_DATA[cat])
    setUnitFrom(units[0] || '')
    setUnitTo(units[1] || units[0] || '')
    setUnitValue('0')
  }

  const unitResult = useMemo(() => {
    if (!unitValue || isNaN(Number(unitValue))) return ''
    const val = parseFloat(unitValue)
    if (unitCategory === 'temperature') {
      let c = 0
      if (unitFrom === '℃') c = val
      else if (unitFrom === '℉') c = (val - 32) * 5/9
      else if (unitFrom === 'K') c = val - 273.15

      let res = 0
      if (unitTo === '℃') res = c
      else if (unitTo === '℉') res = c * 9/5 + 32
      else if (unitTo === 'K') res = c + 273.15
      
      const resStr = Number(res.toFixed(6)).toString()
      return resStr
    }

    const fromFactor = UNIT_DATA[unitCategory][unitFrom] || 1
    const toFactor = UNIT_DATA[unitCategory][unitTo] || 1
    const res = (val * fromFactor) / toFactor
    if (res === 0) return '0'
    return Number(res.toFixed(10)).toString()
  }, [unitValue, unitFrom, unitTo, unitCategory])

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

    const rates: Record<string, { base: number; excess: number; flat?: number }> = {
      '특별강사 I': { base: 300000, excess: 200000 },
      '특별강사 II': { base: 200000, excess: 150000 },
      '일반강사 I': { base: 160000, excess: 90000 },
      '일반강사 II': { base: 90000, excess: 60000 },
      '보조강사': { base: 40000, excess: 40000, flat: 40000 }
    }

    const typeRate = rates[instructor.type] || rates['일반강사 II']
    let lectureFee = 0

    if (hours > 0) {
      if (typeRate.flat) {
        lectureFee = typeRate.flat * hours
      } else {
        const fullHours = Math.floor(hours)
        const isExcess = hours > fullHours
        lectureFee = typeRate.base + (fullHours - 1) * typeRate.excess
        if (isExcess) lectureFee += typeRate.excess
      }
    }

    const manuscriptFee = pages * 20000
    const gross = lectureFee + manuscriptFee
    const withholdingTax = Math.floor(gross * 0.088)

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

  // ===== 스마트 원천세 계산기 =====
  const [taxCalc, setTaxCalc] = useState({
    lectureMonth: new Date().toISOString().slice(0, 7),
    name: '',
    amountStr: '',
    category: 'business' as IncomeCategory,
    isForeigner: false
  })
  const [taxLedger, setTaxLedger] = useState<TaxResultRow[]>([])

  const calcTax = () => {
    const amount = parseInt(taxCalc.amountStr.replace(/,/g, ''), 10)
    if (isNaN(amount) || amount <= 0) return

    const truncate10 = (val: number) => Math.floor(val / 10) * 10
    let incomeTax = 0, localTax = 0, totalTax = 0, netPay = amount, isTaxExempt = false

    if (taxCalc.category === 'other' && amount <= 125000) {
      isTaxExempt = true
    } else {
      let incomeTaxRate = taxCalc.category === 'business' ? 0.03 : 0.08
      incomeTax = truncate10(amount * incomeTaxRate)
      localTax = truncate10(incomeTax * 0.1)
      totalTax = incomeTax + localTax
      netPay = amount - totalTax
    }

    const insuranceAmt = taxCalc.category === 'business' ? truncate10(amount * 0.851) : 0

    const currentResult: TaxResultRow = {
      id: Date.now(),
      month: taxCalc.lectureMonth || new Date().toISOString().slice(0, 7),
      name: taxCalc.name.trim() || '강사',
      incomeTax, localTax, totalTax, netPay, insurance: insuranceAmt,
      isTaxExempt, isForeigner: taxCalc.isForeigner, amount, category: taxCalc.category
    }

    setTaxLedger(prev => [...prev, currentResult])

    const res: CalcResult[] = [
      { label: '강사명', value: `${currentResult.name} 님${currentResult.isForeigner ? ' (외국인)' : ''}` },
      { label: '지급(지출) 금액', value: `${amount.toLocaleString()}원` },
      { label: '소득세 (국세)', value: `${incomeTax.toLocaleString()}원` },
      { label: '지방소득세 (지방세)', value: `${localTax.toLocaleString()}원` },
    ]
    if (isTaxExempt) {
      res.push({ label: '총 원천징수 세액', value: `0원`, color: '#ef4444' })
      res.push({ label: '참고사항', value: '*과세최저한 적용 (세액 0원)', color: '#ef4444' })
    } else {
      res.push({ label: '총 원천징수 세액', value: `${totalTax.toLocaleString()}원`, highlight: true, color: '#ef4444' })
    }
    res.push({ label: '실 지급액 (실수령액)', value: `${netPay.toLocaleString()}원`, highlight: true, color: '#f59e0b' })
    
    setResult(res)
  }

  const taxMonthlySummaries = useMemo(() => {
    const summary: Record<string, { month: string; category: IncomeCategory; count: number; amount: number; incomeTax: number; localTax: number; netPay: number; insurance: number }> = {}
    taxLedger.forEach(item => {
      const key = `${item.month}_${item.category}`
      if (!summary[key]) {
        summary[key] = { month: item.month, category: item.category, count: 0, amount: 0, incomeTax: 0, localTax: 0, netPay: 0, insurance: 0 }
      }
      summary[key].amount += item.amount
      summary[key].incomeTax += item.incomeTax
      summary[key].localTax += item.localTax
      summary[key].netPay += item.netPay
      summary[key].insurance += item.insurance
      summary[key].count += 1
    })
    return Object.values(summary).sort((a, b) => b.month.localeCompare(a.month) || a.category.localeCompare(b.category))
  }, [taxLedger])

  const downloadCSV = () => {
    const headers = ['귀속년월', '강사명', '소득구분', '외국인여부', '총지급액', '소득세', '지방소득세', '실수령액', '고용산재월보수신고액']
    const rows = taxLedger.map(item => [
      item.month, item.name, item.category === 'business' ? '사업소득' : '기타소득',
      item.isForeigner ? 'Y' : 'N', item.amount, item.incomeTax, item.localTax, item.netPay, item.category === 'business' ? item.insurance : ''
    ])
    
    const summaryHeaders = ['\n귀속년월', '소득구분', '인원수', '총지급액 합계', '소득세 합계', '지방소득세 합계', '실수령액 합계', '고용산재월보수신고액 합계']
    const summaryRows = taxMonthlySummaries.map(item => [
      item.month, item.category === 'business' ? '사업소득' : '기타소득', item.count + '명',
      item.amount, item.incomeTax, item.localTax, item.netPay, item.category === 'business' ? item.insurance : ''
    ])

    const csvContent = [headers.join(','), ...rows.map(e => e.join(',')), summaryHeaders.join(','), ...summaryRows.map(e => e.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', '원천세_월별누계대장.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const CALCS = [
    { key: 'travel', label: '여비 (새창)', subLabel: '제작: 해남우수영초 전현우', icon: '✈️', run: () => {} },
    { key: 'instructor', label: '강사수당', icon: '👨‍🏫', run: calcInstructor },
    { key: 'vat', label: '부가세', icon: '📊', run: calcVat },
    { key: 'insurance', label: '4대보험', icon: '🏥', run: calcInsurance },
    { key: 'tax', label: '원천세', icon: '🧾', run: calcTax },
    { key: 'unit', label: '단위 변환', icon: '📏', run: () => {} },
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
        activeCalc === 'tax' ? taxCalc : insurance
      ),
      result_data: text
    })
    setSaved(true)
  }

  return (
    <div className="fade-in space-y-4 pb-10">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
          <Calculator size={16} className="text-white" />
        </div>
        <h1 className="page-title">업무 계산기</h1>
      </div>

      {/* 계산기 선택 */}
      <div className="grid grid-cols-5 gap-2">
        {CALCS.map(({ key, label, icon, subLabel }) => (
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
            {subLabel && <span className="text-[9px] opacity-60 leading-tight text-center px-1">{subLabel}</span>}
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
                  {['3', '4', '5', '6', '7'].map(g => <option key={g} value={g}>{g}급</option>)}
                </select>
              </div>
              <div><label className="label">출장 일수</label><input className="input" value={travel.days} onChange={e => setTravel({ ...travel, days: e.target.value })} type="number" min="1" /></div>
              <div><label className="label">교통비 (편도, 원)</label><input className="input" value={travel.transport} onChange={e => setTravel({ ...travel, transport: e.target.value })} type="number" /></div>
              <div><label className="label">실제 숙박비 (원)</label><input className="input" value={travel.hotel} onChange={e => setTravel({ ...travel, hotel: e.target.value })} type="number" /></div>
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
              <div><label className="label">강의 시간수 (시간)</label><input className="input" value={instructor.hours} onChange={e => setInstructor({ ...instructor, hours: e.target.value })} type="number" step="1" /></div>
              <div><label className="label">원고료 매수 (A4 기준)</label><input className="input" value={instructor.pages} onChange={e => setInstructor({ ...instructor, pages: e.target.value })} type="number" /></div>
            </>
          )}

          {activeCalc === 'vat' && (
            <div><label className="label">합계 금액 (원)</label><input className="input" value={vatCalc.total} onChange={e => setVatCalc({ ...vatCalc, total: e.target.value })} type="number" /></div>
          )}

          {activeCalc === 'insurance' && (
            <div><label className="label">월 급여 (원)</label><input className="input" value={insurance.salary} onChange={e => setInsurance({ salary: e.target.value })} type="number" /></div>
          )}

          {activeCalc === 'tax' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">귀속년월</label>
                  <input className="input" type="month" value={taxCalc.lectureMonth} onChange={e => { setTaxCalc({ ...taxCalc, lectureMonth: e.target.value }); setResult([]) }} />
                </div>
                <div>
                  <label className="label">강사명</label>
                  <input className="input" type="text" placeholder="예: 홍길동" value={taxCalc.name} onChange={e => { setTaxCalc({ ...taxCalc, name: e.target.value }); setResult([]) }} />
                </div>
              </div>
              <div>
                <label className="label">총지급액 (원)</label>
                <input className="input" type="text" placeholder="0" 
                  value={taxCalc.amountStr ? parseInt(taxCalc.amountStr.replace(/[^0-9]/g, ''), 10).toLocaleString() : ''}
                  onChange={e => {
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setTaxCalc({ ...taxCalc, amountStr: value })
                    setResult([])
                  }} />
              </div>
              <div>
                <label className="label">소득 구분</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button type="button" onClick={() => { setTaxCalc({ ...taxCalc, category: 'business' }); setResult([]) }}
                    className={`p-2 rounded-lg border text-left transition-all text-xs ${taxCalc.category === 'business' ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-bold' : 'border-slate-200 bg-white text-slate-500'}`}>
                    <div className="mb-0.5">사업소득</div><div className="text-[10px] opacity-70">지속적 강의 (3.3%)</div>
                  </button>
                  <button type="button" onClick={() => { setTaxCalc({ ...taxCalc, category: 'other' }); setResult([]) }}
                    className={`p-2 rounded-lg border text-left transition-all text-xs ${taxCalc.category === 'other' ? 'border-amber-500 bg-amber-500/10 text-amber-600 font-bold' : 'border-slate-200 bg-white text-slate-500'}`}>
                    <div className="mb-0.5">기타소득</div><div className="text-[10px] opacity-70">일시적 강의 (8.8%)</div>
                  </button>
                </div>
              </div>
              <div className="flex items-center pt-1">
                <input id="foreignCheck" type="checkbox" className="w-3.5 h-3.5 rounded border-slate-300 text-amber-500"
                  checked={taxCalc.isForeigner} onChange={e => { setTaxCalc({ ...taxCalc, isForeigner: e.target.checked }); setResult([]) }} />
                <label htmlFor="foreignCheck" className="ml-1.5 text-xs text-slate-600 cursor-pointer">외국인(비거주자) 여부</label>
              </div>
            </>
          )}

          {activeCalc === 'unit' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {UNIT_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => changeUnitCategory(cat.id)}
                    className={`px-3 py-1.5 text-[11px] rounded-lg transition-colors font-medium text-center border ${unitCategory === cat.id ? 'bg-amber-500 border-amber-500 text-white shadow-sm' : 'hover:opacity-80'}`}
                    style={unitCategory !== cat.id ? { background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border-color)' } : {}}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-end">
                <div className="col-span-3 mb-1">
                  <label className="label">값</label>
                  <input className="input w-full text-sm font-semibold" value={unitValue} onChange={e => {
                    const v = e.target.value.replace(/[^0-9.-]/g, '');
                    setUnitValue(v);
                  }} type="text" />
                </div>
                <div className="col-span-1">
                  <label className="label">에서</label>
                  <select className="input w-full text-xs" style={{ color: 'var(--text-primary)' }} value={unitFrom} onChange={e => setUnitFrom(e.target.value)}>
                    {Object.keys(UNIT_DATA[unitCategory]).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 flex justify-center pb-2 opacity-50">
                  <RefreshCw size={14} className="text-slate-400" />
                </div>
                <div className="col-span-1">
                  <label className="label">으로</label>
                  <select className="input w-full text-xs" style={{ color: 'var(--text-primary)' }} value={unitTo} onChange={e => setUnitTo(e.target.value)}>
                    {Object.keys(UNIT_DATA[unitCategory]).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeCalc !== 'unit' && (
            <button onClick={handleCalculate} className="btn-primary w-full justify-center">
              <RefreshCw size={14} /> 계산하기
            </button>
          )}
        </div>

        {/* 결과 영역 */}
        <div className="card flex flex-col">
          <p className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>계산 결과</p>
          {activeCalc === 'unit' ? (
            <div className="flex-grow flex flex-col justify-center items-center py-6 bg-slate-50/50 rounded-xl border border-slate-100">
              <span className="text-xs text-slate-500 mb-2">{unitValue || '0'} {unitFrom} =</span>
              <div className="text-3xl font-bold text-amber-600 break-all text-center px-4">
                {unitResult || '0'}
                <span className="text-lg ml-2 text-amber-500/70">{unitTo}</span>
              </div>
            </div>
          ) : result.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{activeCalc === 'tax' ? '좌측 양식을 입력한 후 계산하기 버튼을 눌러주세요.' : '계산 결과가 여기에 표시됩니다'}</p>
          ) : (
            <div className="space-y-2 flex-grow flex flex-col justify-between">
              <div className="space-y-2">
                {result.map(({ label, value, highlight, color }) => (
                  <div key={label} className={`flex justify-between items-center py-2 px-3 rounded-lg ${highlight ? '' : ''}`}
                    style={highlight ? { background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.1)' } : {}}>
                    <span className="text-xs" style={{ color: color || (highlight ? 'var(--text-primary)' : 'var(--text-secondary)') }}>{label}</span>
                    <span className={`font-semibold tabular-nums ${highlight ? 'text-[15px]' : 'text-sm'}`}
                      style={{ color: color || (highlight ? '#3b82f6' : 'var(--text-primary)') }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              {activeCalc !== 'tax' && (
                <button onClick={handleSave} className={`btn w-full justify-center mt-4 text-xs ${saved ? 'btn-ghost' : 'btn-primary'}`}>
                  <Save size={12} /> {saved ? '저장됨 ✓' : '결과 저장'}
                </button>
              )}
              {activeCalc === 'tax' && taxCalc.isForeigner && (
                <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-[10px] font-bold text-red-600">
                  ※ 외국인(비거주자) 소득은 국가간 조세조약 및 국내법 기준을 별도로 확인해야 합니다.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 스마트 원천세 누계대장 */}
      {activeCalc === 'tax' && taxLedger.length > 0 && (
        <div className="card mt-4 fade-in overflow-hidden border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TableIcon size={16} className="text-amber-600" />
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>월별 지급명세서 및 원천세 누계 현황</p>
            </div>
            <div className="flex gap-2">
              <button onClick={downloadCSV} className="btn-ghost py-1 px-3 text-xs" style={{ color: '#f59e0b' }}>
                <Download size={12} className="mr-1" /> CSV 저장
              </button>
              <button onClick={() => window.print()} className="btn-primary py-1 px-3 text-xs bg-amber-500 hover:bg-amber-600 border-none">
                <Printer size={12} className="mr-1" /> 출력
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded border border-slate-200/40 custom-scrollbar mb-6">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead className="bg-slate-100/50 text-slate-600 font-medium">
                <tr>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40">귀속년월</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40">강사명</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40">소득구분</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40 text-right">총지급액</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40 text-right">소득세</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40 text-right">지방소득세</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40 text-right text-amber-600 font-bold">실수령액</th>
                  <th className="px-3 py-2 border-b border-slate-200/40 text-right">고용산재 신고액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxLedger.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-2 border-r border-slate-100 text-slate-500">{item.month}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-slate-700 font-medium">
                      {item.name} {item.isForeigner && <span className="ml-1 text-[9px] bg-red-500 text-white px-1 rounded-sm">외국인</span>}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-100 text-slate-500">{item.category === 'business' ? '사업소득' : '기타소득'}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-right font-medium">{item.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-right text-slate-500">
                      {item.incomeTax.toLocaleString()}
                      {item.isTaxExempt && <span className="block text-[9px] text-red-500">*과세최저한</span>}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-100 text-right text-slate-500">{item.localTax.toLocaleString()}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-right font-bold text-amber-600">{item.netPay.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-slate-500 font-medium">{item.category === 'business' ? item.insurance.toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 mb-3 mt-4 pt-4 border-t border-slate-200/60">
            <Calendar size={14} className="text-slate-500" />
            <p className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>과세 구분별 지급 누계 (월별 요약)</p>
          </div>
          <div className="overflow-x-auto rounded border border-slate-200/40 custom-scrollbar">
            <table className="w-full text-left text-[11px] whitespace-nowrap">
              <thead className="bg-slate-100/50 text-slate-600 font-medium">
                <tr>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40">귀속년월</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40">소득구분</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40 text-center">건수</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40 text-right">총지급액 합계</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40 text-right">소득세 합계</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40 text-right">지방소득세 합계</th>
                  <th className="px-3 py-2 border-b border-r border-slate-200/40 text-right text-amber-600 font-bold">실수령액 합계</th>
                  <th className="px-3 py-2 border-b border-slate-200/40 text-right">고용산재 신고액 합계</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxMonthlySummaries.map((summary, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 border-r border-slate-100 text-slate-700 font-medium">{summary.month}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-slate-700 font-medium">{summary.category === 'business' ? '사업소득' : '기타소득'}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-500">{summary.count}건</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-right font-medium">{summary.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-right text-slate-500">{summary.incomeTax.toLocaleString()}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-right text-slate-500">{summary.localTax.toLocaleString()}</td>
                    <td className="px-3 py-2 border-r border-slate-100 text-right font-bold text-amber-600">{summary.netPay.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-slate-500 font-medium">{summary.category === 'business' ? summary.insurance.toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
