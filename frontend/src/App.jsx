import { useState, useEffect } from 'react'
import { useHawkerData }    from './hooks/useHawkerData'
import { useFilter }        from './hooks/useFilter'
import { useGeolocation }   from './hooks/useGeolocation'
import { useFavourites }    from './hooks/useFavourites'
import { closestN }         from './utils/distanceCalculator'
import Sidebar    from './components/Sidebar/Sidebar'
import HawkerMap  from './components/Map/HawkerMap'
import StatsPanel from './components/Dashboard/StatsPanel'

export default function App() {
  const { hawkers, loading, error } = useHawkerData()

  const {
    searchQuery, setSearchQuery, isSearching,
    selectedRegion, setSelectedRegion,
    filtered, clearFilters, hasActiveFilter,
  } = useFilter(hawkers)

  const [selectedHawker, setSelectedHawker] = useState(null)

  const {
    position, geoLoading, geoError,
    requestLocation, clearPosition,
  } = useGeolocation()

  // Supabase favourites
  const { favourites, toggleFavourite } = useFavourites()

  const [nearMeList, setNearMeList] = useState(null)

  useEffect(() => {
    if (position && hawkers.length) {
      const closest = closestN(hawkers, position, 5)
      setNearMeList(closest)
      setSelectedHawker(closest[0] ?? null)
    }
  }, [position, hawkers])

  function handleClearNearMe() {
    clearPosition()
    setNearMeList(null)
  }

  const displayList = nearMeList ?? filtered

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-hawker-warm">
      <Sidebar
        loading={loading}
        error={error}
        totalCount={hawkers.length}
        displayList={displayList}
        selectedId={selectedHawker?.id ?? null}
        onSelect={setSelectedHawker}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearching={isSearching}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        hasActiveFilter={hasActiveFilter}
        clearFilters={clearFilters}
        onNearMe={requestLocation}
        geoLoading={geoLoading}
        geoError={geoError}
        position={position}
        onClearNearMe={handleClearNearMe}
        hawkers={hawkers}
        favourites={favourites}
        onToggleFavourite={toggleFavourite}
      />

      <main className="relative flex-1 h-full overflow-hidden">
        <HawkerMap
          hawkers={hawkers}
          displayList={displayList}
          selectedHawker={selectedHawker}
          onSelectHawker={setSelectedHawker}
          userPosition={position}
          favourites={favourites}
          onToggleFavourite={toggleFavourite}
        />
        {!loading && !error && (
          <StatsPanel
            hawkers={hawkers}
            displayList={displayList}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
          />
        )}
      </main>
    </div>
  )
}
