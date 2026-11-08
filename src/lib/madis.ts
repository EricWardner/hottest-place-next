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

/** Latest temperature per station in the past hour, passing all MADIS QC checks. */
export async function fetchMadisTemps(box: Box, timeoutMs: number): Promise<MadisOb[]> {
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
  const deadline = Date.now() + timeoutMs
  // MADIS occasionally answers instantly with no data table; retry that once.
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${ENDPOINT}?${params}`, {
      signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
    })
    if (!res.ok) throw new Error(`MADIS HTTP ${res.status}`)
    const text = await res.text()
    if (/var T\s+total stns/.test(text)) return parseMadisText(text)
    if (attempt >= 2 || deadline - Date.now() < 5_000) throw new Error('MADIS response had no data table')
  }
}

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
