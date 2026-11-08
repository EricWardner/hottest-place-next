// Combines the three sources:
//  1. RTMA (CONUS + Hawaii) gives a 2.5 km temperature grid.
//  2. MADIS gives real thermometers. A station is trusted only if it agrees
//     with RTMA at its own grid cell, which drops sensors RTMA's QC rejected.
//  3. The hot spot is the hottest US land cell within SUPPORT_RADIUS_KM of a
//     trusted station that reads at least about as hot as the cell. Raw
//     RTMA maxima can sit in data voids or on coasts where the analysis reads
//     close to sea temperature; this keeps the answer tied to a measurement.
//  4. The NWS points API names the nearest place.
import type { HottestPlace } from './hottest-schema'
import { fetchMadisTemps, type Box, type MadisOb } from './madis'
import { nearestPlace } from './nws'
import type { RegionName } from './rtma/grids'
import { fetchLatestAnalysis, type RtmaAnalysis } from './rtma/rtma'

/** Max disagreement between a station and the analysis at its own grid cell. */
const AGREEMENT_K = 1.5
/** How far from a trusted station a hot spot may be. */
const SUPPORT_RADIUS_KM = 15
/** How much hotter than its backing station a hot spot cell may be. */
const SUPPORT_K = 1.0

const MADIS_BOXES: Record<RegionName, Box> = {
  conus: { south: 24, west: -125, north: 50, east: -66.5 },
  hawaii: { south: 18.5, west: -160.5, north: 22.5, east: -154.5 },
}
const MADIS_TIMEOUT_MS = 40_000

type Candidate = {
  analysis: RtmaAnalysis
  lat: number
  lon: number
  tempK: number
  station: MadisOb & { km: number; analysisK: number }
}

const toF = (k: number) => Math.round(((k - 273.15) * 9) / 5 * 10 + 320) / 10
const kmToMi = (km: number) => Math.round(km * 0.621371 * 10) / 10

export async function findHottestPlace(now = new Date()): Promise<HottestPlace> {
  const warnings: string[] = []
  const regions: RegionName[] = ['conus', 'hawaii']

  // RTMA and MADIS are independent; fetch everything at once.
  const [analyses, madis] = await Promise.all([
    Promise.allSettled(regions.map((r) => fetchLatestAnalysis(r, now))),
    Promise.allSettled(regions.map((r) => fetchMadisTemps(MADIS_BOXES[r], MADIS_TIMEOUT_MS))),
  ])

  const available: RtmaAnalysis[] = []
  let best: Candidate | null = null
  let stationsUsed = 0
  for (let k = 0; k < regions.length; k++) {
    const a = analyses[k]
    const m = madis[k]
    if (a.status === 'rejected') {
      warnings.push(`RTMA ${regions[k]}: ${errorMessage(a.reason)}`)
      continue
    }
    available.push(a.value)
    if (m.status === 'rejected') {
      warnings.push(`MADIS ${regions[k]}: ${errorMessage(m.reason)}`)
      continue
    }
    const result = hottestSupportedCell(a.value, m.value)
    stationsUsed += result.stationsUsed
    if (result.best && (!best || result.best.tempK > best.tempK)) best = result.best
  }
  if (available.length === 0) throw new Error(`No RTMA analysis available (${warnings.join('; ')})`)

  const rawMax = available.reduce((a, b) => (b.hottest.tempK > a.hottest.tempK ? b : a))
  const winner = best
  if (!winner) warnings.push('No thermometer could back up a hot spot; showing the raw RTMA maximum')
  const analysis = winner?.analysis ?? rawMax
  const spot = winner ?? rawMax.hottest

  let place: HottestPlace['place'] = null
  try {
    const p = await nearestPlace(spot.lat, spot.lon, 8_000)
    place = { city: p.city, state: p.state, distanceMi: kmToMi(p.distanceM / 1000), direction: compass(p.bearingDeg) }
  } catch (e) {
    warnings.push(`NWS: ${errorMessage(e)}`)
  }

  return {
    hotspot: {
      lat: round(spot.lat, 4),
      lon: round(spot.lon, 4),
      tempF: toF(spot.tempK),
      validTime: analysis.field.refTime.toISOString(),
      source: analysis.source,
    },
    place,
    station: winner
      ? {
          id: winner.station.id,
          provider: winner.station.provider,
          lat: winner.station.lat,
          lon: winner.station.lon,
          tempF: toF(winner.station.tempK),
          obsTime: winner.station.obsTime.toISOString(),
          distanceMi: kmToMi(winner.station.km),
          analysisTempF: toF(winner.station.analysisK),
        }
      : null,
    analysisMax: { lat: round(rawMax.hottest.lat, 4), lon: round(rawMax.hottest.lon, 4), tempF: toF(rawMax.hottest.tempK) },
    stationsUsed,
    warnings,
    generatedAt: now.toISOString(),
  }
}

/**
 * For every trusted station, find the hottest land cell within the support
 * radius that the station backs up; return the hottest of those.
 */
export function hottestSupportedCell(
  analysis: RtmaAnalysis,
  obs: MadisOb[],
): { best: Candidate | null; stationsUsed: number } {
  let best: Candidate | null = null
  let stationsUsed = 0

  for (const ob of obs) {
    const cell = analysis.cellAt(ob.lat, ob.lon)
    if (!cell) continue
    const [si, sj] = cell
    const analysisK = analysis.valueAt(si, sj)
    if (Math.abs(ob.tempK - analysisK) > AGREEMENT_K) continue

    // local grid spacing in km, from the projection
    const [la0, lo0] = analysis.toLatLon(si, sj)
    const [la1, lo1] = analysis.toLatLon(si + 1, sj)
    const cellKm = distanceKm(la0, lo0, la1, lo1)
    const r = Math.floor(SUPPORT_RADIUS_KM / cellKm)

    let stationCounted = false
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if ((di * di + dj * dj) * cellKm * cellKm > SUPPORT_RADIUS_KM * SUPPORT_RADIUS_KM) continue
        const i = si + di
        const j = sj + dj
        if (!analysis.isLand(i, j)) continue
        stationCounted = true
        const t = analysis.valueAt(i, j)
        if (t > ob.tempK + SUPPORT_K) continue
        // ties go to the hotter station
        if (best && (t < best.tempK || (t === best.tempK && ob.tempK <= best.station.tempK))) continue
        const [lat, lon] = analysis.toLatLon(i, j)
        best = { analysis, lat, lon, tempK: t, station: { ...ob, km: distanceKm(lat, lon, ob.lat, ob.lon), analysisK } }
      }
    }
    // only stations near US land count
    if (stationCounted) stationsUsed++
  }
  return { best, stationsUsed }
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * r) / 2) ** 2 +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

const POINTS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
const compass = (deg: number) => POINTS[Math.round((((deg % 360) + 360) % 360) / 22.5) % 16]

const round = (x: number, digits: number) => Math.round(x * 10 ** digits) / 10 ** digits

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))
