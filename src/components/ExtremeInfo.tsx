import type { RegionName } from '../lib/rtma/grids'
import { SIGN, type Extreme, type Extremes, type Mode } from '../lib/types'
import { Age } from './Freshness'
import LocalTime from './LocalTime'

const WORDS: Record<Mode, { est: string; peak: string }> = {
  hot: { est: 'hottest', peak: 'peaks' },
  cold: { est: 'coldest', peak: 'bottoms out' },
}
const REGION_NAMES: Record<RegionName, string> = { conus: 'the lower 48', hawaii: 'Hawaii' }

type Props = { mode: Mode; extreme: Extreme; unavailable: Extremes['unavailable'] }

export default function ExtremeInfo({ mode, extreme, unavailable }: Props) {
  const { spot, place, station, analysisExtreme } = extreme
  const { est, peak } = WORDS[mode]
  const where = place
    ? place.distanceMi < 1.5
      ? `in ${place.city}, ${place.state}`
      : `${Math.round(place.distanceMi)} mi ${place.direction} of ${place.city}, ${place.state}`
    : `at ${spot.lat.toFixed(2)}, ${spot.lon.toFixed(2)}`
  const unbackedExtreme = station && SIGN[mode] * (analysisExtreme.tempF - spot.tempF) >= 0.5
  const asOf = (
    <>
      <LocalTime iso={spot.validTime} />
      <Age iso={spot.validTime} />
    </>
  )

  return (
    <div className="grid gap-4">
      <p className="text-fluid-1">
        It&apos;s about {spot.tempF.toFixed(1)}&deg;F {where}!
      </p>
      {station ? (
        <>
          <p className="text-xs">
            The {est} 2.5 km grid cell in the {spot.source} analysis as of {asOf} that a nearby thermometer backs
            up: {station.id} ({station.provider}) read {station.tempF.toFixed(1)}&deg;F at{' '}
            <LocalTime iso={station.obsTime} />, {Math.round(station.distanceMi)} mi away.
          </p>
          {unbackedExtreme && (
            <p className="text-xs">
              The analysis alone {peak} at {analysisExtreme.tempF.toFixed(1)}&deg;F ({analysisExtreme.lat.toFixed(2)},{' '}
              {analysisExtreme.lon.toFixed(2)}), but no thermometer near there confirms it.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs">
          The {est} 2.5 km grid cell in the {spot.source} analysis as of {asOf}. No thermometer could confirm it
          right now, so treat it as an estimate.
        </p>
      )}
      {unavailable.length > 0 && (
        <p className="text-xs">
          Data for {unavailable.map((r) => REGION_NAMES[r]).join(' and ')} isn&apos;t available right now, so it&apos;s
          not included.
        </p>
      )}
      {mode === 'cold' && <p className="text-xs">Not counting Alaska, which would win almost every time.</p>}
    </div>
  )
}
