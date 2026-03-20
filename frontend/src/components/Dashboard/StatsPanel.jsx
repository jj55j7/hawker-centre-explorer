import { useState, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { REGION_COLORS } from '../../utils/regionMapper'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { region, count } = payload[0].payload
  return (
    <div style={{ background: '#FFFDF7', border: '1px solid #E8DFC8', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
      <p style={{ margin: 0, fontWeight: 700, color: REGION_COLORS[region] }}>{region}</p>
      <p style={{ margin: '2px 0 0', color: '#8B7355' }}>{count} centres</p>
    </div>
  )
}

export default function StatsPanel({ hawkers, displayList, selectedRegion, onRegionChange }) {
  const [open, setOpen] = useState(true)

  const regionData = useMemo(() => {
    const counts = {}
    hawkers.forEach(h => {
      if (h.region === 'Unknown') return
      counts[h.region] = (counts[h.region] || 0) + 1
    })
    return Object.entries(counts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count)
  }, [hawkers])

  if (!hawkers.length) return null

  return (
    <div className="absolute bottom-6 right-6 z-[1000] w-60 animate-fade-in"
      style={{ background: '#FFFDF7', border: '1px solid #E8DFC8', borderRadius: 16, boxShadow: '0 8px 32px rgba(26,18,8,.14)', overflow: 'hidden' }}>

      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-hawker-warm transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          <span className="text-base select-none">📊</span>
          <span className="text-sm font-semibold text-hawker-dark">Overview</span>
        </div>
        <svg className={`text-hawker-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="m18 15-6-6-6 6" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-hawker-warm rounded-xl p-2.5 text-center">
              <p className="font-display text-2xl text-hawker-red leading-none">{hawkers.length}</p>
              <p className="text-[10px] text-hawker-muted font-medium mt-1">Total Centres</p>
            </div>
            <div className="bg-hawker-warm rounded-xl p-2.5 text-center">
              <p className="font-display text-2xl text-hawker-dark leading-none">{displayList.length}</p>
              <p className="text-[10px] text-hawker-muted font-medium mt-1">Showing Now</p>
            </div>
          </div>

          <p className="text-[10px] font-bold text-hawker-muted uppercase tracking-wider mb-2">By Region · click to filter</p>

          <ResponsiveContainer width="100%" height={105}>
            <BarChart data={regionData} margin={{ top: 2, right: 0, left: -28, bottom: 0 }}
              onClick={d => d?.activePayload && onRegionChange(d.activePayload[0].payload.region)}>
              <XAxis dataKey="region" tick={{ fontSize: 8.5, fill: '#8B7355', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8.5, fill: '#8B7355', fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(232,223,200,0.45)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} style={{ cursor: 'pointer' }}>
                {regionData.map(({ region }) => (
                  <Cell key={region} fill={selectedRegion === 'All' || selectedRegion === region ? REGION_COLORS[region] : '#E8DFC8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {selectedRegion !== 'All' && (
            <button onClick={() => onRegionChange('All')} className="mt-1 text-[10px] text-hawker-red font-semibold hover:underline">
              ← Show all regions
            </button>
          )}
        </div>
      )}
    </div>
  )
}