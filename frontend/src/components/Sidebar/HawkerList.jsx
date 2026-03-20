import { REGION_COLORS } from '../../utils/regionMapper'
import { formatDistance } from '../../utils/distanceCalculator'

export default function HawkerList({ hawkers, selectedId, onSelect }) {
  if (hawkers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <span className="text-3xl mb-3 select-none">🔍</span>
        <p className="text-sm font-medium text-hawker-dark">No hawker centres found</p>
        <p className="text-xs text-hawker-muted mt-1">Try a different name or remove a filter</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-0.5">
      {hawkers.map((h, idx) => {
        const isSelected  = h.id === selectedId
        const regionColor = REGION_COLORS[h.region] ?? '#95A5A6'
        return (
          <li key={h.id}>
            <button
              onClick={() => onSelect(h)}
              className={`list-item w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-200 ${
                isSelected
                  ? 'bg-hawker-red/5 border-hawker-red/40 shadow-sm'
                  : 'bg-white border-hawker-border hover:border-hawker-muted hover:shadow-sm'
              }`}
              style={{ animationDelay: `${Math.min(idx * 0.025, 0.15)}s` }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate leading-tight ${isSelected ? 'text-hawker-red' : 'text-hawker-dark'}`}>
                    {h.name}
                  </p>
                  <p className="text-xs text-hawker-muted mt-0.5 truncate">{h.address}</p>
                  {h.postal && (
                    <p className="text-[11px] text-hawker-muted/60 mt-0.5">Singapore {h.postal}</p>
                  )}
                  {h.distanceKm !== undefined && (
                    <p className="text-xs font-semibold text-hawker-orange mt-1.5">
                      📍 {formatDistance(h.distanceKm)}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white leading-tight"
                  style={{ backgroundColor: regionColor }}
                >
                  {h.region}
                </span>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}