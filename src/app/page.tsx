import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import HotspotMap from '../components/HotspotMapClient'
import HottestPlaceInfo from '../components/HottestPlaceInfo'
import { findHottestPlace } from '../lib/hottest'
import type { HottestPlace } from '../lib/types'

// ISR: visitors always get the cached page instantly; when it's older than this,
// the next request triggers a background regeneration. RTMA updates every 15 minutes.
// If a regeneration fails, the last good page keeps being served.
export const revalidate = 300
// A regeneration downloads ~8 MB from NOAA and can wait on MADIS for up to ~40 s.
export const maxDuration = 60

export default async function Home() {
  let data: HottestPlace
  try {
    data = await findHottestPlace()
  } catch (e) {
    // At runtime, rethrow so ISR keeps serving the last good page. At build time
    // there is no last good page, and a NOAA outage shouldn't fail the deploy, so
    // render a placeholder that the first regeneration replaces.
    if (process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) throw e
    console.error('Hottest place unavailable at build time:', e)
    return (
      <p className="text-fluid-1">
        NOAA&apos;s data wasn&apos;t reachable when this page was built. Check back in a few minutes.
      </p>
    )
  }

  return (
    <>
      <HottestPlaceInfo data={data} />
      <HotspotMap hotspot={data.hotspot} station={data.station} />
      <p className="text-xs max-w-prose">
        Data: NOAA/NCEP Real-Time Mesoscale Analysis (RTMA), NOAA MADIS and its mesonet data providers, and
        the National Weather Service. NOAA and its data providers disclaim liability of any kind whatsoever,
        including, without limitation, liability for quality, performance, merchantability and fitness for a
        particular purpose arising out of the use or inability to use the data.
      </p>
    </>
  )
}
