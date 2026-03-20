import { useState, useEffect, useMemo, useRef } from 'react'
import Fuse from 'fuse.js'

const FUSE_OPTIONS = {
  keys: ['name', 'address', 'postal'],
  threshold: 0.35,
  minMatchCharLength: 2,
}

const DEBOUNCE_MS = 300

export function useFilter(hawkers) {
  const [rawQuery,       setRawQuery]       = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [selectedRegion, setSelectedRegion] = useState('All')
  const timerRef = useRef(null)

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(rawQuery), DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [rawQuery])

  const filtered = useMemo(() => {
    let results = hawkers

    if (selectedRegion !== 'All') {
      results = results.filter(h => h.region === selectedRegion)
    }

    const q = debouncedQuery.trim()
    if (q.length >= 2) {
      const subFuse = new Fuse(results, FUSE_OPTIONS)
      results = subFuse.search(q).map(r => r.item)
    }

    return results
  }, [hawkers, debouncedQuery, selectedRegion])

  function clearFilters() {
    setRawQuery('')
    setDebouncedQuery('')
    setSelectedRegion('All')
  }

  return {
    searchQuery: rawQuery,
    setSearchQuery: setRawQuery,
    selectedRegion,
    setSelectedRegion,
    filtered,
    clearFilters,
    hasActiveFilter: rawQuery !== '' || selectedRegion !== 'All',
    isSearching: rawQuery !== debouncedQuery,
  }
}