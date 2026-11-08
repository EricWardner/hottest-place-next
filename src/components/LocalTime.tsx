'use client'
import { useSyncExternalStore } from 'react'

const subscribeNever = () => () => {}

/** A time in the viewer's time zone. The server render (and hydration) shows UTC, so there's no mismatch. */
export default function LocalTime({ iso }: { iso: string }) {
  const isClient = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
  const date = new Date(iso)
  return (
    <time dateTime={iso}>
      {isClient
        ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        : `${date.toISOString().slice(11, 16)} UTC`}
    </time>
  )
}
