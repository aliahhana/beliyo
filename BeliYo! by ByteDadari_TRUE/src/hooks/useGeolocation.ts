import { useState, useEffect, useRef } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
  accuracy: number | null
  timestamp: number | null
}

export const useGeolocation = (enableRealTime: boolean = false) => {
  const [location, setLocation] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: false,
    accuracy: null,
    timestamp: null
  })

  const watchIdRef = useRef<number | null>(null)

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        loading: false
      }))
      return
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          error: null,
          loading: false
        })
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
        }
        setLocation(prev => ({
          ...prev,
          error: errorMessage,
          loading: false
        }))
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute
      }
    )
  }

  const startRealTimeTracking = () => {
    if (!navigator.geolocation) {
      setLocation(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser'
      }))
      return
    }

    setLocation(prev => ({ ...prev, loading: true, error: null }))

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
          error: null,
          loading: false
        })
      },
      (error) => {
        let errorMessage = 'Unable to track location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location tracking timed out'
            break
        }
        setLocation(prev => ({
          ...prev,
          error: errorMessage,
          loading: false
        }))
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000 // 30 seconds
      }
    )
  }

  const stopRealTimeTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  // Auto-start real-time tracking if enabled
  useEffect(() => {
    if (enableRealTime) {
      startRealTimeTracking()
    }

    return () => {
      stopRealTimeTracking()
    }
  }, [enableRealTime])

  return {
    ...location,
    getCurrentLocation,
    startRealTimeTracking,
    stopRealTimeTracking,
    isTracking: watchIdRef.current !== null
  }
}
