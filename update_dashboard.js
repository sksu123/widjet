const fs = require('fs');

const path = 'd:/widget/src/renderer/src/pages/Dashboard/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. 상태 추가
const stateTarget = "const [weather, setWeather] = useState<WeatherData | null>(null)";
const stateReplacement = `const [weather, setWeather] = useState<WeatherData | null>(null)
  const [weatherSummary, setWeatherSummary] = useState('')
  const [weatherSummaryLoading, setWeatherSummaryLoading] = useState(false)`;

content = content.replace(stateTarget, stateReplacement);

// 2. loadWeatherSummary 로직 추가 및 useEffect 수정
// We add an effect to listen to weather changes.
const loadDataTarget = "useEffect(() => {\n    loadData()\n  }, [])";
const loadDataReplacement = `useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (weather) {
      loadWeatherSummary(weather)
    }
  }, [weather])

  async function loadWeatherSummary(wData: WeatherData) {
    if (!window.api.ai || !(window.api.ai as any).weatherSummary) return;
    setWeatherSummaryLoading(true)
    try {
      const res = await (window.api.ai as any).weatherSummary(wData)
      if (res.success) setWeatherSummary(res.text)
    } finally {
      setWeatherSummaryLoading(false)
    }
  }`;

content = content.replace(loadDataTarget, loadDataReplacement);

// 3. 날씨 모달 내용 변경
const startMarker = "{/* 날씨 상세 모달 */}";
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) {
  console.log("Could not find 날씨 상세 모달");
  process.exit(1);
}

// 모달 끝부분은 "    </div>\n  )\n}" 이전
const endIdx = content.lastIndexOf("    </div>\n  )\n}");

