// Grid <-> lat/lon math for the two NDFD grids RTMA is published on.
//
// This file must not import anything at runtime: scripts/build-landmask.mts
// imports it directly with Node's built-in TypeScript support.

/** GRIB2 grid template 3.30 (Lambert conformal), e.g. the CONUS 2.5 km grid. */
export type LambertGrid = {
  kind: 'lambert'
  nx: number
  ny: number
  /** lat/lon of grid point (0, 0), degrees */
  la1: number
  lo1: number
  /** orientation longitude (LoV), degrees */
  lov: number
  latin1: number
  latin2: number
  /** grid spacing, meters */
  dx: number
  dy: number
  /** earth radius, meters (NCEP treats the earth as a sphere) */
  radius: number
}

/** GRIB2 grid template 3.10 (Mercator), e.g. the Hawaii 2.5 km grid. */
export type MercatorGrid = {
  kind: 'mercator'
  nx: number
  ny: number
  la1: number
  lo1: number
  /** lat/lon of the last grid point (nx - 1, ny - 1) */
  la2: number
  lo2: number
}

export type Grid = LambertGrid | MercatorGrid

const RAD = Math.PI / 180

/** Wrap a longitude into [-180, 180). */
export function normalizeLon(lon: number): number {
  return ((((lon + 180) % 360) + 360) % 360) - 180
}

function lambertConstants(g: LambertGrid) {
  const phi1 = g.latin1 * RAD
  const phi2 = g.latin2 * RAD
  const t = (phi: number) => Math.tan(Math.PI / 4 + phi / 2)
  const n =
    Math.abs(phi1 - phi2) < 1e-10
      ? Math.sin(phi1)
      : Math.log(Math.cos(phi1) / Math.cos(phi2)) / Math.log(t(phi2) / t(phi1))
  const rf = (g.radius * Math.cos(phi1) * Math.pow(t(phi1), n)) / n
  const project = (lat: number, lon: number): [number, number] => {
    const rho = rf / Math.pow(t(lat * RAD), n)
    const theta = n * normalizeLon(lon - g.lov) * RAD
    return [rho * Math.sin(theta), -rho * Math.cos(theta)]
  }
  const [x0, y0] = project(g.la1, g.lo1)
  return { n, rf, project, x0, y0 }
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * RAD) / 2))

/**
 * Returns converters between (fractional) grid indices and lat/lon.
 * Both grids are assumed to scan +i eastward and +j northward (scan mode 64).
 */
export function makeProjection(g: Grid) {
  if (g.kind === 'lambert') {
    const { n, rf, project, x0, y0 } = lambertConstants(g)
    return {
      toLatLon(i: number, j: number): [number, number] {
        const x = x0 + i * g.dx
        const y = y0 + j * g.dy
        const rho = Math.sign(n) * Math.hypot(x, y)
        const theta = Math.atan2(Math.sign(n) * x, -Math.sign(n) * y)
        const lat = (2 * Math.atan(Math.pow(rf / rho, 1 / n)) - Math.PI / 2) / RAD
        return [lat, normalizeLon(g.lov + theta / n / RAD)]
      },
      toGrid(lat: number, lon: number): [number, number] {
        const [x, y] = project(lat, lon)
        return [(x - x0) / g.dx, (y - y0) / g.dy]
      },
    }
  }

  const lo1 = normalizeLon(g.lo1)
  let span = normalizeLon(g.lo2) - lo1
  if (span <= 0) span += 360
  const dLon = span / (g.nx - 1)
  const y1 = mercY(g.la1)
  const dY = (mercY(g.la2) - y1) / (g.ny - 1)
  return {
    toLatLon(i: number, j: number): [number, number] {
      const lat = (2 * Math.atan(Math.exp(y1 + j * dY)) - Math.PI / 2) / RAD
      return [lat, normalizeLon(lo1 + i * dLon)]
    },
    toGrid(lat: number, lon: number): [number, number] {
      let dl = normalizeLon(lon) - lo1
      if (dl < -180) dl += 360
      return [dl / dLon, (mercY(lat) - y1) / dY]
    },
  }
}
