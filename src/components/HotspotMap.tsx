'use client'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet'
import type { Extreme, Mode } from '../lib/types'

type Props = { mode: Mode; spot: Extreme['spot']; station: Extreme['station'] }

const SPOT_COLOR: Record<Mode, string> = { hot: '#C71784', cold: '#1d4ed8' }

export default function HotspotMap({ mode, spot, station }: Props) {
  const view = station
    ? {
        bounds: [
          [spot.lat, spot.lon],
          [station.lat, station.lon],
        ] as [number, number][],
        boundsOptions: { padding: [40, 40] as [number, number] },
      }
    : { center: [spot.lat, spot.lon] as [number, number], zoom: 10 }

  return (
    <MapContainer className="h-96 w-96 max-w-full" scrollWheelZoom={false} {...view}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[spot.lat, spot.lon]} radius={10} pathOptions={{ color: SPOT_COLOR[mode], fillOpacity: 0.6 }}>
        <Tooltip>
          {mode === 'hot' ? 'Hot' : 'Cold'} spot (RTMA): {spot.tempF.toFixed(1)}&deg;F
        </Tooltip>
      </CircleMarker>
      {station && (
        <CircleMarker center={[station.lat, station.lon]} radius={6} pathOptions={{ color: '#0f172a', fillOpacity: 0.6 }}>
          <Tooltip>
            {station.id}: {station.tempF.toFixed(1)}&deg;F
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  )
}
