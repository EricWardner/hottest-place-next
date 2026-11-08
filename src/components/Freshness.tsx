'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'

/** A cached page older than this is probably being regenerated in the background. */
const STALE_MS = 10 * 60_000
/**
 * When to check for the regenerated page. A typical regeneration takes ~20 s
 * but can run up to ~90 s when MADIS is slow and retries; stops once fresh data arrives.
 */
const REFRESH_AT_MS = [30_000, 75_000, 150_000]

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
 * If the page came out of the ISR cache stale (e.g. the first visit after a
 * quiet stretch), picks up the fresh copy once the background regeneration
 * has had time to finish. Renders nothing.
 */
export function StaleRefresher({ generatedAt }: { generatedAt: string }) {
  const router = useRouter()
  useEffect(() => {
    if (Date.now() - Date.parse(generatedAt) < STALE_MS) return
    // A refresh that brings new data changes generatedAt, which clears the remaining checks.
    const ids = REFRESH_AT_MS.map((ms) => setTimeout(() => router.refresh(), ms))
    return () => ids.forEach(clearTimeout)
  }, [generatedAt, router])
  return null
}
