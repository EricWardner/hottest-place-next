'use client'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import type { Mode } from '../lib/types'

// The mode lives in the URL hash (#coldest) so links are shareable. Using the
// hash rather than a query param keeps the page fully static for ISR.
const COLD_HASH = '#coldest'
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

  // the page background lives on <body>; globals.css switches it on this attribute
  useEffect(() => {
    document.documentElement.dataset.mode = mode
  }, [mode])

  const view = mode === 'hot' ? hot : cold
  return (
    <>
      <div className="grid gap-6">
        <div className="flex gap-2" role="group" aria-label="Show the hottest or coldest place">
          {OPTIONS.map((o) => (
            <button
              key={o.mode}
              type="button"
              aria-pressed={mode === o.mode}
              onClick={() => setMode(o.mode)}
              className={`rounded-full border border-black px-4 py-1 text-sm ${
                mode === o.mode ? 'bg-black text-white' : 'bg-white/40 hover:bg-white/70'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {/* data-view lets globals.css hide the hot view on #coldest links until hydration */}
        <div data-view={mode}>{view.info}</div>
      </div>
      <div data-view={mode}>{view.map}</div>
    </>
  )
}
