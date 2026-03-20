import { useState } from 'react'
import SearchBar       from './SearchBar'
import RegionFilter    from './RegionFilter'
import HawkerList      from './HawkerList'
import FavouritesPanel from './FavouritesPanel'
import LoadingSkeleton from '../UI/LoadingSkeleton'
import ErrorMessage    from '../UI/ErrorMessage'

/**
 * Sidebar with two tabs:
 *   "Explore"     — search + filter + full hawker list
 *   "Favourites"  — saved hawker centres with remove button
 */
export default function Sidebar({
  loading, error,
  totalCount, displayList,
  selectedId, onSelect,
  searchQuery, setSearchQuery, isSearching,
  selectedRegion, setSelectedRegion,
  hasActiveFilter, clearFilters,
  onNearMe, geoLoading, geoError,
  position, onClearNearMe,
  // favourites props
  hawkers,
  favourites,
  onToggleFavourite,
}) {
  const [activeTab, setActiveTab] = useState('explore') // 'explore' | 'favourites'

  const favCount = favourites?.size ?? 0

  return (
    <aside className="relative w-[340px] shrink-0 h-full bg-hawker-card border-r border-hawker-border flex flex-col overflow-hidden shadow-[4px_0_24px_rgba(26,18,8,0.07)] z-10">

      {/* ── Header ── */}
      <div className="px-5 pt-5 pb-3 border-b border-hawker-border shrink-0">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-[26px] leading-tight text-hawker-dark">
              Hawker Centre<br />
              <em className="not-italic text-hawker-red">Explorer</em>
            </h1>
            <p className="text-xs text-hawker-muted mt-1.5">
              {loading
                ? 'Loading centres…'
                : activeTab === 'explore'
                  ? `${displayList.length} of ${totalCount} centres`
                  : `${favCount} saved centre${favCount !== 1 ? 's' : ''}`
              }
            </p>
          </div>
          <span className="text-2xl select-none mt-1">🇸🇬</span>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 mt-3">
          <button
            onClick={() => setActiveTab('explore')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200 ${
              activeTab === 'explore'
                ? 'bg-hawker-red text-white shadow-sm'
                : 'bg-hawker-warm text-hawker-muted hover:bg-hawker-border'
            }`}
          >
            🗺 Explore
          </button>
          <button
            onClick={() => setActiveTab('favourites')}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all duration-200 relative ${
              activeTab === 'favourites'
                ? 'bg-hawker-red text-white shadow-sm'
                : 'bg-hawker-warm text-hawker-muted hover:bg-hawker-border'
            }`}
          >
            ♥ Favourites
            {/* Badge showing count */}
            {favCount > 0 && (
              <span className={`
                absolute -top-1.5 -right-1.5
                min-w-[18px] h-[18px] px-1
                rounded-full text-[10px] font-bold
                flex items-center justify-center
                ${activeTab === 'favourites' ? 'bg-white text-hawker-red' : 'bg-hawker-red text-white'}
              `}>
                {favCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorMessage message={error} />
      ) : activeTab === 'favourites' ? (
        /* ── Favourites tab ── */
        <div className="flex flex-col flex-1 overflow-hidden px-4 py-3">
          <FavouritesPanel
            hawkers={hawkers}
            favourites={favourites}
            onToggleFavourite={onToggleFavourite}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        </div>
      ) : (
        /* ── Explore tab ── */
        <div className="flex flex-col flex-1 overflow-hidden px-4 py-3 gap-2.5">

          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            isSearching={isSearching}
          />

          <RegionFilter
            selected={selectedRegion}
            onChange={setSelectedRegion}
          />

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            {!position ? (
              <button
                onClick={onNearMe}
                disabled={geoLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-hawker-orange/10 border border-hawker-orange/40 text-hawker-orange text-xs font-semibold rounded-xl hover:bg-hawker-orange/20 disabled:opacity-50 transition-all duration-200"
              >
                {geoLoading ? '⏳ Locating…' : '📍 Near Me'}
              </button>
            ) : (
              <button
                onClick={onClearNearMe}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-hawker-orange text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition-colors"
              >
                ✕ Clear Near Me
              </button>
            )}
            {hasActiveFilter && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-xs font-semibold bg-hawker-warm text-hawker-muted border border-hawker-border rounded-xl hover:bg-hawker-border transition-colors"
              >
                Clear filters
              </button>
            )}
          </div>

          {geoError && (
            <p className="text-xs text-hawker-red bg-red-50 px-3 py-2 rounded-lg leading-relaxed animate-fade-in">
              {geoError}
            </p>
          )}
          {position && (
            <p className="text-[11px] font-semibold text-hawker-orange bg-orange-50 px-3 py-1.5 rounded-lg animate-fade-in">
              📍 Showing 5 closest to your location
            </p>
          )}

          <HawkerList
            hawkers={displayList}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        </div>
      )}
    </aside>
  )
}
