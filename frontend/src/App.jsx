import { useState, useEffect } from 'react'
import { useHawkerData }  from './hooks/useHawkerData'
import { useFilter }      from './hooks/useFilter'
import { useGeolocation } from './hooks/useGeolocation'
import { closestN }       from './utils/distanceCalculator'
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
      />
      <main className="relative flex-1 h-full overflow-hidden">
        <HawkerMap
          hawkers={hawkers}
          displayList={displayList}
          selectedHawker={selectedHawker}
          onSelectHawker={setSelectedHawker}
          userPosition={position}
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

// /**
//  * App.jsx  —  Root component
//  *
//  * State lives here; props flow down to children.
//  * This is the "single source of truth" for:
//  *   • hawker data  (from useHawkerData)
//  *   • filter state (from useFilter)
//  *   • selected hawker
//  *   • user geolocation / near-me list
//  */

// import { useState, useEffect } from 'react'

// import { useHawkerData }    from './hooks/useHawkerData'
// import { useFilter }        from './hooks/useFilter'
// import { useGeolocation }   from './hooks/useGeolocation'
// import { closestN }         from './utils/distanceCalculator'

// import Sidebar    from './components/Sidebar/Sidebar'
// import HawkerMap  from './components/Map/HawkerMap'
// import StatsPanel from './components/Dashboard/StatsPanel'

// export default function App() {
//   /* ── Data ──────────────────────────────────────────────── */
//   const { hawkers, loading, error } = useHawkerData()

//   /* ── Filters ───────────────────────────────────────────── */
//   const {
//     searchQuery, setSearchQuery, isSearching,
//     selectedRegion, setSelectedRegion,
//     filtered, clearFilters, hasActiveFilter,
//   } = useFilter(hawkers)

//   /* ── Selected hawker ────────────────────────────────────── */
//   const [selectedHawker, setSelectedHawker] = useState(null)

//   /* ── Geolocation / Near Me ──────────────────────────────── */
//   const {
//     position, geoLoading, geoError,
//     requestLocation, clearPosition,
//   } = useGeolocation()

//   // nearMeList overrides the normal filtered list when active
//   const [nearMeList, setNearMeList] = useState(null)

//   useEffect(() => {
//     if (position && hawkers.length) {
//       const closest = closestN(hawkers, position, 5)
//       setNearMeList(closest)
//       // Auto-select the closest one so the map flies there
//       setSelectedHawker(closest[0] ?? null)
//     }
//   }, [position, hawkers])

//   function handleClearNearMe() {
//     clearPosition()
//     setNearMeList(null)
//   }

//   /* ── What the sidebar list actually shows ───────────────── */
//   // Near-me results take priority over normal search/filter results
//   const displayList = nearMeList ?? filtered

//   /* ── Handlers ───────────────────────────────────────────── */
//   function handleSelectHawker(hawker) {
//     setSelectedHawker(hawker)
//   }

//   /* ── Render ─────────────────────────────────────────────── */
//   return (
//     <div className="flex h-screen w-screen overflow-hidden bg-hawker-warm">

//       {/* Left sidebar */}
//       <Sidebar
//         loading={loading}
//         error={error}
//         totalCount={hawkers.length}
//         displayList={displayList}
//         selectedId={selectedHawker?.id ?? null}
//         onSelect={handleSelectHawker}
//         searchQuery={searchQuery}
//         setSearchQuery={setSearchQuery}
//         isSearching={isSearching}
//         selectedRegion={selectedRegion}
//         setSelectedRegion={setSelectedRegion}
//         hasActiveFilter={hasActiveFilter}
//         clearFilters={clearFilters}
//         onNearMe={requestLocation}
//         geoLoading={geoLoading}
//         geoError={geoError}
//         position={position}
//         onClearNearMe={handleClearNearMe}
//       />

//       {/* Right — map + overlays */}
//       <main className="relative flex-1 h-full overflow-hidden">
//         <HawkerMap
//           hawkers={hawkers}
//           displayList={displayList}
//           selectedHawker={selectedHawker}
//           onSelectHawker={handleSelectHawker}
//           userPosition={position}
//         />

