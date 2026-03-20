import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { REGION_COLORS } from '../../utils/regionMapper'

const SG_CENTER = [1.3521, 103.8198]
const DEFAULT_ZOOM = 12

function pinIcon(color, isSelected = false) {
  const size = isSelected ? 38 : 30
  const svg = `<svg width="${size}" height="${size + 8}" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="ps${isSelected ? 's' : 'n'}" x="-40%" y="-20%" width="180%" height="180%">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="${color}" flood-opacity="0.45"/>
      </filter>
    </defs>
    <path d="M15 1C9.477 1 5 5.477 5 11c0 8 10 20 10 20S25 19 25 11C25 5.477 20.523 1 15 1z"
      fill="${color}" filter="url(#ps${isSelected ? 's' : 'n'})"/>
    <circle cx="15" cy="11" r="${isSelected ? 5.5 : 4.5}" fill="white" opacity="0.92"/>
  </svg>`
  return L.divIcon({
    html: svg, className: '',
    iconSize: [size, size + 8],
    iconAnchor: [size / 2, size + 8],
    popupAnchor: [0, -(size + 8)],
  })
}

function userIcon() {
  return L.divIcon({
    html: `<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
      <circle cx="14" cy="14" r="7" fill="#E67E22" stroke="white" stroke-width="2.5"/>
      <circle cx="14" cy="14" r="12" fill="none" stroke="#E67E22" stroke-width="1.5" opacity="0.5">
        <animate attributeName="r" values="7;14" dur="1.6s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0" dur="1.6s" repeatCount="indefinite"/>
      </circle>
    </svg>`,
    className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -18],
  })
}

function buildPopup(h, color) {
  return `<div style="min-width:220px;font-family:'DM Sans',sans-serif;">
    <div style="background:${color};padding:11px 14px;">
      <p style="margin:0;color:#fff;font-size:13px;font-weight:700;line-height:1.35;">${h.name}</p>
    </div>
    <div style="padding:11px 14px;display:flex;flex-direction:column;gap:6px;">
      <div style="display:flex;gap:7px;align-items:flex-start;">
        <span style="color:${color};margin-top:1px;flex-shrink:0;">📍</span>
        <p style="margin:0;color:#5a4a30;font-size:12px;line-height:1.4;">${h.address}</p>
      </div>
      ${h.postal ? `<div style="display:flex;gap:7px;align-items:center;">
        <span style="color:${color};">✉</span>
        <p style="margin:0;color:#8B7355;font-size:12px;">Singapore ${h.postal}</p>
      </div>` : ''}
      ${h.distanceKm !== undefined ? `<p style="margin:0;color:#E67E22;font-size:12px;font-weight:700;">
        🛵 ${h.distanceKm < 1 ? Math.round(h.distanceKm * 1000) + ' m away' : h.distanceKm.toFixed(1) + ' km away'}
      </p>` : ''}
      <div style="margin-top:4px;">
        <span style="background:${color}22;color:${color};font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;">${h.region}</span>
      </div>
    </div>
  </div>`
}

