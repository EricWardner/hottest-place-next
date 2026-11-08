'use client'
import dynamic from 'next/dynamic'

// Leaflet touches `window` on import, so the map only loads in the browser.
const HotspotMap = dynamic(() => import('./HotspotMap'), { ssr: false })

export default HotspotMap
