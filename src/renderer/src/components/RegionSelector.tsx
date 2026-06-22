import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { KMA_ZONES } from '../utils/kma-zones'

interface RegionSelectorProps {
  onSelect: (city: string, zoneCode: string) => void;
  onClose?: () => void;
}

export function RegionSelector({ onSelect }: RegionSelectorProps) {
  const [activeProvinceIndex, setActiveProvinceIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  const activeProvince = KMA_ZONES[activeProvinceIndex]

  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return activeProvince.cities
    const query = searchQuery.trim()
    return KMA_ZONES.flatMap(p => p.cities.map(c => ({ ...c, fullName: `${p.province} ${c.name}` })))
      .filter(c => c.fullName.includes(query) || c.name.includes(query))
  }, [searchQuery, activeProvinceIndex])

  return (
    <div className="w-full bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] border border-pink-100 overflow-hidden text-slate-800">
      {/* 검색 바 */}
      <div className="p-3 border-b border-pink-50 bg-white">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full bg-pink-50/50 border-none rounded-full pl-9 pr-4 py-2 text-[13px] outline-none focus:bg-pink-50 transition-colors placeholder:text-slate-400"
            placeholder="지역명 검색..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex h-[280px]">
        {/* 좌측 탭 (시/도) */}
        {!searchQuery.trim() && (
          <div className="w-[85px] bg-white border-r border-pink-50 overflow-y-auto custom-scrollbar">
            {KMA_ZONES.map((zone, idx) => (
              <button
                key={zone.province}
                onClick={() => setActiveProvinceIndex(idx)}
                className={`w-full py-3.5 text-[13px] text-center transition-colors relative border-b border-pink-50/50 last:border-b-0
                  ${activeProvinceIndex === idx ? 'text-pink-500 font-bold bg-white' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {zone.province}
                {activeProvinceIndex === idx && (
                  <div className="absolute top-0 bottom-0 left-0 w-0.5 bg-pink-500" />
                )}
                {activeProvinceIndex === idx && (
                  <div className="absolute top-0 bottom-0 right-[-1px] w-0.5 bg-white z-10" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* 우측 목록 (시/군/구) */}
        <div className="flex-1 bg-white overflow-y-auto custom-scrollbar p-2">
          <div className="grid grid-cols-3 gap-1">
            {filteredCities.map((city, idx) => (
              <button
                key={idx}
                onClick={() => onSelect('fullName' in city ? city.fullName as string : `${activeProvince.province} ${city.name}`, city.code)}
                className="py-2.5 px-1 text-[12px] text-slate-600 hover:bg-pink-50 hover:text-pink-600 rounded-lg transition-colors text-center truncate"
              >
                {'fullName' in city ? city.fullName : city.name}
              </button>
            ))}
            {filteredCities.length === 0 && (
              <div className="col-span-3 text-center py-10 text-slate-400 text-[12px]">
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
