import type { RegionName } from './grids'
import { LANDMASK_RUNS } from './landmask-data'

/** Land runs per grid row: flattened [start, endExclusive] pairs. */
export type LandRuns = Uint32Array[]

const cache: Partial<Record<RegionName, LandRuns>> = {}

export function landRuns(region: RegionName): LandRuns {
  const cached = cache[region]
  if (cached) return cached

  const bin = atob(LANDMASK_RUNS[region])
  const view = new DataView(new ArrayBuffer(bin.length))
  for (let k = 0; k < bin.length; k++) view.setUint8(k, bin.charCodeAt(k))

  const rows: LandRuns = []
  for (let o = 0; o < view.byteLength; ) {
    const count = view.getUint16(o, true)
    o += 2
    const row = new Uint32Array(count * 2)
    for (let r = 0; r < count; r++, o += 4) {
      const start = view.getUint16(o, true)
      row[2 * r] = start
      row[2 * r + 1] = start + view.getUint16(o + 2, true)
    }
    rows.push(row)
  }
  return (cache[region] = rows)
}

export function isLand(region: RegionName, i: number, j: number): boolean {
  const row = landRuns(region)[j]
  if (!row) return false
  for (let r = 0; r < row.length; r += 2) if (i >= row[r] && i < row[r + 1]) return true
  return false
}