export default function HawkerMap({ hawkers, displayList, selectedHawker, onSelectHawker, userPosition }) {
  const divRef        = useRef(null)
  const mapRef        = useRef(null)
  const clusterRef    = useRef(null)
  const markersRef    = useRef({})
  const userMarkerRef = useRef(null)
  const initRef       = useRef(false)

  // Init map once
  useEffect(() => {
    if (initRef.current || !divRef.current) return
    initRef.current = true

    const map = L.map(divRef.current, { center: SG_CENTER, zoom: DEFAULT_ZOOM, zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'bottomleft' }).addTo(map)
    mapRef.current = map

    return () => { map.remove(); mapRef.current = null; initRef.current = false }
  }, [])

  // Build markers when data loads
  useEffect(() => {
    const map = mapRef.current
    if (!map || !hawkers.length) return

    if (clusterRef.current) map.removeLayer(clusterRef.current)

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 55,
      spiderfyOnMaxZoom: true,
      iconCreateFunction: (group) => {
        const n = group.getChildCount()
        const size = n < 10 ? 36 : n < 100 ? 42 : 50
        return L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:#C0392B;border:2.5px solid white;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-family:'DM Sans',sans-serif;font-weight:700;font-size:13px;box-shadow:0 3px 10px rgba(192,57,43,.45);">${n}</div>`,
          className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        })
      },
    })

    const newMarkers = {}
    hawkers.forEach(h => {
      if (!h.lat || !h.lng) return
      const color = REGION_COLORS[h.region] ?? '#C0392B'
      const marker = L.marker([h.lat, h.lng], { icon: pinIcon(color) })
      marker.bindPopup(buildPopup(h, color), { maxWidth: 280, autoPanPadding: [30, 60] })
      marker.on('click', () => onSelectHawker(h))
      cluster.addLayer(marker)
      newMarkers[h.id] = marker
    })

    map.addLayer(cluster)
    clusterRef.current = cluster
    markersRef.current = newMarkers
  }, [hawkers])

  // Sync selected marker
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const h = hawkers.find(x => x.id === Number(id))
      if (!h) return
      const color = REGION_COLORS[h.region] ?? '#C0392B'
      marker.setIcon(pinIcon(color, selectedHawker?.id === h.id))
    })

    if (selectedHawker) {
      const marker = markersRef.current[selectedHawker.id]
      if (marker) {
        map.flyTo([selectedHawker.lat, selectedHawker.lng], 17, { animate: true, duration: 0.9 })
        setTimeout(() => marker.openPopup(), 600)
      }
    }
  }, [selectedHawker])

  // Dim markers not in displayList
  useEffect(() => {
    const visibleIds = new Set(displayList.map(h => h.id))
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const el = marker.getElement?.()
      if (el) el.style.opacity = visibleIds.has(Number(id)) ? '1' : '0.18'
    })
  }, [displayList])

  // User location pin
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (userMarkerRef.current) { map.removeLayer(userMarkerRef.current); userMarkerRef.current = null }
    if (userPosition) {
      const m = L.marker([userPosition.lat, userPosition.lng], { icon: userIcon(), zIndexOffset: 2000 })
        .addTo(map)
        .bindPopup('<p style="font-family:DM Sans;font-size:13px;font-weight:700;margin:0;padding:4px 2px;">📍 You are here</p>')
      userMarkerRef.current = m
      map.flyTo([userPosition.lat, userPosition.lng], 14, { animate: true, duration: 1.1 })
    }
  }, [userPosition])

  return <div ref={divRef} className="flex-1 h-full" style={{ zIndex: 0 }} />
}

// /**
//  * HawkerMap.jsx
//  *
//  * Vanilla Leaflet (not react-leaflet) because react-leaflet adds an extra
//  * abstraction layer that makes markercluster harder to integrate cleanly.
//  * We manage the Leaflet map instance via refs and useEffect.
//  *
//  * Three layers:
//  *  1. OSM tile layer          — the map background
//  *  2. MarkerClusterGroup      — groups nearby markers automatically
//  *  3. User position marker    — pulse pin shown in "Near Me" mode
//  */

// import { useEffect, useRef } from 'react'
// import L from 'leaflet'
// import 'leaflet.markercluster'
// import { REGION_COLORS } from '../../utils/regionMapper'

// const SG_CENTER = [1.3521, 103.8198]
// const DEFAULT_ZOOM = 12

// // ── Icon factories ────────────────────────────────────────────────────────────

// /**
//  * Creates a custom SVG teardrop pin icon.
//  * @param {string}  color       — fill colour
//  * @param {boolean} isSelected  — larger + different colour when selected
//  */
// function pinIcon(color, isSelected = false) {
//   const size = isSelected ? 38 : 30
//   const innerR = isSelected ? 5.5 : 4.5

//   const svg = `
//     <svg
//       width="${size}" height="${size + 8}"
//       viewBox="0 0 30 38"
//       xmlns="http://www.w3.org/2000/svg"
//       class="hawker-pin${isSelected ? ' is-selected' : ''}"
//     >
//       <defs>
//         <filter id="ps" x="-40%" y="-20%" width="180%" height="180%">
//           <feDropShadow dx="0" dy="3" stdDeviation="2.5"
//             flood-color="${color}" flood-opacity="0.45"/>
//         </filter>
//       </defs>
//       <!-- Pin body -->
//       <path
//         d="M15 1C9.477 1 5 5.477 5 11c0 8 10 20 10 20S25 19 25 11C25 5.477 20.523 1 15 1z"
//         fill="${color}"
//         filter="url(#ps)"
//       />
//       <!-- Inner dot -->
//       <circle cx="15" cy="11" r="${innerR}" fill="white" opacity="0.92"/>
//     </svg>
//   `

