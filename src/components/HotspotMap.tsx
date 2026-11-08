'use client'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import type { HottestPlace } from '../lib/types'

type Props = { hotspot: HottestPlace['hotspot']; station: HottestPlace['station'] }

export default function HotspotMap({ hotspot, station }: Props) {
  const view = station
    ? { bounds: [[hotspot.lat, hotspot.lon], [station.lat, station.lon]] as [number, number][], boundsOptions: { padding: [40, 40] as [number, number] } }
    : { center: [hotspot.lat, hotspot.lon] as [number, number], zoom: 10 }

  return (
    <MapContainer className="h-96 w-96 max-w-full" scrollWheelZoom={false} {...view}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[hotspot.lat, hotspot.lon]} radius={10} pathOptions={{ color: '#C71784', fillOpacity: 0.6 }}>
        <Tooltip>Hot spot (RTMA): {hotspot.tempF.toFixed(1)}&deg;F</Tooltip>
      </CircleMarker>
      {station && (
        <CircleMarker center={[station.lat, station.lon]} radius={6} pathOptions={{ color: '#1d4ed8', fillOpacity: 0.6 }}>
          <Tooltip>
            {station.id}: {station.tempF.toFixed(1)}&deg;F
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
