const EARTH_RADIUS_KM = 6371

function toRad(deg) {
  return deg * (Math.PI / 180)
}

export function distanceKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

export function closestN(hawkers, pos, n = 5) {
  return hawkers
    .filter(h => h.lat && h.lng)
    .map(h => ({
      ...h,
      distanceKm: distanceKm(pos.lat, pos.lng, h.lat, h.lng),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, n)
}