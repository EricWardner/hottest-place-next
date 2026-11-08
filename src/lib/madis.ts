// QC-filtered surface temperatures from NOAA MADIS (public tier, no login).
// https://madis-data.ncep.noaa.gov/public/sfcdumpguest.html
const ENDPOINT = 'https://madis-data.ncep.noaa.gov/madisPublic1/cgi-bin/madisXmlPublicDir'

export type MadisOb = {
  id: string
  provider: string
  lat: number
  lon: number
  tempK: number
  obsTime: Date
}

export type Box = { south: number; west: number; north: number; east: number }

/**
 * Latest temperature per station in the past hour, passing all MADIS QC checks.
 * Treats fewer than `minObs` rows as a failure: MADIS sometimes briefly serves an
 * empty or partial table that otherwise looks valid. Any failure is retried once,
 * and each attempt gets its own `attemptTimeoutMs`.
 */
export async function fetchMadisTemps(box: Box, attemptTimeoutMs: number, minObs = 1): Promise<MadisOb[]> {
  const params = new URLSearchParams({
    rdr: '',
    time: '0', // now
    minbck: '-59',
    minfwd: '0',
    recwin: '3', // one record per station, closest to end of window
    timefilter: '0',
    dfltrsel: '1', // lat/lon box
    latll: box.south.toFixed(3),
    lonll: box.west.toFixed(3),
    latur: box.north.toFixed(3),
    lonur: box.east.toFixed(3),
    stanam: '',
    stasel: '0',
    pvdrsel: '0', // all providers
    varsel: '1',
    nvars: 'T',
    qctype: '0',
    qcsel: '99', // only obs passing all QC checks
    xml: '0', // text (includes lat/lon)
    csvmiss: '0',
  })
  const attempt = async () => {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: AbortSignal.timeout(attemptTimeoutMs) })
    if (!res.ok) throw new Error(`MADIS HTTP ${res.status}`)
    const text = await res.text()
    if (!/var T\s+total stns/.test(text)) throw new Error('MADIS response had no data table')
    const obs = parseMadisText(text)
    if (obs.length < minObs) throw new Error(`MADIS returned only ${obs.length} observations (expected at least ${minObs})`)
    return obs
  }

  try {
    return await attempt()
  } catch (first) {
    // Bad replies and timeouts are usually transient. MADIS caches replies by URL
    // for 60 s, bad ones included, so the retry adds a throwaway parameter
    // (verified harmless) to force a fresh query.
    await new Promise((r) => setTimeout(r, 2_000))
    params.set('_retry', String(Date.now()))
    try {
      return await attempt()
    } catch (second) {
      throw new Error(`${errorMessage(second)} (first attempt: ${errorMessage(first)})`)
    }
  }
}

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

// e.g. "  V-T       KSNS         26.00  36.67000 -121.6000    0.000    0.000 20261108_1521 ASOS          280.950012 V 107   0"
const LINE = /^\s*V-T\s+(\S+)\s+\S+\s+(-?[\d.]+)\s+(-?[\d.]+)\s+\S+\s+\S+\s+(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})\s+(\S+)\s+(-?[\d.]+)\s+(\S)\s/

export function parseMadisText(text: string): MadisOb[] {
  const obs: MadisOb[] = []
  for (const line of text.split('\n')) {
    const m = LINE.exec(line)
    if (!m) continue
    const [, id, lat, lon, y, mo, d, h, mi, provider, value] = m
    const tempK = Number(value)
    if (!(tempK > 200 && tempK < 340)) continue // missing-value sentinels etc.
    obs.push({
      id,
      provider,
      lat: Number(lat),
      lon: Number(lon),
      tempK,
      obsTime: new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi)),
    })
  }
  return obs
}
