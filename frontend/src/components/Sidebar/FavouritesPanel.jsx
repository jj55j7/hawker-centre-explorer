import { REGION_COLORS } from '../../utils/regionMapper'

export default function FavouritesPanel({
  hawkers,
  favourites,
  onToggleFavourite,
  onSelect,
  selectedId,
}) {
  const favouriteHawkers = [...favourites]
    .map(id => hawkers.find(h => h.id === id))
    .filter(Boolean)

  if (favouriteHawkers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <span className="text-4xl mb-3 select-none">♡</span>
        <p className="text-sm font-semibold text-hawker-dark">No favourites yet</p>
        <p className="text-xs text-hawker-muted mt-1.5 leading-relaxed max-w-[200px]">
          Click the heart button in any hawker centre popup to save it here
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-0.5">
      {favouriteHawkers.map(h => {
        const isSelected  = h.id === selectedId
        const regionColor = REGION_COLORS[h.region] ?? '#95A5A6'

        return (
          <div
            key={h.id}
            className={`
              list-item rounded-xl border transition-all duration-200
              ${isSelected
                ? 'bg-hawker-red/5 border-hawker-red/40 shadow-sm'
                : 'bg-white border-hawker-border hover:border-hawker-muted hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-center justify-between px-3.5 pt-3 pb-1">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: regionColor }}
              >
                {h.region}
              </span>
              <button
                onClick={() => onToggleFavourite(h)}
                title="Remove from favourites"
                className="text-hawker-red hover:text-red-700 transition-colors text-lg leading-none"
              >
                ♥
              </button>
            </div>

            <button
              onClick={() => onSelect(h)}
              className="w-full text-left px-3.5 pb-3"
            >
              <p className={`text-sm font-semibold leading-snug ${
                isSelected ? 'text-hawker-red' : 'text-hawker-dark'
              }`}>
                {h.name}
              </p>
              <p className="text-xs text-hawker-muted mt-1 leading-relaxed">
                {h.address}
              </p>
              {h.postal && (
                <p className="text-[11px] text-hawker-muted/60 mt-0.5">
                  Singapore {h.postal}
                </p>
              )}
              {h.numStalls && (
                <p className="text-[11px] text-hawker-muted mt-1">
                  🍽 {h.numStalls} cooked food stalls
                </p>
              )}
              <p className="text-[10px] text-hawker-muted/50 mt-2 font-medium">
                Tap to view on map →
              </p>
            </button>
          </div>
        )
      })}
    </div>
  )
}
