// The NDFD 2.5 km grids RTMA is published on. The land masks in
// landmask-data.ts are built for exactly these grids, so decoded fields are
// checked against them before the mask is applied.
//
// Like projection.ts, this file must not import anything at runtime.
import type { Grid } from './projection'

export type RegionName = 'conus' | 'hawaii'

export const GRIDS: Record<RegionName, Grid> = {
  conus: {
    kind: 'lambert',
    nx: 2345,
    ny: 1597,
    la1: 19.228976,
    lo1: 233.723448,
    lov: 265,
    dx: 2539.703,
    dy: 2539.703,
    latin1: 25,
    latin2: 25,
    radius: 6371200,
  },
  hawaii: {
    kind: 'mercator',
    nx: 321,
    ny: 225,
    la1: 18.072699,
    lo1: 198.474999,
    la2: 23.087799,
    lo2: 206.130999,
  },
}

/** Census state FIPS codes whose land counts for each region. */
export const REGION_STATES: Record<RegionName, (fips: number) => boolean> = {
  // 48 contiguous states + DC (FIPS 01-56 minus Alaska and Hawaii; territories are 60+)
  conus: (fips) => fips >= 1 && fips <= 56 && fips !== 2 && fips !== 15,
  hawaii: (fips) => fips === 15,
}

export function sameGrid(a: Grid, b: Grid): boolean {
  const close = (x: number, y: number) => Math.abs(x - y) < 1e-4
  if (a.kind !== b.kind || a.nx !== b.nx || a.ny !== b.ny) return false
  if (!close(a.la1, b.la1) || !close(a.lo1, b.lo1)) return false
  if (a.kind === 'lambert' && b.kind === 'lambert') {
    return close(a.lov, b.lov) && close(a.dx, b.dx) && close(a.latin1, b.latin1) && close(a.latin2, b.latin2)
  }
  if (a.kind === 'mercator' && b.kind === 'mercator') {
    return close(a.la2, b.la2) && close(a.lo2, b.lo2)
  }
  return false
}
