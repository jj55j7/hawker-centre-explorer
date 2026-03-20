import { useState, useEffect } from 'react'
import { getRegion } from '../utils/regionMapper'

// Data source priority:
//  1. Local GeoJSON file  → fastest, no rate limits, works offline
//  2. data.gov.sg poll-download API → fetches a fresh signed URL, then downloads
const LOCAL_GEOJSON_URL = '/hawkers.geojson'
const POLL_URL =
  'https://api-open.data.gov.sg/v1/public/api/datasets/d_4a086da0a5553be1d89383cd90d07ecd/poll-download'

/**
 * Normalises a single GeoJSON feature into our clean internal shape.
 * GeoJSON coordinates are [longitude, latitude] — note the order!
 */
function normaliseFeature(feature, index) {
  const coords = feature.geometry?.coordinates
  const props  = feature.properties ?? {}

  if (!coords || coords.length < 2) return null

  const lng = parseFloat(coords[0])  // GeoJSON is [lng, lat]
  const lat  = parseFloat(coords[1])

  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null

  const postal = String(props.ADDRESSPOSTALCODE ?? '').replace(/\D/g, '')
  const block  = props.ADDRESSBLOCKHOUSENUMBER ?? ''
  const street = props.ADDRESSSTREETNAME ?? ''
  const address = props.ADDRESS_MYENV
    ?? (block && street ? `${block} ${street}, Singapore ${postal}` : 'Address unavailable')

  return {
    id:          props.OBJECTID ?? index,
    name:        props.NAME ?? props.ADDRESSBUILDINGNAME ?? 'Unnamed Hawker Centre',
    address,
    postal:      postal || '',
    lat,
    lng,
    region:      getRegion(postal),
    status:      props.STATUS ?? 'Existing',
    numStalls:   props.NUMBER_OF_COOKED_FOOD_STALLS ?? null,
    photoUrl:    props.PHOTOURL ?? null,
    description: props.DESCRIPTION ?? '',
  }
}

export function useHawkerData() {
  const [hawkers, setHawkers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        let features = null

        // 1. Try local GeoJSON file first
        try {
          const res = await fetch(LOCAL_GEOJSON_URL)
          if (res.ok) {
            const geojson = await res.json()
            if (geojson.features?.length > 0) {
              features = geojson.features
            }
          }
        } catch { /* local file not present */ }

        // 2. Fetch fresh from data.gov.sg
        if (!features) {
          const pollRes = await fetch(POLL_URL)
          if (!pollRes.ok) throw new Error(`Poll API error: ${pollRes.status}`)
          const pollJson = await pollRes.json()
          if (pollJson.code !== 0) throw new Error(pollJson.errorMsg ?? 'Failed to get download URL')
          const downloadUrl = pollJson.data?.url
          if (!downloadUrl) throw new Error('No download URL in response')
          const dataRes = await fetch(downloadUrl)
          if (!dataRes.ok) throw new Error(`Download error: ${dataRes.status}`)
          const geojson = await dataRes.json()
          features = geojson.features ?? []
        }

        const clean = features.map(normaliseFeature).filter(Boolean)
        if (!cancelled) setHawkers(clean)

      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load hawker data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  return { hawkers, loading, error }
}

// import { useState, useEffect } from 'react'
// import { getRegion } from '../utils/regionMapper'

// const BACKEND_URL = '/api/hawkers'
// const GOVSG_URL =
//   'https://data.gov.sg/api/action/datastore_search' +
//   '?resource_id=d_4a086da0a5553be1d89383cd90d07ecd&limit=1000'

// function normalise(raw) {
//   const lat = parseFloat(raw.latitude_hc ?? raw.lat)
//   const lng = parseFloat(raw.longitude_hc ?? raw.lng)
//   if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null

//   const postal = (raw.addresspostalcode ?? raw.postal ?? '').replace(/\D/g, '')

//   return {
//     id:      raw._id ?? raw.id,
//     name:    raw.name ?? 'Unnamed Hawker Centre',
//     address: raw.addressfulladdress ?? raw.address ?? 'Address unavailable',
//     postal:  postal || '',
//     lat,
//     lng,
//     region:  raw.region ?? getRegion(postal),
//     photoUrl: raw.photourl ?? null,
//     description: raw.description_myenv ?? '',
//   }
// }

// export function useHawkerData() {
//   const [hawkers, setHawkers] = useState([])
//   const [loading, setLoading] = useState(true)
//   const [error,   setError]   = useState(null)

//   useEffect(() => {
//     let cancelled = false

//     async function load() {
//       setLoading(true)
//       setError(null)
//       try {
//         let records = null

//         // Try backend first
//         try {
//           const res = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(4000) })
//           if (res.ok) records = await res.json()
//         } catch {
//           // backend not running, fall through
//         }

//         // Fallback to data.gov.sg
//         if (!records) {
//           const res = await fetch(GOVSG_URL)
//           if (!res.ok) throw new Error(`data.gov.sg error: ${res.status}`)
//           const json = await res.json()
//           if (!json.success) throw new Error('data.gov.sg returned error')
//           records = json.result?.records ?? []
//         }

//         const clean = records.map(normalise).filter(Boolean)
//         if (!cancelled) setHawkers(clean)
//       } catch (err) {
//         if (!cancelled) setError(err.message || 'Failed to load hawker data.')
//       } finally {
//         if (!cancelled) setLoading(false)
//       }
//     }

//     load()
//     return () => { cancelled = true }
//   }, [])

//   return { hawkers, loading, error }
// }