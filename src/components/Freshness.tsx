'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'

/** A cached page older than this is probably being regenerated in the background. */
const STALE_MS = 10 * 60_000
/**
 * When to check for the regenerated page. A typical regeneration takes ~20 s
 * and at most ~60 s; stops once fresh data arrives.
 */
const REFRESH_AT_MS = [30_000, 75_000, 150_000]
/** How often an open, visible tab asks for a newer page (matches revalidate in page.tsx). */
const POLL_MS = 5 * 60_000

// Snapshot is the current 30-second bucket, so it's stable between ticks.
const TICK_MS = 30_000
const subscribeTicks = (onChange: () => void) => {
  const id = setInterval(onChange, TICK_MS)
  return () => clearInterval(id)
}
const currentTick = () => Math.floor(Date.now() / TICK_MS)

/** " (12 min ago)" for an ISO time; renders nothing on the server. */
export function Age({ iso }: { iso: string }) {
  const tick = useSyncExternalStore(subscribeTicks, currentTick, () => null)
  if (tick === null) return null
  const minutes = Math.max(0, Math.round((tick * TICK_MS - Date.parse(iso)) / 60_000))
  return <> ({minutes < 90 ? `${minutes} min ago` : `${Math.round(minutes / 60)} hr ago`})</>
}

/**
 * Keeps the page current without reloads. Renders nothing.
 * - If the page came out of the ISR cache stale (e.g. the first visit after a
 *   quiet stretch), that visit started a background regeneration; check back
 *   until it lands.
 * - In an open tab, ask for a newer page every POLL_MS while visible (and on
 *   returning to the tab), then check back the same way.
 * router.refresh() is served from the ISR cache, so polling is cheap; it only
 * triggers a regeneration when the cached page is older than `revalidate`.
 * New data changes generatedAt, which resets everything here.
 */
export function AutoRefresh({ generatedAt }: { generatedAt: string }) {
  const router = useRouter()
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    const checkBack = () => {
      for (const ms of REFRESH_AT_MS) timers.push(setTimeout(() => router.refresh(), ms))
    }
    if (Date.now() - Date.parse(generatedAt) > STALE_MS) checkBack()

    let lastPoll = Date.now()
    const poll = () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastPoll < POLL_MS) return
      lastPoll = Date.now()
      router.refresh()
      checkBack()
    }
    const id = setInterval(poll, 30_000)
    document.addEventListener('visibilitychange', poll)
    return () => {
      timers.forEach(clearTimeout)
      clearInterval(id)
      document.removeEventListener('visibilitychange', poll)
    }
  }, [generatedAt, router])
  return null
}