//   return L.divIcon({
//     html: svg,
//     className: '',
//     iconSize:   [size, size + 8],
//     iconAnchor: [size / 2, size + 8],   // anchor at the bottom point
//     popupAnchor:[0, -(size + 8)],
//   })
// }

// /** "You are here" animated pulse pin */
// function userIcon() {
//   return L.divIcon({
//     html: `
//       <svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
//         <circle cx="14" cy="14" r="7" fill="#E67E22" stroke="white" stroke-width="2.5"/>
//         <circle cx="14" cy="14" r="12" fill="none" stroke="#E67E22" stroke-width="1.5" opacity="0.5">
//           <animate attributeName="r"       values="7;14"  dur="1.6s" repeatCount="indefinite"/>
//           <animate attributeName="opacity" values="0.5;0" dur="1.6s" repeatCount="indefinite"/>
//         </circle>
//       </svg>`,
//     className:  '',
//     iconSize:   [28, 28],
//     iconAnchor: [14, 14],
//     popupAnchor:[0, -18],
//   })
// }

// // ── Popup HTML builder ────────────────────────────────────────────────────────

// function buildPopup(h, color) {
//   return `
//     <div style="min-width:220px;font-family:'DM Sans',sans-serif;">
//       <!-- Coloured header -->
//       <div style="background:${color};padding:11px 14px;">
//         <p style="margin:0;color:#fff;font-size:13px;font-weight:700;line-height:1.35;">
//           ${h.name}
//         </p>
//       </div>
//       <!-- Body -->
//       <div style="padding:11px 14px;display:flex;flex-direction:column;gap:6px;">
//         <div style="display:flex;gap:7px;align-items:flex-start;">
//           <span style="color:${color};margin-top:1px;flex-shrink:0;font-size:13px;">📍</span>
//           <p style="margin:0;color:#5a4a30;font-size:12px;line-height:1.4;">${h.address}</p>
//         </div>
//         ${h.postal ? `
//           <div style="display:flex;gap:7px;align-items:center;">
//             <span style="color:${color};font-size:12px;">✉</span>
//             <p style="margin:0;color:#8B7355;font-size:12px;">Singapore ${h.postal}</p>
//           </div>` : ''}
//         ${h.distanceKm !== undefined ? `
//           <div style="display:flex;gap:7px;align-items:center;margin-top:2px;">
//             <span style="font-size:12px;">🛵</span>
//             <p style="margin:0;color:#E67E22;font-size:12px;font-weight:700;">
//               ${h.distanceKm < 1
//                 ? Math.round(h.distanceKm * 1000) + ' m away'
//                 : h.distanceKm.toFixed(1) + ' km away'}
//             </p>
//           </div>` : ''}
//         <div style="margin-top:4px;">
//           <span style="
//             background:${color}22;color:${color};
//             font-size:10px;font-weight:700;
//             padding:2px 9px;border-radius:20px;
//           ">${h.region}</span>
//         </div>
//       </div>
//     </div>
//   `
// }

// // ── Component ─────────────────────────────────────────────────────────────────

// export default function HawkerMap({
//   hawkers,
//   displayList,
//   selectedHawker,
//   onSelectHawker,
//   userPosition,
// }) {
//   const divRef         = useRef(null)    // DOM node for the map
//   const mapRef         = useRef(null)    // Leaflet map instance
//   const clusterRef     = useRef(null)    // MarkerClusterGroup
//   const markersRef     = useRef({})      // id → Leaflet marker
//   const userMarkerRef  = useRef(null)
//   const initRef        = useRef(false)

//   // ── Init map once ─────────────────────────────────────────────────────────
//   useEffect(() => {
//     if (initRef.current || !divRef.current) return
//     initRef.current = true

//     const map = L.map(divRef.current, {
//       center: SG_CENTER,
//       zoom:   DEFAULT_ZOOM,
//       zoomControl: false,
//     })

//     // OSM tiles — free, no API key needed
//     L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//       attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
//       maxZoom: 19,
//     }).addTo(map)

//     // Zoom control bottom-left (avoids overlap with sidebar header)
//     L.control.zoom({ position: 'bottomleft' }).addTo(map)

//     mapRef.current = map

