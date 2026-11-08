'use client'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { COLD_HASH, type Mode } from '../lib/types'

// The mode lives in the URL hash (#coldest) so links are shareable. Using the
// hash rather than a query param keeps the page fully static for ISR.
//
// What's visible is decided by CSS on <html data-mode> (see globals.css), not by
// React state: the inline script in layout.tsx sets that attribute before first
// paint, so a #coldest link shows the right view and button immediately, even
// before (or without) hydration. React state only picks which map to mount.
const listeners = new Set<() => void>()

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('hashchange', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('hashchange', onChange)
  }
}
const getMode = (): Mode => (window.location.hash === COLD_HASH ? 'cold' : 'hot')

function setMode(mode: Mode) {
  // set the attribute before React re-renders so the text and map switch together
  document.documentElement.dataset.mode = mode
  const url = mode === 'cold' ? COLD_HASH : window.location.pathname + window.location.search
  window.history.replaceState(null, '', url)
  listeners.forEach((l) => l())
}

const OPTIONS: { mode: Mode; label: string }[] = [
  { mode: 'hot', label: 'Hottest' },
  { mode: 'cold', label: 'Coldest' },
]

type View = { info: ReactNode; map: ReactNode }

/** Switches between the pre-rendered hottest and coldest views; no extra fetch. */
export default function ModeToggle({ hot, cold }: { hot: View; cold: View }) {
  const mode = useSyncExternalStore(subscribe, getMode, () => 'hot' as Mode)

  // keeps the attribute in sync for hash changes made outside setMode (e.g. back/forward)
  useEffect(() => {
    document.documentElement.dataset.mode = mode
  }, [mode])

  return (
    <>
      <div className="grid gap-6">
        <div className="flex gap-2" role="group" aria-label="Show the hottest or coldest place">
          {OPTIONS.map((o) => (
            <button
              key={o.mode}
              type="button"
              data-mode-button={o.mode}
              aria-pressed={mode === o.mode}
              onClick={() => setMode(o.mode)}
              className="rounded-full border border-black px-4 py-1 text-sm"
            >
              {o.label}
            </button>
          ))}
        </div>
        {/* both rendered on the server; globals.css shows the one matching data-mode */}
        <div data-view="hot">{hot.info}</div>
        <div data-view="cold">{cold.info}</div>
      </div>
      {/* maps are client-only, so mount just the active one */}
      {mode === 'hot' ? hot.map : cold.map}
    </>
  )
}
