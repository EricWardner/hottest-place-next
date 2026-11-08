// Shared between the server page and client components. Keep server-only imports out of this file.
import type { RegionName } from './rtma/grids'

export type Mode = 'hot' | 'cold'

/** +1 when looking for heat, -1 for cold, so "more extreme" is always "larger sign * value". */
export const SIGN: Record<Mode, number> = { hot: 1, cold: -1 }

/** True if temperature `a` is more extreme than `b`: hotter in hot mode, colder in cold mode. */
export const moreExtreme = (mode: Mode, a: number, b: number) => SIGN[mode] * a > SIGN[mode] * b

/** URL hash for cold mode. Shared by ModeToggle and the pre-paint script in layout.tsx. */
export const COLD_HASH = '#coldest'

type Point = { lat: number; lon: number; tempF: number }

/** The hottest or coldest place, with the evidence behind it. */
export type Extreme = {
  /** US land cell in the latest RTMA analysis, backed by a nearby thermometer when possible. */
  spot: Point & {
    /** analysis valid time, ISO 8601 */
    validTime: string
    source: string
  }
  /** Nearest named place, from the NWS points API. */
  place: {
    city: string
    state: string
    distanceMi: number
    /** compass direction from the city to the spot, e.g. "WNW" */
    direction: string
  } | null
  /** The MADIS thermometer backing the spot; null if none could. */
  station:
    | (Point & {
        id: string
        provider: string
        /** observation time, ISO 8601 */
        obsTime: string
        distanceMi: number
        /** RTMA value at the station's own grid cell */
        analysisTempF: number
      })
    | null
  /** RTMA's most extreme US land cell with no thermometer check (may be a data void or coastal artifact). */
  analysisExtreme: Point
}

export type Extremes = {
  hot: Extreme
  cold: Extreme
  /** MADIS stations that agreed with the analysis and could back a spot. */
  stationsUsed: number
  /** Regions left out of this result because one of their data sources failed. */
  unavailable: RegionName[]
  warnings: string[]
  /** when this result was computed, ISO 8601 */
  generatedAt: string
}
