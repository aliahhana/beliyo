import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { MapPin, Search, Navigation, Loader, CheckCircle, AlertCircle, X } from 'lucide-react'
import { useGeolocation } from '../hooks/useGeolocation'
import 'leaflet/dist/leaflet.css'

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker for selected location
const selectedLocationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#B91C1C" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#B91C1C"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

interface LocationData {
  address: string
  coordinates: [number, number]
  verified: boolean
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void
  initialLocation?: string
  isOpen: boolean
  onClose: () => void
}

interface MapClickHandlerProps {
  onLocationClick: (lat: number, lng: number) => void
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({ onLocationClick }) => {
  useMapEvents({
    click: (e) => {
      onLocationClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

const MapUpdater: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom)
  }, [map, center, zoom])
  
  return null
}

const LocationPicker: React.FC<LocationPickerProps> = ({ 
  onLocationSelect, 
  initialLocation, 
  isOpen, 
  onClose 
}) => {
  const [searchQuery, setSearchQuery] = useState(initialLocation || '')
  const [selectedCoords, setSelectedCoords] = useState<[number, number] | null>(null)
  const [verifiedAddress, setVerifiedAddress] = useState('')
  const [mapCenter, setMapCenter] = useState<[number, number]>([37.5665, 126.9780]) // Seoul default
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showResults, setShowResults] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle')
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  const { 
    latitude, 
    longitude, 
    loading: gpsLoading, 
    error: gpsError,
    getCurrentLocation 
  } = useGeolocation()

  // Update map center when GPS location is available
  useEffect(() => {
    if (latitude && longitude) {
      setMapCenter([latitude, longitude])
    }
  }, [latitude, longitude])

  // Search for addresses with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.length > 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchAddresses(searchQuery)
      }, 500)
    } else {
      setSearchResults([])
      setShowResults(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery])

  const searchAddresses = async (query: string) => {
    setLoading(true)
    try {
      // Use Nominatim for geocoding with focus on Korea
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=kr&addressdetails=1`
      )
      
      if (response.ok) {
        const results = await response.json()
        setSearchResults(results)
        setShowResults(results.length > 0)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const reverseGeocode = async (lat: number, lng: number) => {
    setValidationStatus('validating')
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
      )
      
      if (response.ok) {
        const result = await response.json()
        if (result && result.display_name) {
          setVerifiedAddress(result.display_name)
          setValidationStatus('valid')
          return result.display_name
        }
      }
      
      setValidationStatus('invalid')
      return null
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      setValidationStatus('invalid')
      return null
    }
  }

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedCoords([lat, lng])
    const address = await reverseGeocode(lat, lng)
    if (address) {
      setSearchQuery(address)
      setShowResults(false)
    }
  }

  const handleSearchResultClick = (result: any) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    setSelectedCoords([lat, lng])
    setVerifiedAddress(result.display_name)
    setSearchQuery(result.display_name)
    setMapCenter([lat, lng])
    setShowResults(false)
    setValidationStatus('valid')
  }

  const handleUseMyLocation = async () => {
    await getCurrentLocation()
    if (latitude && longitude) {
      setSelectedCoords([latitude, longitude])
      setMapCenter([latitude, longitude])
      const address = await reverseGeocode(latitude, longitude)
      if (address) {
        setSearchQuery(address)
      }
    }
  }

  const handleConfirmLocation = () => {
    if (selectedCoords && verifiedAddress && validationStatus === 'valid') {
      onLocationSelect({
        address: verifiedAddress,
        coordinates: selectedCoords,
        verified: true
      })
    }
    onClose()
  }

  const getValidationIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return <Loader className="w-4 h-4 animate-spin text-blue-500" />
      case 'valid':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'invalid':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Search className="w-4 h-4 text-gray-400" />
    }
  }

  const getValidationMessage = () => {
    switch (validationStatus) {
      case 'validating':
        return 'Verifying address...'
      case 'valid':
        return 'Address verified ✓'
      case 'invalid':
        return 'Invalid address - please select a valid location'
      default:
        return 'Search for an address or click on the map'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Select Location</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for an address..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                {getValidationIcon()}
              </div>
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto z-10">
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => handleSearchResultClick(result)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm">{result.display_name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {result.type} • {result.lat}, {result.lon}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className={`text-sm p-3 rounded-lg ${
            validationStatus === 'valid' ? 'bg-green-50 text-green-700' :
            validationStatus === 'invalid' ? 'bg-red-50 text-red-700' :
            validationStatus === 'validating' ? 'bg-blue-50 text-blue-700' :
            'bg-gray-50 text-gray-600'
          }`}>
            {getValidationMessage()}
          </div>

          {/* GPS Location Button */}
          <button
            onClick={handleUseMyLocation}
            disabled={gpsLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {gpsLoading ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            {gpsLoading ? 'Getting Location...' : 'Use My Current Location'}
          </button>

          {gpsError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {gpsError}
            </div>
          )}

          {/* Interactive Map */}
          <div className="h-80 rounded-lg overflow-hidden border">
            <MapContainer
              center={mapCenter}
              zoom={15}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              <MapUpdater center={mapCenter} zoom={15} />
              <MapClickHandler onLocationClick={handleMapClick} />

              {selectedCoords && (
                <Marker position={selectedCoords} icon={selectedLocationIcon} />
              )}
            </MapContainer>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">How to select a location:</p>
            <ul className="space-y-1 text-xs">
              <li>• Search for an address in the search bar</li>
              <li>• Click anywhere on the map to select a location</li>
              <li>• Use "My Current Location" for GPS-based selection</li>
              <li>• Only verified real addresses will be accepted</li>
            </ul>
          </div>

          {/* Selected Location Info */}
          {selectedCoords && verifiedAddress && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-800">Selected Location:</p>
                  <p className="text-sm text-green-700 mt-1">{verifiedAddress}</p>
                  <p className="text-xs text-green-600 mt-1">
                    📍 {selectedCoords[0].toFixed(6)}, {selectedCoords[1].toFixed(6)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmLocation}
            disabled={!selectedCoords || !verifiedAddress || validationStatus !== 'valid'}
            className="px-6 py-2 bg-[#B91C1C] text-white rounded-lg hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  )
}

export default LocationPicker
