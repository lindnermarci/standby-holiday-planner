import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default icon paths broken by Vite's asset bundling
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const MARKER_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6']

/** Creates a teardrop-shaped numbered pin as a Leaflet DivIcon */
function createPin(number, color) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        position: relative;
        width: 34px;
        height: 44px;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35));
      ">
        <svg viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg" width="34" height="44">
          <path d="M17 0C8.163 0 1 7.163 1 16c0 10.5 16 28 16 28S33 26.5 33 16C33 7.163 25.837 0 17 0z"
            fill="${color}" stroke="white" stroke-width="2"/>
          <text x="17" y="20" font-family="system-ui,sans-serif" font-size="13" font-weight="bold"
            fill="white" text-anchor="middle" dominant-baseline="middle">${number}</text>
        </svg>
      </div>`,
    iconSize: [34, 44],
    iconAnchor: [17, 44],
    popupAnchor: [0, -46],
  })
}

/** Fits the map to all activity bounds whenever activities change */
function BoundsUpdater({ activities }) {
  const map = useMap()
  useEffect(() => {
    const valid = activities.filter((a) => a.coords)
    if (valid.length === 0) return
    const bounds = L.latLngBounds(valid.map((a) => [a.coords.lat, a.coords.lng]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
  }, [activities, map])
  return null
}

/** Smoothly flies the map to a target coordinate when focusedId changes */
function FlyTo({ activities, focusedId }) {
  const map = useMap()
  useEffect(() => {
    if (!focusedId) return
    const activity = activities.find((a) => a.id === focusedId)
    if (activity?.coords) {
      map.flyTo([activity.coords.lat, activity.coords.lng], 14, { duration: 1.1 })
    }
  }, [focusedId, activities, map])
  return null
}

/**
 * ActivityMap — renders activity pins on a CartoDB Positron tile map.
 *
 * Props:
 *  activities  — array of { id, name, tagline, coords: {lat,lng} | null }
 *  focusedId   — id of the activity to fly to
 *  onSelect    — (id) => void, called when a marker popup is focused
 *  height      — CSS height string, default '100%'
 */
export default function ActivityMap({ activities = [], focusedId = null, onSelect, height = '100%' }) {
  const defaultCenter = [48.8566, 2.3522] // Paris fallback
  const defaultZoom = 5

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ height, width: '100%' }}
      className="rounded-xl z-0"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      <BoundsUpdater activities={activities} />
      <FlyTo activities={activities} focusedId={focusedId} />

      {activities.map((activity, idx) => {
        if (!activity.coords) return null
        const color = MARKER_COLORS[idx % MARKER_COLORS.length]
        return (
          <Marker
            key={activity.id}
            position={[activity.coords.lat, activity.coords.lng]}
            icon={createPin(idx + 1, color)}
            eventHandlers={{ click: () => onSelect?.(activity.id) }}
          >
            <Popup>
              <div className="p-1 min-w-[160px]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-base">{activity.vibeEmoji || '📍'}</span>
                  <span className="font-bold text-slate-900 text-sm">{activity.name}</span>
                </div>
                <p className="text-xs text-slate-500">{activity.tagline}</p>
                {activity.duration && (
                  <p className="text-xs text-slate-400 mt-1">⏱ {activity.duration}</p>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
