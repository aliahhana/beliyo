import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4285f4" width="24" height="24">
      <circle cx="12" cy="12" r="8" fill="#4285f4" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="12" r="3" fill="white"/>
    </svg>
  `),
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
})

const pickupIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ea4335" width="32" height="32">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#ea4335"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

interface MapUpdaterProps {
  center: [number, number]
  zoom: number
  userLocation?: [number, number] | null
  pickupLocation?: [number, number] | null
}

const MapUpdater: React.FC<MapUpdaterProps> = ({ center, zoom, userLocation, pickupLocation }) => {
  const map = useMap()

  useEffect(() => {
    if (userLocation && pickupLocation) {
      // Fit bounds to show both markers
      const bounds = L.latLngBounds([userLocation, pickupLocation])
      map.fitBounds(bounds, { padding: [20, 20] })
    } else {
      map.setView(center, zoom)
    }
  }, [map, center, zoom, userLocation, pickupLocation])

  return null
}

interface InteractiveMapProps {
  pickupLocation: [number, number]
  userLocation?: [number, number] | null
  productName: string
  address: string
  isLiveTracking?: boolean
  accuracy?: number | null
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickupLocation,
  userLocation,
  productName,
  address,
  isLiveTracking = false,
  accuracy
}) => {
  const [mapCenter, setMapCenter] = useState<[number, number]>(pickupLocation)
  const [mapZoom, setMapZoom] = useState(14)

  useEffect(() => {
    if (userLocation && pickupLocation) {
      // Calculate center point between user and pickup
      const centerLat = (userLocation[0] + pickupLocation[0]) / 2
      const centerLng = (userLocation[1] + pickupLocation[1]) / 2
      setMapCenter([centerLat, centerLng])
      
      // Calculate appropriate zoom based on distance
      const distance = calculateDistance(userLocation[0], userLocation[1], pickupLocation[0], pickupLocation[1])
      const zoom = distance > 50 ? 8 : distance > 10 ? 10 : distance > 5 ? 12 : 14
      setMapZoom(zoom)
    } else {
      setMapCenter(pickupLocation)
      setMapZoom(14)
    }
  }, [userLocation, pickupLocation])

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

  const getAccuracyText = (accuracy: number | null): string => {
    if (!accuracy) return ''
    return accuracy < 10 ? 'High accuracy' : accuracy < 50 ? 'Medium accuracy' : 'Low accuracy'
  }

  return (
    <div className="relative h-64 rounded-lg overflow-hidden border">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapUpdater 
          center={mapCenter} 
          zoom={mapZoom}
          userLocation={userLocation}
          pickupLocation={pickupLocation}
        />

        {/* Pickup Location Marker */}
        <Marker position={pickupLocation} icon={pickupIcon}>
          <Popup>
            <div className="text-center">
              <h3 className="font-bold text-sm">{productName}</h3>
              <p className="text-xs text-gray-600 mt-1">{address}</p>
              <p className="text-xs text-red-600 mt-1">📍 Pickup Point</p>
            </div>
          </Popup>
        </Marker>

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup>
              <div className="text-center">
                <h3 className="font-bold text-sm">Your Location</h3>
                {isLiveTracking && (
                  <p className="text-xs text-blue-600 mt-1">🔴 Live Tracking</p>
                )}
                {accuracy && (
                  <p className="text-xs text-gray-600 mt-1">
                    {getAccuracyText(accuracy)} (±{Math.round(accuracy)}m)
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Live Tracking Indicator */}
      {isLiveTracking && userLocation && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          LIVE
        </div>
      )}

      {/* Coordinates Display */}
      <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs text-gray-600 shadow">
        {pickupLocation[0].toFixed(4)}, {pickupLocation[1].toFixed(4)}
      </div>

      {/* Map Legend */}
      {userLocation && (
        <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded text-xs shadow space-y-1">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Your Location</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Pickup Point</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default InteractiveMap
