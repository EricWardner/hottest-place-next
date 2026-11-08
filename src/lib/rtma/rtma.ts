// Fetches the newest RTMA 2 m temperature analysis from NOAA's AWS mirror
// and finds its hottest US land cell.
import { decodeGrib2, type GribField } from './grib2'
import { GRIDS, sameGrid, type RegionName } from './grids'
import { landRuns, isLand } from './landmask'
import { makeProjection } from './projection'

const BUCKET = 'https://noaa-rtma-pds.s3.amazonaws.com'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (t: Date) => `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`

const PRODUCTS: Record<RegionName, { label: string; stepMinutes: number; lookbackMinutes: number; key: (t: Date) => string }> = {
  // Rapid Update: every 15 minutes, posted ~15 minutes after valid time
  conus: {
    label: 'NOAA RTMA Rapid Update',
    stepMinutes: 15,
    lookbackMinutes: 120,
    key: (t) => `rtma2p5_ru.${ymd(t)}/rtma2p5_ru.t${pad(t.getUTCHours())}${pad(t.getUTCMinutes())}z.2dvaranl_ndfd.grb2`,
  },
  // Hawaii only has the hourly analysis, posted ~35 minutes after the hour
  hawaii: {
    label: 'NOAA RTMA Hawaii',
    stepMinutes: 60,
    lookbackMinutes: 180,
    key: (t) => `hirtma.${ymd(t)}/hirtma.t${pad(t.getUTCHours())}z.2dvaranl_ndfd.grb2`,
  },
}

export type RtmaAnalysis = {
  region: RegionName
  source: string
  field: GribField
  /** hottest US land cell, with no other checks */
  hottest: { lat: number; lon: number; tempK: number }
  toLatLon(i: number, j: number): [number, number]
  /** grid cell nearest to (lat, lon), or null outside the grid */
  cellAt(lat: number, lon: number): [number, number] | null
  /** analysis value at cell (i, j) */
  valueAt(i: number, j: number): number
  /** true if cell (i, j) is US land (see scripts/build-landmask.mts) */
  isLand(i: number, j: number): boolean
}

export async function fetchLatestAnalysis(region: RegionName, now = new Date()): Promise<RtmaAnalysis> {
  const product = PRODUCTS[region]
  const step = product.stepMinutes * 60_000
  const newest = Math.floor(now.getTime() / step) * step
  const candidates = Array.from({ length: product.lookbackMinutes / product.stepMinutes + 1 }, (_, k) =>
    product.key(new Date(newest - k * step)),
  )

  // Probe the index files in parallel; take the newest one that exists.
  const indexes = await Promise.all(
    candidates.map(async (key) => {
      try {
        const res = await fetch(`${BUCKET}/${key}.idx`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
        return res.ok ? { key, idx: await res.text() } : null
      } catch {
        return null
      }
    }),
  )
  const found = indexes.find((x) => x !== null)
  if (!found) throw new Error(`No ${region} RTMA analysis found in the last ${product.lookbackMinutes} minutes`)

  // Download just the 2 m temperature message using the byte offsets in the .idx
  const lines = found.idx.trim().split('\n')
  const at = lines.findIndex((l) => l.includes(':TMP:2 m above ground:anl'))
  if (at < 0) throw new Error(`No 2 m temperature in ${found.key}`)
  const start = Number(lines[at].split(':')[1])
  const next = lines[at + 1] ? Number(lines[at + 1].split(':')[1]) : NaN
  const range = Number.isFinite(next) ? `bytes=${start}-${next - 1}` : `bytes=${start}-`

  const res = await fetch(`${BUCKET}/${found.key}`, {
    cache: 'no-store',
    headers: { Range: range },
    signal: AbortSignal.timeout(30_000),
  })
  if (res.status !== 206) throw new Error(`RTMA range request failed: HTTP ${res.status} for ${found.key}`)
  const field = decodeGrib2(new Uint8Array(await res.arrayBuffer()))
  if (!sameGrid(field.grid, GRIDS[region])) {
    throw new Error(`${region} RTMA grid changed; rebuild the land mask (scripts/build-landmask.mts)`)
  }

  const { nx, ny } = field.grid
  const proj = makeProjection(field.grid)

  // Scan only US land cells
  let best = -1
  const rows = landRuns(region)
  for (let j = 0; j < rows.length; j++) {
    const row = rows[j]
    for (let r = 0; r < row.length; r += 2) {
      for (let k = j * nx + row[r], end = j * nx + row[r + 1]; k < end; k++) {
        if (best < 0 || field.values[k] > field.values[best]) best = k
      }
    }
  }
  if (best < 0) throw new Error(`Empty ${region} land mask`)
  const [lat, lon] = proj.toLatLon(best % nx, Math.floor(best / nx))

  return {
    region,
    source: product.label,
    field,
    hottest: { lat, lon, tempK: field.values[best] },
    toLatLon: proj.toLatLon,
    cellAt(la, lo) {
      const [fi, fj] = proj.toGrid(la, lo)
      const i = Math.round(fi)
      const j = Math.round(fj)
      return i >= 0 && i < nx && j >= 0 && j < ny ? [i, j] : null
    },
    valueAt: (i, j) => field.values[j * nx + i],
    isLand: (i, j) => i >= 0 && i < nx && isLand(region, i, j),
  }
}
