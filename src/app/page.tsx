import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import ExtremeInfo from '../components/ExtremeInfo'
import { StaleRefresher } from '../components/Freshness'
import HotspotMap from '../components/HotspotMapClient'
import ModeToggle from '../components/ModeToggle'
import { findExtremes } from '../lib/extremes'
import type { Extremes, Mode } from '../lib/types'

// ISR: visitors always get the cached page instantly; when it's older than this,
// the next request triggers a background regeneration. RTMA updates every 15 minutes.
// If a regeneration fails, the last good page keeps being served.
export const revalidate = 300
// A regeneration is budgeted to finish in ~50 s (see the time budgets in
// src/lib/extremes.ts). 60 s is Hobby's limit for projects without Fluid compute;
// a higher value fails the deploy there.
export const maxDuration = 60

export default async function Home() {
  // At runtime, losing the lower-48 data throws, so ISR keeps serving the last good
  // page (stale but right beats fresh but wrong). Smaller gaps still render: a
  // Hawaii outage drops Hawaii with a note, an NWS failure shows coordinates, and
  // a spot no thermometer backs is labeled as an estimate (see findExtremes).
  // At build time there is no last good page and a NOAA hiccup shouldn't fail the
  // deploy, so accept a degraded answer, or a placeholder if there's no data at
  // all; the first regeneration replaces it.
  const atBuild = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
  let data: Extremes
  try {
    data = await findExtremes(new Date(), { strict: !atBuild })
  } catch (e) {
    if (!atBuild) throw e
    console.error('Hottest place unavailable at build time:', e)
    return (
      <p className="text-fluid-1">
        NOAA&apos;s data wasn&apos;t reachable when this page was built. Check back in a few minutes.
      </p>
    )
  }

  // Both views are rendered here so the toggle switches instantly from the cached page.
  const view = (mode: Mode) => ({
    info: <ExtremeInfo mode={mode} extreme={data[mode]} unavailable={data.unavailable} />,
    // Leaflet ignores center/bounds changes after mount, so remount whenever the
    // view should move: on toggle, and when a refresh brings a different spot.
    map: (
      <HotspotMap
        key={[mode, data[mode].spot.lat, data[mode].spot.lon, data[mode].station?.id].join(':')}
        mode={mode}
        spot={data[mode].spot}
        station={data[mode].station}
      />
    ),
  })

  return (
    <>
      <StaleRefresher generatedAt={data.generatedAt} />
      <ModeToggle hot={view('hot')} cold={view('cold')} />
      <p className="text-xs max-w-prose">
        Data: NOAA/NCEP Real-Time Mesoscale Analysis (RTMA), NOAA MADIS and its mesonet data providers, and
        the National Weather Service. NOAA and its data providers disclaim liability of any kind whatsoever,
        including, without limitation, liability for quality, performance, merchantability and fitness for a
        particular purpose arising out of the use or inability to use the data.
      </p>
    </>
  )
}
