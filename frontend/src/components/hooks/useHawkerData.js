/**
 * Data fetching hook — three-source strategy:
 *
 * 1. Local GeoJSON  → /public/hawkers.geojson (bundled, instant load)
 * 2. FastAPI backend → GET /api/hawkers        (Python + Supabase)
 * 3. data.gov.sg API → GeoJSON poll-download   (live fallback)
 *
 * External APIs used:
 *  - https://api-open.data.gov.sg (Singapore Open Data)
 *  - Supabase REST API (via useFavourites hook)
 */

import { useState, useEffect } from 'react'
import { getRegion } from '../utils/regionMapper'

// ── Constants ────────────────────────────────────────────────────────────────

const BACKEND_URL = '/api/hawkers'

const GOVSG_URL =
  'https://data.gov.sg/api/action/datastore_search' +
  '?resource_id=d_4a086da0a5553be1d89383cd90d07ecd&limit=1000'

// ── Data normalisation ───────────────────────────────────────────────────────

/**
 * Normalises a raw data.gov.sg record into our clean internal shape.
 * We keep the same shape whether data comes from the backend or gov.sg.
 *
 * @param {Object} raw
 * @returns {Object|null}  null if lat/lng are invalid
 */
function normalise(raw) {
  const lat = parseFloat(raw.latitude_hc  ?? raw.lat)
  const lng = parseFloat(raw.longitude_hc ?? raw.lng)

  // Skip records with no valid coordinates
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null

  const postal = (raw.addresspostalcode ?? raw.postal ?? '').replace(/\D/g, '')

  return {
    id:      raw._id ?? raw.id,
    name:    raw.name ?? 'Unnamed Hawker Centre',
    address: raw.addressfulladdress ?? raw.address ?? 'Address unavailable',
    postal:  postal || '',
    lat,
    lng,
    region:  raw.region ?? getRegion(postal),
    // optional extras we display if present
    photoUrl:    raw.photourl   ?? null,
    description: raw.description_myenv ?? '',
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useHawkerData() {
  const [hawkers, setHawkers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        /* ── Try backend first ────────────────────────────────── */
        let records = null

        try {
          const res = await fetch(BACKEND_URL, { signal: AbortSignal.timeout(4000) })
          if (res.ok) {
            records = await res.json()          // backend returns clean array
          }
        } catch {
          // backend not running — fall through to gov.sg
        }

        /* ── Fallback: data.gov.sg ────────────────────────────── */
        if (!records) {
          const res = await fetch(GOVSG_URL)
          if (!res.ok) throw new Error(`data.gov.sg error: ${res.status}`)
          const json = await res.json()
          if (!json.success) throw new Error('data.gov.sg returned unsuccessful response')
          records = json.result?.records ?? []
        }

        const clean = records.map(normalise).filter(Boolean)

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
