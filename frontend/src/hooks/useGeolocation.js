import { useState, useCallback } from 'react'

export function useGeolocation() {
  const [position,   setPosition]   = useState(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError,   setGeoError]   = useState(null)

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Your browser does not support geolocation.')
      return
    }
    setGeoLoading(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoLoading(false)
      },
      err => {
        setGeoError(
          err.code === 1
            ? 'Location access denied. Please allow location in your browser settings.'
            : 'Unable to get your location. Please try again.',
        )
        setGeoLoading(false)
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: false },
    )
  }, [])

  function clearPosition() {
    setPosition(null)
    setGeoError(null)
  }

  return { position, geoLoading, geoError, requestLocation, clearPosition }
}