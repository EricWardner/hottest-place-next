// Finds the hottest and coldest places from three sources:
//  1. RTMA (CONUS + Hawaii) gives a 2.5 km temperature grid.
//  2. MADIS gives real thermometers. A station is trusted only if it agrees
//     with RTMA at its own grid cell, which drops sensors RTMA's QC rejected.
//  3. The hot spot is the hottest US land cell within SUPPORT_RADIUS_KM of a
//     trusted station that reads at least about as hot as the cell (and the
//     mirror image for the cold spot). Raw RTMA extremes can sit in data
//     voids or on coasts where the analysis reads close to sea temperature;
//     this keeps the answer tied to a measurement.
//  4. The NWS points API names the nearest place.
//
// Alaska is deliberately left out: it would be the coldest place nearly every day.
import { errorMessage } from './errors'
import { fetchMadisTemps, type Box, type MadisBudget, type MadisOb } from './madis'
import { nearestPlace } from './nws'
import type { RegionName } from './rtma/grids'
import { fetchLatestAnalysis, type RtmaAnalysis } from './rtma/rtma'
import { moreExtreme, SIGN, type Extreme, type Extremes, type Mode } from './types'

/** Max disagreement between a station and the analysis at its own grid cell. */
const AGREEMENT_K = 1.5
/** How far from a trusted station a spot may be. */
const SUPPORT_RADIUS_KM = 15
/** How much more extreme than its backing station a spot cell may be. */
const SUPPORT_K = 1.0

const MADIS_BOXES: Record<RegionName, Box> = {
  conus: { south: 24, west: -125, north: 50, east: -66.5 },
  hawaii: { south: 18.5, west: -160.5, north: 22.5, east: -154.5 },
}
/** Fewer observations than this means MADIS served a bad table (a normal CONUS reply has ~20k). */
const MADIS_MIN_OBS: Record<RegionName, number> = { conus: 1000, hawaii: 10 }
/**
 * Time budgets. A refresh must finish within 60 s: that's both Hobby's function
 * limit without Fluid compute and Next's per-page build timeout. RTMA (~33 s
 * worst case) runs alongside MADIS (42 s), then the NWS lookups (6 s) run in
 * parallel, so the worst case is ~50 s. See maxDuration in src/app/page.tsx.
 */
const MADIS_BUDGET: Record<RegionName, MadisBudget> = {
  conus: { totalMs: 42_000, minRetryMs: 10_000 },
  // optional, so capped lower: a struggling Hawaii shouldn't hold up every refresh
  hawaii: { totalMs: 25_000, minRetryMs: 8_000 },
}
const NWS_TIMEOUT_MS = 6_000

const REGIONS: RegionName[] = ['conus', 'hawaii']
/**
 * In strict mode, losing one of these fails the whole refresh. Hawaii only
 * drops out (with a note on the page), so a long Hawaii outage can't freeze
 * the lower-48 answers.
 */
const REQUIRED_REGIONS: RegionName[] = ['conus']

type Candidate = {
  analysis: RtmaAnalysis
  lat: number
  lon: number
  tempK: number
  station: MadisOb & { km: number; analysisK: number }
}

const toF = (k: number) => Math.round(((k - 273.15) * 9) / 5 * 10 + 320) / 10
const kmToMi = (km: number) => Math.round(km * 0.621371 * 10) / 10

/**
 * Normally a region needs both RTMA and MADIS; one missing either is left out
 * (noted on the page). With `strict` (runtime), losing a required region
 * throws instead: ISR then keeps serving the last good page and retries, since
 * a Hawaii-only "hottest place in the US" would be fresh but wrong. NWS
 * failures only cost the place name.
 */