//         {/* Stats overlay — only shown once data is loaded */}
//         {!loading && !error && (
//           <StatsPanel
//             hawkers={hawkers}
//             displayList={displayList}
//             selectedRegion={selectedRegion}
//             onRegionChange={setSelectedRegion}
//           />
//         )}
//       </main>
//     </div>
//   )
// }

// // import { useState } from 'react'
// // import reactLogo from './assets/react.svg'
// // import viteLogo from './assets/vite.svg'
// // import heroImg from './assets/hero.png'
// // import './App.css'

// // function App() {
// //   const [count, setCount] = useState(0)

// //   return (
// //     <>
// //       <section id="center">
// //         <div className="hero">
// //           <img src={heroImg} className="base" width="170" height="179" alt="" />
// //           <img src={reactLogo} className="framework" alt="React logo" />
// //           <img src={viteLogo} className="vite" alt="Vite logo" />
// //         </div>
// //         <div>
// //           <h1>Get started</h1>
// //           <p>
// //             Edit <code>src/App.jsx</code> and save to test <code>HMR</code>
// //           </p>
// //         </div>
// //         <button
// //           className="counter"
// //           onClick={() => setCount((count) => count + 1)}
// //         >
// //           Count is {count}
// //         </button>
// //       </section>

// //       <div className="ticks"></div>

// //       <section id="next-steps">
// //         <div id="docs">
// //           <svg className="icon" role="presentation" aria-hidden="true">
// //             <use href="/icons.svg#documentation-icon"></use>
// //           </svg>
// //           <h2>Documentation</h2>
// //           <p>Your questions, answered</p>
// //           <ul>
// //             <li>
// //               <a href="https://vite.dev/" target="_blank">
// //                 <img className="logo" src={viteLogo} alt="" />
// //                 Explore Vite
// //               </a>
// //             </li>
// //             <li>
// //               <a href="https://react.dev/" target="_blank">
// //                 <img className="button-icon" src={reactLogo} alt="" />
// //                 Learn more
// //               </a>
// //             </li>
// //           </ul>
// //         </div>
// //         <div id="social">
// //           <svg className="icon" role="presentation" aria-hidden="true">
// //             <use href="/icons.svg#social-icon"></use>
// //           </svg>
// //           <h2>Connect with us</h2>
// //           <p>Join the Vite community</p>
// //           <ul>
// //             <li>
// //               <a href="https://github.com/vitejs/vite" target="_blank">
// //                 <svg
// //                   className="button-icon"
// //                   role="presentation"
// //                   aria-hidden="true"
// //                 >
// //                   <use href="/icons.svg#github-icon"></use>
// //                 </svg>
// //                 GitHub
// //               </a>
// //             </li>
// //             <li>
// //               <a href="https://chat.vite.dev/" target="_blank">
// //                 <svg
// //                   className="button-icon"
// //                   role="presentation"
// //                   aria-hidden="true"
// //                 >
// //                   <use href="/icons.svg#discord-icon"></use>
// //                 </svg>
// //                 Discord
// //               </a>
// //             </li>
// //             <li>
// //               <a href="https://x.com/vite_js" target="_blank">
// //                 <svg
// //                   className="button-icon"
// //                   role="presentation"
// //                   aria-hidden="true"
// //                 >
// //                   <use href="/icons.svg#x-icon"></use>
// //                 </svg>
// //                 X.com
// //               </a>
// //             </li>
// //             <li>
// //               <a href="https://bsky.app/profile/vite.dev" target="_blank">
// //                 <svg
// //                   className="button-icon"
// //                   role="presentation"
// //                   aria-hidden="true"
// //                 >
// //                   <use href="/icons.svg#bluesky-icon"></use>
// //                 </svg>
// //                 Bluesky
// //               </a>
// //             </li>
// //           </ul>
// //         </div>
// //       </section>

// //       <div className="ticks"></div>
// //       <section id="spacer"></section>
// //     </>
// //   )
// // }

// // export default App
