import { z } from 'zod'

const point = { lat: z.number(), lon: z.number(), tempF: z.number() }

// Shared between the API route and the client. Keep server-only imports out of this file.
export const hottestPlaceSchema = z.object({
  /** Hottest US land cell in the latest RTMA analysis that a nearby thermometer backs up. */
  hotspot: z.object({
    ...point,
    /** analysis valid time, ISO 8601 */
    validTime: z.string(),
    source: z.string(),
  }),
  /** Nearest named place, from the NWS points API. */
  place: z
    .object({
      city: z.string(),
      state: z.string(),
      distanceMi: z.number(),
      /** compass direction from the city to the hot spot, e.g. "WNW" */
      direction: z.string(),
    })
    .nullable(),
  /** The MADIS thermometer backing the hot spot; null if MADIS was unavailable. */
  station: z
    .object({
      ...point,
      id: z.string(),
      provider: z.string(),
      /** observation time, ISO 8601 */
      obsTime: z.string(),
      distanceMi: z.number(),
      /** RTMA value at the station's own grid cell */
      analysisTempF: z.number(),
    })
    .nullable(),
  /** RTMA's hottest US land cell with no thermometer check (may be a data void or coastal artifact). */
  analysisMax: z.object(point),
  /** MADIS stations that agreed with the analysis and could back a hot spot. */
  stationsUsed: z.number(),
  warnings: z.array(z.string()),
  generatedAt: z.string(),
})

export type HottestPlace = z.infer<typeof hottestPlaceSchema>
