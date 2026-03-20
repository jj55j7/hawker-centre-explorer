import { REGIONS, REGION_COLORS } from '../../utils/regionMapper'

export default function RegionFilter({ selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {REGIONS.map(region => {
        const active = selected === region
        const colour = REGION_COLORS[region] ?? '#C0392B'
        return (
          <button
            key={region}
            onClick={() => onChange(region)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${
              active
                ? 'text-white border-transparent shadow-sm scale-105'
                : 'bg-white text-hawker-muted border-hawker-border hover:border-hawker-muted'
            }`}
            style={active ? { backgroundColor: colour, borderColor: colour } : {}}
          >
            {region}
          </button>
        )
      })}
    </div>
  )
}