export async function findExtremes(now = new Date(), { strict = true } = {}): Promise<Extremes> {
  const warnings: string[] = []

  // RTMA and MADIS are independent; fetch everything at once.
  const [analyses, madis] = await Promise.all([
    Promise.allSettled(REGIONS.map((r) => fetchLatestAnalysis(r, now))),
    Promise.allSettled(REGIONS.map((r) => fetchMadisTemps(MADIS_BOXES[r], MADIS_BUDGET[r], MADIS_MIN_OBS[r]))),
  ])
  const rtma: Partial<Record<RegionName, RtmaAnalysis>> = {}
  const stations: Partial<Record<RegionName, MadisOb[]>> = {}
  REGIONS.forEach((region, k) => {
    const a = analyses[k]
    const m = madis[k]
    if (a.status === 'fulfilled') rtma[region] = a.value
    else warnings.push(`RTMA ${region}: ${errorMessage(a.reason)}`)
    if (m.status === 'fulfilled') stations[region] = m.value
    else warnings.push(`MADIS ${region}: ${errorMessage(m.reason)}`)
  })

  const requiredMissing = REQUIRED_REGIONS.filter((r) => !rtma[r] || !stations[r])
  if (strict && requiredMissing.length) {
    throw new Error(`Data unavailable for ${requiredMissing.join(', ')}: ${warnings.join('; ')}`)
  }
  // Build-time fallback: if a required region has RTMA but no stations, dropping
  // it would make e.g. Hawaii "the coldest place in the US". Show unconfirmed RTMA
  // extremes for every region instead.
  const unconfirmed = requiredMissing.some((r) => rtma[r] && !stations[r])

  const available: RtmaAnalysis[] = []
  const unavailable: RegionName[] = []
  const best: Record<Mode, Candidate | null> = { hot: null, cold: null }
  let stationsUsed = 0
  for (const region of REGIONS) {
    const analysis = rtma[region]
    const obs = stations[region]
    if (!analysis || (!obs && !unconfirmed)) {
      unavailable.push(region)
      continue
    }
    available.push(analysis)
    if (unconfirmed || !obs) continue
    const result = supportedExtremes(analysis, obs)
    stationsUsed += result.stationsUsed
    for (const mode of ['hot', 'cold'] as const) {
      const c = result[mode]
      const b = best[mode]
      if (c && (!b || moreExtreme(mode, c.tempK, b.tempK))) best[mode] = c
    }
  }
  if (available.length === 0) throw new Error(`No data available: ${warnings.join('; ')}`)

  const [hot, cold] = await Promise.all(
    (['hot', 'cold'] as const).map((mode) => describe(mode, best[mode], available, warnings)),
  )
  // Surfaces in Vercel's runtime logs
  if (warnings.length) console.warn('findExtremes:', warnings.join('; '))
  return { hot, cold, stationsUsed, unavailable, warnings, generatedAt: now.toISOString() }
}

/** Turns a candidate (or, without one, the raw RTMA extreme) into the shape the page renders. */
async function describe(
  mode: Mode,
  winner: Candidate | null,
  available: RtmaAnalysis[],
  warnings: string[],
): Promise<Extreme> {
  const rawAnalysis = available.reduce((a, b) => (moreExtreme(mode, b.raw[mode].tempK, a.raw[mode].tempK) ? b : a))
  const raw = rawAnalysis.raw[mode]
  if (!winner) warnings.push(`No thermometer could back up a ${mode} spot; showing the raw RTMA extreme`)
  const analysis = winner?.analysis ?? rawAnalysis
  const spot = winner ?? raw

  let place: Extreme['place'] = null
  try {
    const p = await nearestPlace(spot.lat, spot.lon, NWS_TIMEOUT_MS)
    place = { city: p.city, state: p.state, distanceMi: kmToMi(p.distanceM / 1000), direction: compass(p.bearingDeg) }
  } catch (e) {
    warnings.push(`NWS (${mode}): ${errorMessage(e)}`)
  }

  return {
    spot: {
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
    analysisExtreme: { lat: round(raw.lat, 4), lon: round(raw.lon, 4), tempF: toF(raw.tempK) },
  }
}

/**
 * For every trusted station, find the most extreme land cell (hottest and
 * coldest) within the support radius that the station backs up; return the
 * most extreme of those for each mode.
 */
export function supportedExtremes(
  analysis: RtmaAnalysis,
  obs: MadisOb[],
): Record<Mode, Candidate | null> & { stationsUsed: number } {
  const best: Record<Mode, Candidate | null> = { hot: null, cold: null }
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
        for (const mode of ['hot', 'cold'] as const) {
          // the cell may be at most SUPPORT_K more extreme than the station
          if (moreExtreme(mode, t, ob.tempK + SIGN[mode] * SUPPORT_K)) continue
          const b = best[mode]
          // ties go to the more extreme station
          if (b && (moreExtreme(mode, b.tempK, t) || (t === b.tempK && !moreExtreme(mode, ob.tempK, b.station.tempK)))) continue
          const [lat, lon] = analysis.toLatLon(i, j)
          best[mode] = { analysis, lat, lon, tempK: t, station: { ...ob, km: distanceKm(lat, lon, ob.lat, ob.lon), analysisK } }
        }
      }
    }
    // only stations near US land count
    if (stationCounted) stationsUsed++
  }
  return { ...best, stationsUsed }
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
