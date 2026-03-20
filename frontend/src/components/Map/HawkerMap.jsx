import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet.markercluster'
import { REGION_COLORS } from '../../utils/regionMapper'

const SG_CENTER    = [1.3521, 103.8198]
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

function buildPopup(h, color, isFav) {
  const safeName = h.name.replace(/'/g, "\\'")
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
      ${h.numStalls ? `<div style="display:flex;gap:7px;align-items:center;">
        <span style="color:${color};">🍽</span>
        <p style="margin:0;color:#8B7355;font-size:12px;">${h.numStalls} cooked food stalls</p>
      </div>` : ''}
      ${h.distanceKm !== undefined ? `<p style="margin:0;color:#E67E22;font-size:12px;font-weight:700;">
        🛵 ${h.distanceKm < 1 ? Math.round(h.distanceKm * 1000) + ' m away' : h.distanceKm.toFixed(1) + ' km away'}
      </p>` : ''}
      <div style="margin-top:2px;">
        <span style="background:${color}22;color:${color};font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;">${h.region}</span>
        ${h.status && h.status !== 'Existing' ? `<span style="background:#FFF3CD;color:#856404;font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;margin-left:4px;">${h.status}</span>` : ''}
      </div>
      <button
        id="fav-btn-${h.id}"
        onclick="window.toggleFav(${h.id}, '${safeName}')"
        style="margin-top:6px;background:${isFav ? '#FFF0F0' : 'none'};border:1px solid ${isFav ? '#C0392B' : '#E8DFC8'};border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:600;color:#C0392B;width:100%;font-family:'DM Sans',sans-serif;"
      >${isFav ? '♥ Saved to Favourites' : '♡ Save to Favourites'}</button>
    </div>
  </div>`
}

export default function HawkerMap({
  hawkers, displayList, selectedHawker, onSelectHawker,
  userPosition, favourites, onToggleFavourite,
}) {
  const divRef        = useRef(null)
  const mapRef        = useRef(null)
  const clusterRef    = useRef(null)
  const markersRef    = useRef({})
  const userMarkerRef = useRef(null)
  const initRef       = useRef(false)

  // Expose toggleFav globally — Leaflet popup HTML can't access React state
  // directly, so we bridge through window. This is the standard pattern.
  useEffect(() => {
    window.toggleFav = (hawkerId, hawkerName) => {
      const hawker = hawkers.find(h => h.id === hawkerId) ?? { id: hawkerId, name: hawkerName }
      onToggleFavourite(hawker)
      // Update button immediately without waiting for React re-render
      const btn = document.getElementById(`fav-btn-${hawkerId}`)
      if (btn) {
        const nowFav = !favourites.has(hawkerId)
        btn.textContent  = nowFav ? '♥ Saved to Favourites' : '♡ Save to Favourites'
        btn.style.background  = nowFav ? '#FFF0F0' : 'none'
        btn.style.borderColor = nowFav ? '#C0392B' : '#E8DFC8'
      }
    }
    return () => { window.toggleFav = undefined }
  }, [hawkers, favourites, onToggleFavourite])

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
      showCoverageOnHover: false, maxClusterRadius: 55, spiderfyOnMaxZoom: true,
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
      const color  = REGION_COLORS[h.region] ?? '#C0392B'
      const isFav  = favourites?.has(h.id) ?? false
      const marker = L.marker([h.lat, h.lng], { icon: pinIcon(color) })
      marker.bindPopup(buildPopup(h, color, isFav), { maxWidth: 290, autoPanPadding: [30, 60] })
      marker.on('click', () => onSelectHawker(h))
      cluster.addLayer(marker)
      newMarkers[h.id] = marker
    })
    map.addLayer(cluster)
    clusterRef.current = cluster
    markersRef.current = newMarkers
  }, [hawkers])

  // Update popup hearts when favourites change
  useEffect(() => {
    if (!favourites) return
    Object.entries(markersRef.current).forEach(([id, marker]) => {
      const h = hawkers.find(x => x.id === Number(id))
      if (!h) return
      const color = REGION_COLORS[h.region] ?? '#C0392B'
      marker.setPopupContent(buildPopup(h, color, favourites.has(h.id)))
    })
  }, [favourites])

  // Sync selected marker icon + fly to
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

  // Dim markers outside current filter
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
