// Shared between the server page and client components. Keep server-only imports out of this file.

type Point = { lat: number; lon: number; tempF: number }

export type HottestPlace = {
  /** Hottest US land cell in the latest RTMA analysis that a nearby thermometer backs up. */
  hotspot: Point & {
    /** analysis valid time, ISO 8601 */
    validTime: string
    source: string
  }
  /** Nearest named place, from the NWS points API. */
  place: {
    city: string
    state: string
    distanceMi: number
    /** compass direction from the city to the hot spot, e.g. "WNW" */
    direction: string
  } | null
  /** The MADIS thermometer backing the hot spot; null if MADIS was unavailable. */
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
  /** RTMA's hottest US land cell with no thermometer check (may be a data void or coastal artifact). */
  analysisMax: Point
  /** MADIS stations that agreed with the analysis and could back a hot spot. */
  stationsUsed: number
  warnings: string[]
  /** when this result was computed, ISO 8601 */
  generatedAt: string
}
