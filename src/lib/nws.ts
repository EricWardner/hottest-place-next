// Nearest named place for a point, from the NWS API (https://www.weather.gov/documentation/services-web-api).
// NWS asks clients to identify themselves in the User-Agent.
const USER_AGENT = 'hottest-place (https://github.com/EricWardner/hottest-place-next)'

export type NwsPlace = { city: string; state: string; distanceM: number; bearingDeg: number }

export async function nearestPlace(lat: number, lon: number, timeoutMs: number): Promise<NwsPlace> {
  const res = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/geo+json' },
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`NWS points HTTP ${res.status}`)
  const rel = (await res.json())?.properties?.relativeLocation?.properties
  if (!rel?.city || !rel?.state) throw new Error('NWS points response has no relativeLocation')
  return {
    city: rel.city,
    state: rel.state,
    distanceM: Number(rel.distance?.value ?? 0),
    bearingDeg: Number(rel.bearing?.value ?? 0),
  }
}
