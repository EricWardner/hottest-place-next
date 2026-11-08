'use client'
import { HottestPlace } from '../lib/hottest-schema'

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export default function HottestPlaceInfo({ data }: { data: HottestPlace }) {
  const { hotspot, place, station, analysisMax } = data
  const where = place
    ? place.distanceMi < 1.5
      ? `in ${place.city}, ${place.state}`
      : `${Math.round(place.distanceMi)} mi ${place.direction} of ${place.city}, ${place.state}`
    : `at ${hotspot.lat.toFixed(2)}, ${hotspot.lon.toFixed(2)}`
  const unbackedPeak = station && analysisMax.tempF >= hotspot.tempF + 0.5

  return (
    <div className="grid gap-4">
      <p className="text-fluid-1">
        It&apos;s about {hotspot.tempF.toFixed(1)}&deg;F {where}!
      </p>
      {station ? (
        <>
          <p className="text-xs">
            The hottest 2.5 km grid cell in the {hotspot.source} analysis ({time(hotspot.validTime)}) that a nearby
            thermometer backs up: {station.id} ({station.provider}) read {station.tempF.toFixed(1)}&deg;F at{' '}
            {time(station.obsTime)}, {Math.round(station.distanceMi)} mi away.
          </p>
          {unbackedPeak && (
            <p className="text-xs">
              The analysis alone peaks at {analysisMax.tempF.toFixed(1)}&deg;F ({analysisMax.lat.toFixed(2)},{' '}
              {analysisMax.lon.toFixed(2)}), but no thermometer near there confirms it.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs">
          The hottest 2.5 km grid cell in the {hotspot.source} analysis ({time(hotspot.validTime)}). No thermometer
          could confirm it right now, so treat it as an estimate.
        </p>
      )}
    </div>
  )
}