//     return () => {
//       map.remove()
//       mapRef.current   = null
//       initRef.current  = false
//     }
//   }, [])

//   // ── Build marker layer when hawkers load ──────────────────────────────────
//   useEffect(() => {
//     const map = mapRef.current
//     if (!map || !hawkers.length) return

//     // Remove existing cluster
//     if (clusterRef.current) map.removeLayer(clusterRef.current)

//     // Create MarkerClusterGroup
//     const cluster = L.markerClusterGroup({
//       showCoverageOnHover: false,
//       maxClusterRadius:    55,
//       spiderfyOnMaxZoom:   true,
//       iconCreateFunction:  (group) => {
//         const n = group.getChildCount()
//         const size = n < 10 ? 36 : n < 100 ? 42 : 50
//         return L.divIcon({
//           html: `<div style="
//             width:${size}px;height:${size}px;
//             background:#C0392B;border:2.5px solid white;
//             border-radius:50%;display:flex;align-items:center;justify-content:center;
//             color:white;font-family:'DM Sans',sans-serif;font-weight:700;font-size:13px;
//             box-shadow:0 3px 10px rgba(192,57,43,.45);
//           ">${n}</div>`,
//           className: '',
//           iconSize:   [size, size],
//           iconAnchor: [size / 2, size / 2],
//         })
//       },
//     })

//     const newMarkers = {}

//     hawkers.forEach(h => {
//       if (!h.lat || !h.lng) return

//       const color  = REGION_COLORS[h.region] ?? '#C0392B'
//       const marker = L.marker([h.lat, h.lng], { icon: pinIcon(color) })

//       marker.bindPopup(buildPopup(h, color), {
//         maxWidth: 280,
//         autoPanPadding: [30, 60],
//       })

//       marker.on('click', () => onSelectHawker(h))
//       cluster.addLayer(marker)
//       newMarkers[h.id] = marker
//     })

//     map.addLayer(cluster)
//     clusterRef.current  = cluster
//     markersRef.current  = newMarkers
//   }, [hawkers])

//   // ── Sync selected marker ──────────────────────────────────────────────────
//   useEffect(() => {
//     const map = mapRef.current
//     if (!map) return

//     // Reset all icons to their region colour
//     Object.entries(markersRef.current).forEach(([id, marker]) => {
//       const h = hawkers.find(x => x.id === Number(id))
//       if (!h) return
//       const color = REGION_COLORS[h.region] ?? '#C0392B'
//       marker.setIcon(pinIcon(color, selectedHawker?.id === h.id))
//     })

//     if (selectedHawker) {
//       const marker = markersRef.current[selectedHawker.id]
//       if (marker) {
//         map.flyTo([selectedHawker.lat, selectedHawker.lng], 17, {
//           animate: true, duration: 0.9,
//         })
//         setTimeout(() => marker.openPopup(), 600)
//       }
//     }
//   }, [selectedHawker])

//   // ── Grey-out markers not in displayList ───────────────────────────────────
//   useEffect(() => {
//     const visibleIds = new Set(displayList.map(h => h.id))

//     Object.entries(markersRef.current).forEach(([id, marker]) => {
//       const el = marker.getElement?.()
//       if (el) el.style.opacity = visibleIds.has(Number(id)) ? '1' : '0.18'
//     })
//   }, [displayList])

//   // ── User location pin ─────────────────────────────────────────────────────
//   useEffect(() => {
//     const map = mapRef.current
//     if (!map) return

//     if (userMarkerRef.current) {
//       map.removeLayer(userMarkerRef.current)
//       userMarkerRef.current = null
//     }

//     if (userPosition) {
//       const m = L.marker([userPosition.lat, userPosition.lng], {
//         icon: userIcon(),
//         zIndexOffset: 2000,
//       })
//         .addTo(map)
//         .bindPopup(
//           '<p style="font-family:DM Sans;font-size:13px;font-weight:700;margin:0;padding:4px 2px;">📍 You are here</p>',
//         )

//       userMarkerRef.current = m
//       map.flyTo([userPosition.lat, userPosition.lng], 14, {
//         animate: true, duration: 1.1,
//       })
//     }
//   }, [userPosition])

//   return (
//     <div
//       ref={divRef}
//       className="flex-1 h-full"
//       style={{ zIndex: 0 }}
//     />
//   )
// }
