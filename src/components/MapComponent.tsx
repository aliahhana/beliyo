import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Navigation, ExternalLink, Loader, Play, Pause, RefreshCw } from 'lucide-react'
import { useGeolocation } from '../hooks/useGeolocation'
import InteractiveMap from './InteractiveMap'

interface MapComponentProps {
  location: string
  productName: string
}

interface Coordinates {
  lat: number
  lng: number
}

const MapComponent: React.FC<MapComponentProps> = ({ location, productName }) => {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [mapLoading, setMapLoading] = useState(true)
  const [mapError, setMapError] = useState('')
  const [realTimeEnabled, setRealTimeEnabled] = useState(false)

  const { 
    latitude, 
    longitude, 
    accuracy,
    timestamp,
    error: gpsError, 
    loading: gpsLoading, 
    getCurrentLocation,
    startRealTimeTracking,
    stopRealTimeTracking,
    isTracking
  } = useGeolocation(realTimeEnabled)

  // Geocode the location to get coordinates
  useEffect(() => {
    if (location) {
      geocodeLocation(location)
    }
  }, [location])

  const geocodeLocation = async (address: string) => {
    setMapLoading(true)
    setMapError('')
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      )
      
      if (!response.ok) {
        throw new Error('Geocoding failed')
      }
      
      const data = await response.json()
      
      if (data && data.length > 0) {
        setCoordinates({
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon)
        })
      } else {
        setMapError('Location not found on map')
      }
    } catch (error) {
      console.error('Geocoding error:', error)
      setMapError('Failed to load map location')
    } finally {
      setMapLoading(false)
    }
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  const getDistance = (): string => {
    if (latitude && longitude && coordinates) {
      const distance = calculateDistance(latitude, longitude, coordinates.lat, coordinates.lng)
      return distance < 1 
        ? `${Math.round(distance * 1000)}m away`
        : `${distance.toFixed(1)}km away`
    }
    return ''
  }

  const getKakaoMapUrl = (): string => {
    if (coordinates) {
      return `https://map.kakao.com/link/map/${encodeURIComponent(productName)},${coordinates.lat},${coordinates.lng}`
    }
    return `https://map.kakao.com/link/search/${encodeURIComponent(location)}`
  }

  const getNaverMapUrl = (): string => {
    if (coordinates) {
      return `https://map.naver.com/v5/search/${encodeURIComponent(location)}/place/${coordinates.lat},${coordinates.lng}`
    }
    return `https://map.naver.com/v5/search/${encodeURIComponent(location)}`
  }

  const getGoogleMapsUrl = (): string => {
    if (coordinates) {
      return `https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`
    }
    return `https://maps.google.com/?q=${encodeURIComponent(location)}`
  }

  const toggleRealTimeTracking = () => {
    if (realTimeEnabled) {
      setRealTimeEnabled(false)
      stopRealTimeTracking()
    } else {
      setRealTimeEnabled(true)
      startRealTimeTracking()
    }
  }

  const formatTimestamp = (timestamp: number | null): string => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString()
  }

  const getAccuracyText = (accuracy: number | null): string => {
    if (!accuracy) return ''
    return accuracy < 10 ? 'High accuracy' : accuracy < 50 ? 'Medium accuracy' : 'Low accuracy'
  }

  return (
    <div className="border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#B91C1C]">Pickup Point</h2>
        <div className="flex gap-2">
          <button
            onClick={getCurrentLocation}
            disabled={gpsLoading}
            className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {gpsLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {gpsLoading ? 'Getting Location...' : 'Find My Location'}
          </button>
          
          <button
            onClick={toggleRealTimeTracking}
            disabled={gpsLoading}
            className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg transition-colors disabled:opacity-50 ${
              realTimeEnabled 
                ? 'bg-green-50 text-green-600 hover:bg-green-100' 
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {isTracking ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {realTimeEnabled ? 'Stop Tracking' : 'Live Tracking'}
          </button>
        </div>
      </div>

      {/* GPS Status */}
      {gpsError && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-3 py-2 rounded-lg mb-4 text-sm">
          {gpsError}
        </div>
      )}

      {latitude && longitude && coordinates && (
        <div className={`border px-3 py-2 rounded-lg mb-4 text-sm ${
          realTimeEnabled 
            ? 'bg-blue-50 border-blue-200 text-blue-700' 
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          <div className="flex items-center justify-between">
            <span>
              📍 {realTimeEnabled ? 'Live location tracking' : 'Your location detected'} • {getDistance()}
            </span>
            {realTimeEnabled && (
              <RefreshCw className="w-4 h-4 animate-spin" />
            )}
          </div>
          {accuracy && (
            <div className="text-xs mt-1 opacity-75">
              {getAccuracyText(accuracy)} • Updated: {formatTimestamp(timestamp)}
            </div>
          )}
        </div>
      )}

      {/* Interactive Map Display */}
      <div className="mb-4">
        {mapLoading ? (
          <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
              <p className="text-gray-500">Loading map...</p>
            </div>
          </div>
        ) : mapError ? (
          <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MapPin className="w-8 h-8 mx-auto mb-2" />
              <p>{mapError}</p>
            </div>
          </div>
        ) : coordinates ? (
          <InteractiveMap
            pickupLocation={[coordinates.lat, coordinates.lng]}
            userLocation={latitude && longitude ? [latitude, longitude] : null}
            productName={productName}
            address={location}
            isLiveTracking={realTimeEnabled}
            accuracy={accuracy}
          />
        ) : null}
      </div>

      {/* Location Info */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-500" />
          <p className="font-medium">
            Address: {location || 'Location not specified'}
          </p>
        </div>

        {/* Map Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <a 
            href={getKakaoMapUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium"
          >
            KakaoMap
            <ExternalLink className="w-3 h-3" />
          </a>
          
          <a 
            href={getNaverMapUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            NaverMap
            <ExternalLink className="w-3 h-3" />
          </a>
          
          <a 
            href={getGoogleMapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Google Maps
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* Additional Info */}
        {coordinates && (
          <div className="text-xs text-gray-500 mt-2 space-y-1">
            <p>📍 Pickup: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</p>
            {latitude && longitude && (
              <>
                <p>📱 Your location: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p>
                <p>📏 Distance: {getDistance()}</p>
                {realTimeEnabled && (
                  <p className="text-blue-600 font-medium">🔴 Live tracking active</p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MapComponent