const newModal = `      {/* 날씨 상세 모달 */}
      {showWeatherModal && weather && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => { setShowWeatherModal(false); setShowRegionSelector(false); }}>
          <div className="w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90vh' }}
            onClick={e => { e.stopPropagation(); setShowRegionSelector(false); }}>
            
            {/* 상단 헤더 */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
              <div className="flex items-center gap-3">
                <Sun size={20} className="text-orange-500" />
                <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>날씨 정보</span>
                
                <div className="relative ml-2">
                  <button onClick={(e) => { e.stopPropagation(); setShowRegionSelector(!showRegionSelector); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors" 
                    style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                    <MapPin size={14} className="text-emerald-500" /> {weather.city}
                  </button>
                  {showRegionSelector && (
                    <div className="absolute left-0 top-full mt-2 w-80 z-[60]" onClick={e => e.stopPropagation()}>
                      <RegionSelector onSelect={async (city, code) => {
                          setShowRegionSelector(false)
                          await window.api.db.updateSetting('weather_city', city)
                          await window.api.db.updateSetting('weather_zone_code', code)
                          setIsWeatherRefreshing(true)
                          const res = await window.api.calendar.getWeather(true)
                          if (res.success) setWeather(res.data as WeatherData)
                          setIsWeatherRefreshing(false)
                        }} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>마지막 업데이트: {weather.updatedAt || '방금 전'}</span>
                <button onClick={async () => {
                  setIsWeatherRefreshing(true)
                  const res = await window.api.calendar.getWeather(true)
                  if (res.success) setWeather(res.data as WeatherData)
                  setIsWeatherRefreshing(false)
                }} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" style={{ color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                  <RefreshCw size={12} className={isWeatherRefreshing ? 'animate-spin' : ''} /> 새로고침
                </button>
                <button onClick={() => setShowWeatherModal(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" style={{ color: 'var(--text-muted)' }}>
                  <XIcon size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg-background)' }}>
              
              {/* AI 날씨 요약 배너 */}
              <div className="mb-6 rounded-xl p-4 border flex items-start gap-3 shadow-sm" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.2)' }}>
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Bot size={20} className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1">AI 행정 업무 날씨 브리핑</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {weatherSummaryLoading ? '날씨 정보를 기반으로 행정 업무 요약을 생성 중입니다...' : (weatherSummary || '날씨 정보가 업데이트되었습니다.')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
                
                {/* 좌측: 현재 날씨 상세 */}
                <div className="flex flex-col gap-4">
                  <div className="rounded-2xl p-8 flex flex-col items-center justify-center border shadow-sm relative overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="mx-auto scale-[2] transform origin-center mb-6">{weatherIcon(weather.icon)}</div>
                    <p className="text-6xl font-bold mb-2 tracking-tighter" style={{ color: 'var(--text-primary)' }}>{weather.temp}°C</p>
                    <p className="text-lg font-bold mb-4" style={{ color: 'var(--text-secondary)' }}>{weather.description}</p>
                    <div className="flex items-center gap-1.5 text-sm font-medium mb-6 px-3 py-1 rounded-full" style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--text-muted)' }}>
                      <MapPin size={12} /> {weather.city}
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2 mb-6 w-full">
                      <div className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        미세먼지 {weather.pm10 || '정보없음'}
                      </div>
                      <div className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        초미세먼지 {weather.pm25 || '정보없음'}
                      </div>
                      <div className="px-3 py-1.5 rounded-full text-xs font-bold w-full text-center mt-1" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                        오존 {weather.ozone || '정보없음'}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 w-full">
                      <div className="rounded-xl p-3 flex flex-col items-center justify-center border" style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-muted)' }}><Droplets size={14} /> <span className="text-xs font-medium">습도</span></div>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{weather.humidity || '-'}</p>
                      </div>
                      <div className="rounded-xl p-3 flex flex-col items-center justify-center border" style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-muted)' }}><Wind size={14} /> <span className="text-xs font-medium">풍속</span></div>
                        <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{weather.wind || '-'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 우측: 주간 예보 그리드 */}
                <div className="flex flex-col gap-4 h-full">
                  <div className="rounded-2xl p-6 border shadow-sm flex flex-col h-full" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}><CalendarIcon size={16} className="text-emerald-500" /> 주간 예보</h3>
                      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>오전/오후 강수확률 · 최저/최고</p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {weather.weekly && weather.weekly.length > 0 ? (
                        weather.weekly.map((w, i) => {
                          const isToday = i === 0;
                          return (
                            <div key={i} className="rounded-xl p-4 border flex flex-col items-center justify-center text-center transition-all hover:-translate-y-1 hover:shadow-md" 
                              style={{ 
                                borderColor: isToday ? 'rgba(16,185,129,0.3)' : 'var(--border)', 
                                background: isToday ? 'rgba(16,185,129,0.03)' : 'var(--bg-background)'
                              }}>
                              <p className={\`text-sm font-bold \${isToday ? 'text-emerald-600 dark:text-emerald-400' : ''}\`} style={{ color: isToday ? '' : 'var(--text-primary)' }}>{isToday ? '오늘' : w.day}</p>
                              <p className="text-[10px] font-medium mb-3" style={{ color: 'var(--text-muted)' }}>{w.date}</p>
                              
                              <div className="flex items-center justify-center gap-4 w-full mb-3">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>오전</span>
                                  <div className="scale-75 origin-center">{weatherIcon(w.amIcon)}</div>
                                  <span className="text-[10px] font-bold text-blue-500">{w.amRain}</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>오후</span>
                                  <div className="scale-75 origin-center">{weatherIcon(w.pmIcon)}</div>
                                  <span className="text-[10px] font-bold text-blue-500">{w.pmRain}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-blue-500">{w.low}°</span>
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/</span>
                                <span className="text-sm font-bold text-red-500">{w.high}°</span>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="col-span-full py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>주간 예보 정보가 없습니다.</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
`;

content = content.substring(0, startIdx) + newModal + "\n" + content.substring(endIdx);
fs.writeFileSync(path, content);
console.log("Dashboard.tsx update success");
