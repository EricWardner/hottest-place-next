'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'

/** A cached page older than this is probably being regenerated in the background. */
const STALE_MS = 10 * 60_000
/** Roughly how long a regeneration takes before the fresh page is available. */
const REFRESH_AFTER_MS = 30_000

// Snapshot is the current 30-second bucket, so it's stable between ticks.
const TICK_MS = 30_000
const subscribeTicks = (onChange: () => void) => {
  const id = setInterval(onChange, TICK_MS)
  return () => clearInterval(id)
}
const currentTick = () => Math.floor(Date.now() / TICK_MS)

/**
 * Shows how old the analysis is. If the page came out of the ISR cache stale
 * (e.g. the first visit after a quiet stretch), picks up the fresh copy once
 * the background regeneration has had time to finish.
 */
export default function Freshness({ validTime, generatedAt }: { validTime: string; generatedAt: string }) {
  const router = useRouter()
  const tick = useSyncExternalStore(subscribeTicks, currentTick, () => null)

  useEffect(() => {
    if (Date.now() - Date.parse(generatedAt) < STALE_MS) return
    const id = setTimeout(() => router.refresh(), REFRESH_AFTER_MS)
    return () => clearTimeout(id)
  }, [generatedAt, router])

  if (tick === null) return null
  const minutes = Math.max(0, Math.round((tick * TICK_MS - Date.parse(validTime)) / 60_000))
  const age = minutes < 90 ? `${minutes} min ago` : `${Math.round(minutes / 60)} hr ago`
  return <> ({age})</>
}
